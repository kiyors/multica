-- name: ListMilestonesByProject :many
SELECT * FROM milestone
WHERE project_id = $1
ORDER BY sort_order ASC, created_at DESC;

-- name: GetMilestone :one
SELECT * FROM milestone
WHERE id = $1;

-- name: CreateMilestone :one
INSERT INTO milestone (
  project_id, title, description, start_date, due_date, status, sort_order, created_by
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: UpdateMilestone :one
UPDATE milestone
SET title = COALESCE(sqlc.narg('title'), title),
    description = COALESCE(sqlc.narg('description'), description),
    start_date = CASE
      WHEN sqlc.arg('start_date_set')::boolean THEN sqlc.narg('start_date')
      ELSE start_date
    END,
    due_date = CASE
      WHEN sqlc.arg('due_date_set')::boolean THEN sqlc.narg('due_date')
      ELSE due_date
    END,
    status = COALESCE(sqlc.narg('status'), status),
    sort_order = COALESCE(sqlc.narg('sort_order'), sort_order),
    updated_at = now()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: DeleteMilestone :exec
DELETE FROM milestone
WHERE id = $1;

-- name: ListMilestoneMembersByProject :many
SELECT mm.milestone_id, mm.member_id
FROM milestone_member mm
JOIN milestone m ON m.id = mm.milestone_id
WHERE m.project_id = $1
ORDER BY mm.assigned_at ASC;

-- name: ListMilestoneMemberIDs :many
SELECT member_id
FROM milestone_member
WHERE milestone_id = $1
ORDER BY assigned_at ASC;

-- name: AddMilestoneMember :exec
INSERT INTO milestone_member (milestone_id, member_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DeleteMilestoneMembers :exec
DELETE FROM milestone_member WHERE milestone_id = $1;
