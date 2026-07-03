CREATE TABLE review_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  asset_type  TEXT NOT NULL CHECK (asset_type IN ('video', 'image')),
  file_url    TEXT NOT NULL,
  thumbnail_url TEXT,
  width       INT,
  height      INT,
  duration    REAL,
  version     INT NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
  uploaded_by UUID REFERENCES members(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE review_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL REFERENCES review_assets(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES members(id),
  content     TEXT NOT NULL,
  timestamp   REAL,
  shapes      JSONB DEFAULT '[]',
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES members(id),
  resolved_at TIMESTAMPTZ,
  parent_id   UUID REFERENCES review_comments(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
