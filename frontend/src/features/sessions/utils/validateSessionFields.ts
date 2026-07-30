/**
 * validateSessionFields — shared required-field validation for the Session
 * create/edit forms. `topic`, `goal`, and `participant_role` can never be
 * empty; extracted so both forms produce identical inline error copy.
 */

export interface SessionRequiredFieldValues {
  topic: string;
  goal: string;
  participantRole: string;
}

export const SESSION_TEXT_FIELD_MAX_LENGTH = 500;

export function validateSessionFields({
  topic,
  goal,
  participantRole,
}: SessionRequiredFieldValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const trimmedTopic = topic.trim();
  if (!trimmedTopic) {
    errors.topic = "Topic is required.";
  } else if (trimmedTopic.length > SESSION_TEXT_FIELD_MAX_LENGTH) {
    errors.topic = `Topic must be ${SESSION_TEXT_FIELD_MAX_LENGTH} characters or fewer.`;
  }

  const trimmedGoal = goal.trim();
  if (!trimmedGoal) {
    errors.goal = "Goal is required.";
  } else if (trimmedGoal.length > SESSION_TEXT_FIELD_MAX_LENGTH) {
    errors.goal = `Goal must be ${SESSION_TEXT_FIELD_MAX_LENGTH} characters or fewer.`;
  }

  if (!participantRole.trim()) {
    errors.participant_role = "Participant role is required.";
  }

  return errors;
}
