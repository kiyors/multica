DROP INDEX IF EXISTS review_assets_incomplete_upload_idx;

ALTER TABLE review_assets
  DROP COLUMN IF EXISTS upload_completed_at;

ALTER TABLE comment
  DROP COLUMN IF EXISTS review_end_time,
  DROP COLUMN IF EXISTS review_start_time,
  DROP COLUMN IF EXISTS review_page_index,
  DROP COLUMN IF EXISTS review_comment_id,
  DROP COLUMN IF EXISTS review_asset_id;
