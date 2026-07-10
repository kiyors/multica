-- name: ListDocumentsByProject :many
SELECT * FROM project_document
WHERE project_id = $1
ORDER BY parent_id NULLS FIRST, sort_order ASC, created_at DESC;

-- name: GetDocument :one
SELECT * FROM project_document
WHERE id = $1;

-- name: CreateDocument :one
INSERT INTO project_document (
  project_id, parent_id, title, content, sort_order, created_by, document_type
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: UpdateDocument :one
UPDATE project_document
SET parent_id = CASE
      WHEN sqlc.arg('parent_id_set')::boolean THEN sqlc.narg('parent_id')
      ELSE parent_id
    END,
    title = COALESCE(sqlc.narg('title'), title),
    content = COALESCE(sqlc.narg('content'), content),
    document_type = COALESCE(sqlc.narg('document_type'), document_type),
    sort_order = COALESCE(sqlc.narg('sort_order'), sort_order),
    updated_at = now()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: DeleteDocument :exec
DELETE FROM project_document
WHERE id = $1;
