ALTER TABLE issue_types DROP CONSTRAINT IF EXISTS uq_issue_types_workspace_project_name;
ALTER TABLE issue_types ADD CONSTRAINT issue_types_workspace_id_name_key UNIQUE (workspace_id, name);

DROP INDEX IF EXISTS idx_issue_types_project;
ALTER TABLE issue_types DROP COLUMN IF EXISTS project_id;

ALTER TABLE issue_label DROP CONSTRAINT IF EXISTS uq_issue_label_workspace_project_name;
ALTER TABLE issue_label ADD CONSTRAINT issue_label_workspace_id_name_key UNIQUE (workspace_id, name);

DROP INDEX IF EXISTS idx_issue_label_project;
ALTER TABLE issue_label DROP COLUMN IF EXISTS project_id;
