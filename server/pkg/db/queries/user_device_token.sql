-- name: UpsertUserDeviceToken :exec
INSERT INTO user_device_tokens (user_id, token, platform)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, token) DO UPDATE
SET platform = EXCLUDED.platform,
    updated_at = now();

-- name: GetUserDeviceTokens :many
SELECT * FROM user_device_tokens WHERE user_id = $1;

-- name: DeleteUserDeviceToken :exec
DELETE FROM user_device_tokens WHERE user_id = $1 AND token = $2;
