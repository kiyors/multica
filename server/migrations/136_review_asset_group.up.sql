-- The recovery merge produced databases with different review migration
-- histories. Add the group column only when the base table exists and the
-- column has not already been applied.
DO $$
BEGIN
  IF to_regclass('public.review_assets') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'review_assets'
         AND column_name = 'asset_group_id'
     ) THEN
    ALTER TABLE review_assets
      ADD COLUMN asset_group_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
END
$$;
