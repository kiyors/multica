CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_label_project
  ON issue_label (project_id);
