ALTER TABLE issue_label ADD COLUMN project_id UUID REFERENCES project(id) ON DELETE CASCADE;
CREATE INDEX idx_issue_label_project ON issue_label(project_id);

ALTER TABLE issue_label DROP CONSTRAINT IF EXISTS issue_label_workspace_id_name_key;
ALTER TABLE issue_label ADD CONSTRAINT uq_issue_label_workspace_project_name UNIQUE NULLS NOT DISTINCT (workspace_id, project_id, name);

ALTER TABLE issue_types ADD COLUMN project_id UUID REFERENCES project(id) ON DELETE CASCADE;
CREATE INDEX idx_issue_types_project ON issue_types(project_id);

ALTER TABLE issue_types DROP CONSTRAINT IF EXISTS issue_types_workspace_id_name_key;
ALTER TABLE issue_types ADD CONSTRAINT uq_issue_types_workspace_project_name UNIQUE NULLS NOT DISTINCT (workspace_id, project_id, name);
