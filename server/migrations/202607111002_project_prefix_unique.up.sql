CREATE UNIQUE INDEX idx_project_prefix_workspace ON project (workspace_id, prefix) WHERE prefix IS NOT NULL;
