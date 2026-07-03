CREATE TABLE issue_assignees (
  issue_id      UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('member', 'agent')),
  assignee_id   UUID NOT NULL,
  role          TEXT NOT NULL DEFAULT 'assignee' CHECK (role IN ('assignee', 'reviewer', 'observer')),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, assignee_type, assignee_id)
);
