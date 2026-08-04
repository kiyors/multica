-- Recovered installations may already own this exact table through the former
-- 139_project_members migration. Its full version name differs, so 254 still
-- runs during upgrade and must safely adopt the existing table.
CREATE TABLE IF NOT EXISTS project_member (
  project_id  UUID NOT NULL,
  member_id   UUID NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by  UUID,
  PRIMARY KEY (project_id, member_id)
);
