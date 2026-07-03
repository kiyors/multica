package handler

import (
	"encoding/json"

	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

type ReviewAssetResponse struct {
	ID           string  `json:"id"`
	IssueID      string  `json:"issue_id"`
	WorkspaceID  string  `json:"workspace_id"`
	Name         string  `json:"name"`
	AssetType    string  `json:"asset_type"`
	FileURL      string  `json:"file_url"`
	ThumbnailURL *string `json:"thumbnail_url"`
	Width        *int32  `json:"width"`
	Height       *int32  `json:"height"`
	Duration     *float32 `json:"duration"`
	Version      int32   `json:"version"`
	Status       string  `json:"status"`
	UploadedBy   *string `json:"uploaded_by"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type ReviewCommentResponse struct {
	ID         string  `json:"id"`
	AssetID    string  `json:"asset_id"`
	AuthorID   string  `json:"author_id"`
	Content    string  `json:"content"`
	Timestamp  *float32 `json:"timestamp"`
	Shapes     json.RawMessage `json:"shapes"`
	Resolved   bool    `json:"resolved"`
	ResolvedBy *string `json:"resolved_by"`
	ResolvedAt *string `json:"resolved_at"`
	ParentID   *string `json:"parent_id"`
	CreatedAt  string  `json:"created_at"`
	UpdatedAt  string  `json:"updated_at"`
}

func reviewAssetToResponse(a db.ReviewAsset) ReviewAssetResponse {
	return ReviewAssetResponse{
		ID:           uuidToString(a.ID),
		IssueID:      uuidToString(a.IssueID),
		WorkspaceID:  uuidToString(a.WorkspaceID),
		Name:         a.Name,
		AssetType:    a.AssetType,
		FileURL:      a.FileUrl,
		ThumbnailURL: textToPtr(a.ThumbnailUrl),
		Width:        int4ToPtr(a.Width),
		Height:       int4ToPtr(a.Height),
		Duration:     float4ToPtr(a.Duration),
		Version:      a.Version,
		Status:       a.Status,
		UploadedBy:   uuidToPtr(a.UploadedBy),
		CreatedAt:    timestampToString(a.CreatedAt),
		UpdatedAt:    timestampToString(a.UpdatedAt),
	}
}

func reviewCommentToResponse(c db.ReviewComment) ReviewCommentResponse {
	return ReviewCommentResponse{
		ID:         uuidToString(c.ID),
		AssetID:    uuidToString(c.AssetID),
		AuthorID:   uuidToString(c.AuthorID),
		Content:    c.Content,
		Timestamp:  float4ToPtr(c.Timestamp),
		Shapes:     c.Shapes,
		Resolved:   c.Resolved,
		ResolvedBy: uuidToPtr(c.ResolvedBy),
		ResolvedAt: timestampToPtr(c.ResolvedAt),
		ParentID:   uuidToPtr(c.ParentID),
		CreatedAt:  timestampToString(c.CreatedAt),
		UpdatedAt:  timestampToString(c.UpdatedAt),
	}
}

func float4ToPtr(f pgtype.Float4) *float32 {
	if !f.Valid {
		return nil
	}
	return &f.Float32
}

// TODO: Define HTTP endpoints for Create/List/Delete
