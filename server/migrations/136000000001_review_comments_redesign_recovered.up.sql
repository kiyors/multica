-- Recovered custom migration; review comments must be redesigned before the
-- later timestamped guest/deep-link migrations consume these columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'review_comments'
      AND column_name = 'timestamp'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'review_comments'
      AND column_name = 'start_time'
  ) THEN
    ALTER TABLE review_comments RENAME COLUMN timestamp TO start_time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'review_comments'
      AND column_name = 'end_time'
  ) THEN
    ALTER TABLE review_comments ADD COLUMN end_time REAL;
  END IF;
END
$$;
