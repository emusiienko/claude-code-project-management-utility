# Escalation Skill

Load this file whenever you need to escalate something to another role mid-session, or when you
need to check for and respond to an escalation addressed to you.

## Location

All escalations live in `.fast-sdlc/escalations/`:
- `index.md` — the open/closed tracking table
- one file per escalation: `escalation-<topic>-<requester>-<responders>.md`

## Raising an escalation

1. Pick a short topic slug and identify the responder role(s) who need to answer
2. Create `escalation-<topic>-<requester>-<responders>.md` in the escalations folder
3. Add your opening entry:
   ```
   date: <date>
   from: <your role>
   to: <responder role(s)>
   comment: <the topic, the artifacts involved, and, if you have one, a suggested resolution>
   ```
4. Add a row to `index.md` with status `open`
5. Note the escalation's existence in your own report, so the orchestrator can route a response

## Responding to an escalation

1. Open the escalation file addressed to your role
2. Read every prior entry in full
3. Append a new dated entry with your answer, a follow-up question, or a proposed resolution
4. Leave the escalation open if more discussion is needed — the same file carries the whole
   conversation

## Closing an escalation

Only the requester who opened the escalation decides when it's resolved. Once satisfied, the
requester appends a closing entry and updates the row in `index.md` to `closed`.

## index.md columns

`Escalation | Topic | Requester | Responder(s) | Status | Opened | Closed`
