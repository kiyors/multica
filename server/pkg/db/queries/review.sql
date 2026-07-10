-- name: CreateReviewAsset :one
INSERT INTO review_assets (
  issue_id, workspace_id, name, asset_type, file_url, thumbnail_url, width, height, duration, version, uploaded_by, asset_group_id
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
) RETURNING *;

-- name: GetReviewAsset :one
SELECT * FROM review_assets WHERE id = $1;

-- name: ListReviewAssetsByIssue :many
SELECT * FROM review_assets
WHERE issue_id = $1 AND upload_completed_at IS NOT NULL
ORDER BY created_at DESC;

-- name: ListPendingReviewIssueIDs :many
SELECT DISTINCT issue_id FROM review_assets WHERE workspace_id = $1 AND status != 'approved';

-- name: UpdateReviewAssetStatus :one
UPDATE review_assets SET status = $2, updated_at = now() WHERE id = $1 RETURNING *;

-- name: UpdateReviewAssetMetadata :exec
UPDATE review_assets 
SET file_url = COALESCE($2, file_url), 
    thumbnail_url = COALESCE($3, thumbnail_url),
    width = COALESCE($4, width),
    height = COALESCE($5, height),
    duration = COALESCE($6, duration),
    updated_at = now() 
WHERE id = $1;

-- name: ListReviewAssetVersions :many
SELECT * FROM review_assets
WHERE asset_group_id = $1 AND upload_completed_at IS NOT NULL
ORDER BY version DESC;

-- name: MarkReviewAssetUploadCompleted :one
UPDATE review_assets
SET upload_completed_at = now(), updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteStaleIncompleteReviewAssets :many
DELETE FROM review_assets
WHERE upload_completed_at IS NULL
  AND created_at < now() - interval '24 hours'
RETURNING file_url;

-- name: BulkApproveReviewAssets :exec
UPDATE review_assets SET status = 'approved', updated_at = now() WHERE issue_id = $1 AND status = 'pending';

-- name: DeleteReviewAsset :exec
DELETE FROM review_assets WHERE id = $1;

-- name: DeleteReviewAssetGroup :exec
DELETE FROM review_assets WHERE asset_group_id = $1;

-- name: CreateReviewComment :one
INSERT INTO review_comments (
  asset_id, author_id, content, start_time, end_time, shapes, parent_id, page_index
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: GetReviewComment :one
SELECT * FROM review_comments WHERE id = $1;

-- name: ListReviewCommentsByAsset :many
SELECT * FROM review_comments WHERE asset_id = $1 ORDER BY created_at ASC;

-- name: UpdateReviewComment :one
UPDATE review_comments SET content = $2, shapes = $3, start_time = $4, end_time = $5, page_index = COALESCE(sqlc.narg('page_index'), page_index), updated_at = now() WHERE id = $1 RETURNING *;

-- name: ResolveReviewComment :one
UPDATE review_comments SET resolved = true, resolved_by = $2, resolved_at = now(), updated_at = now() WHERE id = $1 RETURNING *;

-- name: UnresolveReviewComment :one
UPDATE review_comments SET resolved = false, resolved_by = NULL, resolved_at = NULL, updated_at = now() WHERE id = $1 RETURNING *;

-- name: DeleteReviewComment :exec
DELETE FROM review_comments WHERE id = $1;

-- name: UpsertGuestReviewLink :one
INSERT INTO guest_review_link (asset_id, token_hash, created_by, expires_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (asset_id) DO UPDATE SET
  token_hash = EXCLUDED.token_hash,
  created_by = EXCLUDED.created_by,
  created_at = now(),
  expires_at = EXCLUDED.expires_at,
  revoked_at = NULL
RETURNING *;

-- name: GetGuestReviewAssetIDByTokenHash :one
SELECT asset_id FROM guest_review_link
WHERE token_hash = $1
  AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > now());

-- name: CreateGuestReviewComment :one
INSERT INTO review_comments (
  asset_id, author_id, guest_name, content, start_time, end_time, shapes, parent_id, page_index
) VALUES (
  $1, NULL, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;
