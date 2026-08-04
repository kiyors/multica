CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_issue_label_workspace_project_name
  ON issue_label (workspace_id, project_id, name) NULLS NOT DISTINCT;
