CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_types_project
  ON issue_types (project_id);
