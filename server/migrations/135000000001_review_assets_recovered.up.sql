-- Recovered custom migration. Keep it alongside the other 135 migrations so
-- dependent review migrations run in their original order on fresh databases.
CREATE TABLE IF NOT EXISTS review_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id    UUID NOT NULL,
  workspace_id UUID NOT NULL,
  name        TEXT NOT NULL,
  asset_type  TEXT NOT NULL CHECK (asset_type IN ('video', 'image')),
  file_url    TEXT NOT NULL,
  thumbnail_url TEXT,
  width       INT,
  height      INT,
  duration    REAL,
  version     INT NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
  uploaded_by UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL,
  author_id   UUID NOT NULL,
  content     TEXT NOT NULL,
  timestamp   REAL,
  shapes      JSONB DEFAULT '[]',
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  parent_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
