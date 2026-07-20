/**
 * CommentsSection — reusable Comments section for a story, task, or
 * milestone container. Mounted in the Story slide-over right panel, the Task
 * Detail modal, and the Milestone Detail page.
 *
 * Renders the container's comment thread newest-first — the order the API
 * returns, not re-sorted client-side (author role, Markdown content, label
 * chips, timestamp, and a reply-prefix line for replies), a live count badge
 * matching the Attachments section convention, per-comment
 * Edit/Reply/Delete/Copy-link actions, and a pinned Add-Comment form above
 * the thread so a newly-created comment appears directly beneath it. The
 * thread is always flat — a reply is an ordinary comment with a header
 * line, never nested or indented.
 *
 * `@role` mention autocomplete/highlighting (TASK-008) builds on top of this
 * section. Cross-host permalink deep-linking (TASK-009) lands here too: the
 * `/comments/:id` resolver navigates to this section's host with
 * `scrollToCommentId` set, which this section resolves through the exact
 * same scroll+highlight path (`jumpTo`) the local reply-prefix jump link
 * already uses.
 *
 * @param containerType    - story | task | milestone.
 * @param containerId      - The owning container's ID.
 * @param projectId        - Owning project — used to resolve the effective `default_web_ui_role`.
 * @param scrollToCommentId - Set by the permalink resolver once it has navigated to this host;
 *                             this section scrolls to and briefly highlights that comment once the
 *                             thread has loaded. Absent for ordinary (non-deep-linked) visits.
 */

import { useEffect, useRef, useState } from "react";
import { useProjectSettingsEffective } from "@/features/settings/hooks/useProjectSettings";
import { useToast } from "@/shared/hooks/useToast";
import { Toast } from "@/shared/components/Toast";
import {
  useCommentList,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/features/comments/hooks/useComments";
import { extractErrorMessage, extractFieldErrors } from "@/features/comments/utils/errorMessages";
import { getCommentPermalink } from "@/features/comments/utils/commentPermalink";
import { CommentRow } from "./CommentRow";
import { AddCommentForm } from "./AddCommentForm";
import { DeleteCommentDialog } from "./DeleteCommentDialog";
import type { Comment, ContainerType, CreateComment, UpdateComment } from "@/api/types";

interface CommentsSectionProps {
  containerType: ContainerType;
  containerId: string;
  projectId: string;
  scrollToCommentId?: string;
}

const HIGHLIGHT_DURATION_MS = 2000;

/** Orchestrates the full comments UI: thread, add form, inline actions, and delete confirmation. */
export function CommentsSection({
  containerType,
  containerId,
  projectId,
  scrollToCommentId,
}: CommentsSectionProps) {
  const { data: commentEnvelope, isLoading, isError } = useCommentList(containerType, containerId);
  const { data: effectiveSettings } = useProjectSettingsEffective(projectId);

  const createMutation = useCreateComment(containerType, containerId);
  const updateMutation = useUpdateComment(containerType, containerId);
  const deleteMutation = useDeleteComment(containerType, containerId);

  const toast = useToast();

  const [replyTarget, setReplyTarget] = useState<Comment | undefined>();
  const [formResetKey, setFormResetKey] = useState(0);
  const [addError, setAddError] = useState<string | undefined>();
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  const [pendingDelete, setPendingDelete] = useState<Comment | undefined>();
  const [deleteError, setDeleteError] = useState<string | undefined>();

  // Reply-jump scroll/highlight — resolved locally within the loaded thread.
  // The permalink resolver (TASK-009) reuses this exact path via `scrollToCommentId`.
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [highlightedId, setHighlightedId] = useState<string | undefined>();
  const addFormRef = useRef<HTMLDivElement>(null);
  // Guards against re-jumping on every re-render once a deep-linked target has been applied.
  const appliedScrollTargetRef = useRef<string | undefined>(undefined);

  const comments = commentEnvelope?.data ?? [];
  const commentsById = new Map(comments.map((c) => [c.id, c]));
  const participantRoles = effectiveSettings?.participant_roles ?? [];

  function jumpTo(id: string) {
    const el = rowRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedId(id);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(undefined), HIGHLIGHT_DURATION_MS);
  }

  // Applies the permalink resolver's deep-link target once the thread has loaded. A target
  // whose comment was deleted simply finds no registered row — `jumpTo` no-ops, not an error.
  useEffect(() => {
    if (!scrollToCommentId || isLoading) return;
    if (appliedScrollTargetRef.current === scrollToCommentId) return;
    appliedScrollTargetRef.current = scrollToCommentId;
    jumpTo(scrollToCommentId);
  }, [scrollToCommentId, isLoading, comments.length]);

  function handleAddSubmit(data: CreateComment) {
    setAddError(undefined);
    setAddFieldErrors({});
    createMutation.mutate(data, {
      onSuccess: () => {
        setReplyTarget(undefined);
        setFormResetKey((k) => k + 1);
      },
      onError: (err) => {
        setAddError(extractErrorMessage(err));
        setAddFieldErrors(extractFieldErrors(err));
      },
    });
  }

  function handleReply(comment: Comment) {
    setReplyTarget(comment);
    // Form now sits above the thread — scroll its start into view, not its end.
    requestAnimationFrame(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function handleStartEdit(id: string) {
    setEditingId(id);
    setEditError(undefined);
    setEditFieldErrors({});
  }

  function handleCancelEdit() {
    setEditingId(undefined);
    setEditError(undefined);
    setEditFieldErrors({});
  }

  function handleSaveEdit(commentId: string, data: UpdateComment) {
    setEditError(undefined);
    setEditFieldErrors({});
    updateMutation.mutate(
      { commentId, data },
      {
        onSuccess: () => setEditingId(undefined),
        onError: (err) => {
          setEditError(extractErrorMessage(err));
          setEditFieldErrors(extractFieldErrors(err));
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return;
    setDeleteError(undefined);
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(undefined),
      onError: (err) => setDeleteError(extractErrorMessage(err)),
    });
  }

  async function handleCopyLink(comment: Comment) {
    try {
      await navigator.clipboard.writeText(getCommentPermalink(comment.id));
      toast.show("Link copied");
    } catch {
      toast.show("Could not copy link.");
    }
  }

  return (
    <section aria-label="Comments">
      {/* Header with live count badge */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Comments
          {!isLoading && !isError && (
            <span
              aria-label={`${comments.length} comment${comments.length === 1 ? "" : "s"}`}
              className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-text-secondary"
            >
              {comments.length}
            </span>
          )}
        </h3>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-6" aria-busy="true">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <p role="alert" className="rounded-md bg-status-error/10 px-4 py-3 text-sm text-status-error">
          Failed to load comments. Please refresh and try again.
        </p>
      )}

      {/* Pinned Add-Comment form — above the thread so a newly-created comment
          (newest-first) appears directly beneath it */}
      <div ref={addFormRef} className="mb-3">
        <AddCommentForm
          key={formResetKey}
          authorRoleDefault={effectiveSettings?.default_web_ui_role ?? ""}
          participantRoles={participantRoles}
          replyTarget={replyTarget}
          onDismissReply={() => setReplyTarget(undefined)}
          onSubmit={handleAddSubmit}
          isSubmitting={createMutation.isPending}
          errorMessage={addError}
          fieldErrors={addFieldErrors}
        />
      </div>

      {/* Empty state */}
      {!isLoading && !isError && comments.length === 0 && (
        <p className="mb-3 rounded-md border border-dashed border-border p-4 text-center text-sm text-text-muted">
          No comments yet.
        </p>
      )}

      {/* Comment thread — newest-first (server order), flat (no nesting) */}
      {!isLoading && !isError && comments.length > 0 && (
        <ul aria-label="Comments list" className="mb-3 divide-y divide-border rounded-md border border-border">
          {comments.map((comment) => {
            const directParentId = comment.ancestors[comment.ancestors.length - 1];
            const parentComment = directParentId ? commentsById.get(directParentId) : undefined;
            return (
              <CommentRow
                key={comment.id}
                comment={comment}
                parentAuthorRole={parentComment?.author_role}
                canJumpToParent={Boolean(parentComment)}
                participantRoles={participantRoles}
                isHighlighted={highlightedId === comment.id}
                isEditing={editingId === comment.id}
                isUpdating={updateMutation.isPending && editingId === comment.id}
                updateError={editingId === comment.id ? editError : undefined}
                updateFieldErrors={editingId === comment.id ? editFieldErrors : undefined}
                registerRef={(el) => {
                  if (el) rowRefs.current.set(comment.id, el);
                  else rowRefs.current.delete(comment.id);
                }}
                onStartEdit={() => handleStartEdit(comment.id)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={(data) => handleSaveEdit(comment.id, data)}
                onReply={() => handleReply(comment)}
                onDelete={() => {
                  setPendingDelete(comment);
                  setDeleteError(undefined);
                }}
                onCopyLink={() => handleCopyLink(comment)}
                onJumpToParent={() => directParentId && jumpTo(directParentId)}
              />
            );
          })}
        </ul>
      )}

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <DeleteCommentDialog
          authorRole={pendingDelete.author_role}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setPendingDelete(undefined);
            setDeleteError(undefined);
          }}
          isDeleting={deleteMutation.isPending}
          errorMessage={deleteError}
        />
      )}

      {/* Copy-link confirmation toast */}
      {toast.message && <Toast message={toast.message} onDismiss={toast.dismiss} />}
    </section>
  );
}
