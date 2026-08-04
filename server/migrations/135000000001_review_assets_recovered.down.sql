-- Recovery migrations may be applied to installations where the original
-- 249 migration already owns these tables, so rollback must not drop them.
SELECT 1;
