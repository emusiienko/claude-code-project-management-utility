DICT_KEY_TASK_STATUSES = "task_statuses"
DICT_KEY_TASK_TYPES = "task_types"
DICT_KEY_STORY_STATUSES = "story_statuses"
DICT_KEY_ATTACHMENT_TYPES = "attachment_types"
DICT_KEY_LINK_TYPES = "link_types"
DICT_KEY_PARTICIPANT_ROLES = "participant_roles"

ALL_DICT_KEYS: frozenset[str] = frozenset(
    {
        DICT_KEY_TASK_STATUSES,
        DICT_KEY_TASK_TYPES,
        DICT_KEY_STORY_STATUSES,
        DICT_KEY_ATTACHMENT_TYPES,
        DICT_KEY_LINK_TYPES,
        DICT_KEY_PARTICIPANT_ROLES,
    }
)
