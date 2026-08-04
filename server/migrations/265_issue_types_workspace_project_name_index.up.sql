CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_issue_types_workspace_project_name
  ON issue_types (workspace_id, project_id, name) NULLS NOT DISTINCT;
