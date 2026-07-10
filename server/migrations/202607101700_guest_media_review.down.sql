DROP TABLE IF EXISTS guest_review_link;

DELETE FROM review_assets WHERE asset_type = 'pdf';
DELETE FROM review_comments WHERE author_id IS NULL;
ALTER TABLE review_assets DROP CONSTRAINT review_assets_asset_type_check;
ALTER TABLE review_assets ADD CONSTRAINT review_assets_asset_type_check
  CHECK (asset_type IN ('video', 'image'));

ALTER TABLE review_comments
  DROP COLUMN IF EXISTS page_index,
  DROP COLUMN IF EXISTS guest_name,
  ALTER COLUMN author_id SET NOT NULL;
