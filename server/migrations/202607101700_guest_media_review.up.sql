ALTER TABLE review_comments
  ALTER COLUMN author_id DROP NOT NULL,
  ADD COLUMN guest_name TEXT,
  ADD COLUMN page_index INT NOT NULL DEFAULT 0 CHECK (page_index >= 0);

ALTER TABLE review_assets DROP CONSTRAINT review_assets_asset_type_check;
ALTER TABLE review_assets ADD CONSTRAINT review_assets_asset_type_check
  CHECK (asset_type IN ('video', 'image', 'pdf'));

CREATE TABLE guest_review_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL UNIQUE REFERENCES review_assets(id) ON DELETE CASCADE,
  token_hash BYTEA NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES member(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX guest_review_link_active_token_idx
  ON guest_review_link (token_hash)
  WHERE revoked_at IS NULL;
