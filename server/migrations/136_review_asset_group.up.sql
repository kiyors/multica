ALTER TABLE review_assets ADD COLUMN asset_group_id UUID NOT NULL DEFAULT gen_random_uuid();
