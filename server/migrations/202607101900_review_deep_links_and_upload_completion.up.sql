ALTER TABLE comment
  ADD COLUMN review_asset_id UUID REFERENCES review_assets(id) ON DELETE SET NULL,
  ADD COLUMN review_comment_id UUID REFERENCES review_comments(id) ON DELETE SET NULL,
  ADD COLUMN review_page_index INT CHECK (review_page_index >= 0),
  ADD COLUMN review_start_time REAL,
  ADD COLUMN review_end_time REAL;

ALTER TABLE review_assets
  ADD COLUMN upload_completed_at TIMESTAMPTZ;

UPDATE review_assets
SET upload_completed_at = COALESCE(updated_at, created_at, now());

CREATE INDEX review_assets_incomplete_upload_idx
  ON review_assets (created_at)
  WHERE upload_completed_at IS NULL;
