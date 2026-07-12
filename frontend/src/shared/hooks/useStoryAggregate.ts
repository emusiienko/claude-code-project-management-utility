/**
 * useStoryAggregate — shared hook for the story task-count aggregate.
 *
 * Fetches GET /v1/stories/:id/aggregate and returns the per-status task counts.
 * Consumed by the Stories list (TASK-006) and the Task Kanban (TASK-004) so
 * neither feature imports from the other.
 *
 * Implementation lives in src/features/tasks/hooks/useTasks.ts because the
 * aggregate is a Tasks-domain operation. This module re-exports it for
 * cross-feature use without creating a circular dependency.
 */

export { useStoryAggregate } from "@/features/tasks/hooks/useTasks";
