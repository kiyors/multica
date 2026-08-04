-- Recovered installations may already have this schema through the former
-- 139_project_scoped_labels_types migration. Reconcile the columns and legacy
-- constraints here; indexes live in dedicated concurrent migrations.
ALTER TABLE issue_label ADD COLUMN IF NOT EXISTS project_id UUID;

ALTER TABLE issue_label DROP CONSTRAINT IF EXISTS issue_label_workspace_id_name_key;

ALTER TABLE issue_types ADD COLUMN IF NOT EXISTS project_id UUID;

ALTER TABLE issue_types DROP CONSTRAINT IF EXISTS issue_types_workspace_id_name_key;
