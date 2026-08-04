package handler

import (
	"context"
	cryptorand "crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kiyors/multica/server/internal/middleware"
	"github.com/kiyors/multica/server/internal/storage"
	"github.com/kiyors/multica/server/internal/util"
	db "github.com/kiyors/multica/server/pkg/db/generated"
	"github.com/kiyors/multica/server/pkg/protocol"
)

type ReviewAssetResponse struct {
	ID           string   `json:"id"`
	IssueID      string   `json:"issue_id"`
	WorkspaceID  string   `json:"workspace_id"`
	AssetGroupID string   `json:"asset_group_id"`
	Name         string   `json:"name"`
	AssetType    string   `json:"asset_type"`
	SrcURL       string   `json:"src_url"`
	ThumbnailURL *string  `json:"thumbnail_url,omitempty"`
	Width        *int32   `json:"width"`
	Height       *int32   `json:"height"`
	Duration     *float32 `json:"duration"`
	Version      int32    `json:"version"`
	Status       string   `json:"status"`
	UploadedBy   *string  `json:"uploaded_by"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

type ReviewCommentResponse struct {
	ID         string          `json:"id"`
	AssetID    string          `json:"asset_id"`
	AuthorID   *string         `json:"author_id,omitempty"`
	GuestName  *string         `json:"guest_name,omitempty"`
	Content    string          `json:"content"`
	StartTime  *float32        `json:"start_time,omitempty"`
	EndTime    *float32        `json:"end_time,omitempty"`
	PageIndex  int32           `json:"page_index"`
	Shapes     json.RawMessage `json:"shapes"`
	Resolved   bool            `json:"resolved"`
	ResolvedBy *string         `json:"resolved_by"`
	ResolvedAt *string         `json:"resolved_at"`
	ParentID   *string         `json:"parent_id"`
	CreatedAt  string          `json:"created_at"`
	UpdatedAt  string          `json:"updated_at"`
}

func (h *Handler) reviewAssetForIssue(w http.ResponseWriter, r *http.Request, assetID pgtype.UUID) (db.ReviewAsset, db.Issue, bool) {
	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return db.ReviewAsset{}, db.Issue{}, false
	}
	asset, err := h.Queries.GetReviewAsset(r.Context(), assetID)
	if err != nil || asset.IssueID != issue.ID || asset.WorkspaceID != issue.WorkspaceID {
		writeError(w, http.StatusNotFound, "asset not found")
		return db.ReviewAsset{}, db.Issue{}, false
	}
	return asset, issue, true
}

func (h *Handler) reviewCommentForIssue(w http.ResponseWriter, r *http.Request, commentID pgtype.UUID) (db.ReviewComment, db.ReviewAsset, bool) {
	comment, err := h.Queries.GetReviewComment(r.Context(), commentID)
	if err != nil {
		writeError(w, http.StatusNotFound, "comment not found")
		return db.ReviewComment{}, db.ReviewAsset{}, false
	}
	asset, _, ok := h.reviewAssetForIssue(w, r, comment.AssetID)
	if !ok {
		return db.ReviewComment{}, db.ReviewAsset{}, false
	}
	return comment, asset, true
}

func canManageReviewAsset(member db.Member, asset db.ReviewAsset) bool {
	return isWorkspaceManagerRole(member.Role) || asset.UploadedBy == member.ID
}

func (h *Handler) reviewAssetToResponse(a db.ReviewAsset) ReviewAssetResponse {
	resolveAssetURL := func(key string) string {
		if key == "" || h.Storage == nil {
			return key
		}
		fallback := h.Storage.ObjectURL(key)
		if presigner, ok := h.Storage.(storage.Presigner); ok {
			if signed, err := presigner.PresignGet(context.Background(), key, 30*time.Minute); err == nil {
				return signed
			} else {
				slog.Warn("review asset presign failed, returning configured object URL", "asset_id", uuidToString(a.ID), "error", err)
			}
		}
		return fallback
	}

	fileURL := resolveAssetURL(a.FileUrl)
	var thumbnailURL *string
	if a.ThumbnailUrl.Valid {
		resolved := resolveAssetURL(a.ThumbnailUrl.String)
		thumbnailURL = &resolved
	}
	return ReviewAssetResponse{
		ID:           uuidToString(a.ID),
		IssueID:      uuidToString(a.IssueID),
		WorkspaceID:  uuidToString(a.WorkspaceID),
		AssetGroupID: uuidToString(a.AssetGroupID),
		Name:         a.Name,
		AssetType:    a.AssetType,
		SrcURL:       fileURL,
		ThumbnailURL: thumbnailURL,
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
		AuthorID:   uuidToPtr(c.AuthorID),
		GuestName:  textToPtr(c.GuestName),
		Content:    c.Content,
		StartTime:  float4ToPtr(c.StartTime),
		EndTime:    float4ToPtr(c.EndTime),
		PageIndex:  c.PageIndex,
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

func validReviewTimeRange(start, end *float32) bool {
	for _, value := range []*float32{start, end} {
		if value != nil && (*value < 0 || math.IsNaN(float64(*value)) || math.IsInf(float64(*value), 0)) {
			return false
		}
	}
	return start == nil || end == nil || *end >= *start
}

type PresignReviewAssetUploadRequest struct {
	IssueID         string `json:"issue_id"`
	Filename        string `json:"filename"`
	ContentType     string `json:"content_type"`
	Size            int64  `json:"size"`
	PreviousAssetID string `json:"previous_asset_id,omitempty"`
}

const maxReviewAssetUploadSize = 100 << 20

type PresignReviewAssetUploadResponse struct {
	UploadURL string              `json:"upload_url"`
	Asset     ReviewAssetResponse `json:"asset"`
}

func (h *Handler) PresignReviewAssetUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if staleKeys, err := h.Queries.DeleteStaleIncompleteReviewAssets(ctx); err != nil {
		slog.Warn("failed to clean stale review uploads", "error", err)
	} else if len(staleKeys) > 0 {
		if h.Storage != nil {
			h.Storage.DeleteKeys(ctx, staleKeys)
		}
		slog.Info("deleted stale incomplete review uploads", "count", len(staleKeys))
	}
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}

	var req PresignReviewAssetUploadRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.Filename = filepath.Base(strings.TrimSpace(req.Filename))
	if req.Filename == "" || req.Filename == "." || req.Size <= 0 || req.Size > maxReviewAssetUploadSize {
		writeError(w, http.StatusBadRequest, "filename or size is invalid")
		return
	}

	issueUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "id"), "issue_id")
	if !ok {
		return
	}

	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if issue.ID != issueUUID || (req.IssueID != "" && req.IssueID != uuidToString(issue.ID)) {
		writeError(w, http.StatusBadRequest, "issue_id does not match request path")
		return
	}

	var previousAssetUUID pgtype.UUID
	if req.PreviousAssetID != "" {
		parsed, ok := parseUUIDOrBadRequest(w, req.PreviousAssetID, "previous_asset_id")
		if !ok {
			return
		}
		previousAssetUUID = parsed
	}

	assetType := ""
	if strings.HasPrefix(req.ContentType, "image/") {
		assetType = "image"
	} else if req.ContentType == "video/mp4" || req.ContentType == "video/webm" || req.ContentType == "video/quicktime" {
		assetType = "video"
	} else if req.ContentType == "audio/mpeg" || req.ContentType == "audio/mp4" || req.ContentType == "audio/wav" || req.ContentType == "audio/webm" || req.ContentType == "audio/ogg" {
		assetType = "audio"
	} else if req.ContentType == "application/pdf" {
		assetType = "pdf"
	}
	if assetType == "" {
		writeError(w, http.StatusBadRequest, "unsupported content_type")
		return
	}

	// For S3 we can generate a presigned URL. For local, we fallback to a direct upload URL
	var uploadURL string
	fileKey := "reviews/" + util.UUIDToString(issueUUID) + "/" + uuid.New().String() + "_" + req.Filename

	if presigner, ok := h.Storage.(storage.UploadPresigner); ok {
		var err error
		uploadURL, err = presigner.PresignPut(ctx, fileKey, req.ContentType, 15*time.Minute)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate upload url")
			return
		}
	}

	// Determine version and group ID
	var assetGroupID pgtype.UUID
	version := int32(1)
	if previousAssetUUID.Valid {
		prev, err := h.Queries.GetReviewAsset(ctx, previousAssetUUID)
		if err != nil || prev.IssueID != issue.ID || prev.WorkspaceID != issue.WorkspaceID {
			writeError(w, http.StatusBadRequest, "previous asset is not part of this issue")
			return
		}
		assetGroupID = prev.AssetGroupID
		version = prev.Version + 1
	} else {
		assetGroupID = util.MustParseUUID(uuid.New().String())
	}

	// Create pending asset
	asset, err := h.Queries.CreateReviewAsset(ctx, db.CreateReviewAssetParams{
		IssueID:      issueUUID,
		WorkspaceID:  issue.WorkspaceID,
		Name:         req.Filename,
		AssetType:    assetType,
		FileUrl:      fileKey, // Store key, we can resolve full URL on fetch
		Version:      version,
		UploadedBy:   requester.ID,
		AssetGroupID: assetGroupID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create asset record")
		return
	}
	if uploadURL == "" {
		uploadURL = strings.TrimSuffix(h.cfg.PublicURL, "/") + "/api/issues/" + uuidToString(issue.ID) + "/reviews/assets/direct-upload?asset_id=" + uuidToString(asset.ID)
	}

	writeJSON(w, http.StatusOK, PresignReviewAssetUploadResponse{
		UploadURL: uploadURL,
		Asset:     h.reviewAssetToResponse(asset),
	})
}

func (h *Handler) DirectUploadReviewAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workspaceID := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceID, "workspace not found")
	if !ok {
		return
	}
	assetID, ok := parseUUIDOrBadRequest(w, r.URL.Query().Get("asset_id"), "asset_id")
	if !ok {
		return
	}
	asset, _, ok := h.reviewAssetForIssue(w, r, assetID)
	if !ok {
		return
	}
	if asset.UploadedBy != requester.ID {
		writeError(w, http.StatusForbidden, "only the uploader can upload this asset")
		return
	}
	if h.Storage == nil {
		writeError(w, http.StatusServiceUnavailable, "storage not configured")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxReviewAssetUploadSize)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "upload is too large")
		return
	}
	if len(data) == 0 {
		writeError(w, http.StatusBadRequest, "upload is empty")
		return
	}
	contentType := strings.TrimSpace(r.Header.Get("Content-Type"))
	if _, err := h.Storage.Upload(ctx, asset.FileUrl, data, contentType, asset.Name); err != nil {
		writeError(w, http.StatusBadGateway, "failed to store upload")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CompleteReviewAssetUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}

	var req struct {
		AssetID string `json:"asset_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	assetUUID, ok := parseUUIDOrBadRequest(w, req.AssetID, "asset_id")
	if !ok {
		return
	}

	asset, _, ok := h.reviewAssetForIssue(w, r, assetUUID)
	if !ok {
		return
	}
	if !canManageReviewAsset(requester, asset) {
		writeError(w, http.StatusForbidden, "only the uploader or a workspace manager can complete this upload")
		return
	}
	asset, err := h.Queries.MarkReviewAssetUploadCompleted(ctx, assetUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to complete asset upload")
		return
	}

	if asset.AssetType == "video" || asset.AssetType == "audio" {
		// Run transcode in background
		go h.processVideoAsync(asset.ID, asset.FileUrl)
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// Comments endpoints

func (h *Handler) ListReviewComments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	assetUUID, ok := parseUUIDOrBadRequest(w, r.URL.Query().Get("asset_id"), "asset_id")
	if !ok {
		return
	}
	if _, _, ok := h.reviewAssetForIssue(w, r, assetUUID); !ok {
		return
	}

	comments, err := h.Queries.ListReviewCommentsByAsset(ctx, assetUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch comments")
		return
	}

	var res []ReviewCommentResponse
	for _, c := range comments {
		res = append(res, reviewCommentToResponse(c))
	}
	if res == nil {
		res = []ReviewCommentResponse{}
	}

	writeJSON(w, http.StatusOK, res)
}

type CreateReviewCommentRequest struct {
	AssetID   string          `json:"asset_id"`
	Content   string          `json:"content"`
	StartTime *float32        `json:"start_time"`
	EndTime   *float32        `json:"end_time"`
	Shapes    json.RawMessage `json:"shapes"`
	ParentID  *string         `json:"parent_id"`
	PageIndex int32           `json:"page_index"`
}

func (h *Handler) CreateReviewComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	userID := uuidToString(requester.UserID)

	var req CreateReviewCommentRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" || len(req.Content) > 5000 || req.PageIndex < 0 || !validReviewTimeRange(req.StartTime, req.EndTime) {
		writeError(w, http.StatusBadRequest, "content, timing, or page_index is invalid")
		return
	}
	if len(req.Shapes) > 0 && !json.Valid(req.Shapes) {
		writeError(w, http.StatusBadRequest, "shapes must be valid json")
		return
	}

	assetUUID, ok := parseUUIDOrBadRequest(w, req.AssetID, "asset_id")
	if !ok {
		return
	}
	asset, issue, ok := h.reviewAssetForIssue(w, r, assetUUID)
	if !ok {
		return
	}

	var parentUUID pgtype.UUID
	if req.ParentID != nil {
		parentUUID, ok = parseUUIDOrBadRequest(w, *req.ParentID, "parent_id")
		if !ok {
			return
		}
		parent, err := h.Queries.GetReviewComment(ctx, parentUUID)
		if err != nil || parent.AssetID != asset.ID {
			writeError(w, http.StatusBadRequest, "parent comment is not part of this review")
			return
		}
	}

	var shapes json.RawMessage
	if len(req.Shapes) > 0 {
		shapes = req.Shapes
	} else {
		shapes = json.RawMessage(`[]`)
	}

	var startTime, endTime pgtype.Float4
	if req.StartTime != nil {
		startTime = pgtype.Float4{Float32: *req.StartTime, Valid: true}
	}
	if req.EndTime != nil {
		endTime = pgtype.Float4{Float32: *req.EndTime, Valid: true}
	}

	comment, err := h.Queries.CreateReviewComment(ctx, db.CreateReviewCommentParams{
		AssetID:   assetUUID,
		AuthorID:  requester.ID,
		Content:   req.Content,
		StartTime: startTime,
		EndTime:   endTime,
		Shapes:    shapes,
		ParentID:  parentUUID,
		PageIndex: req.PageIndex,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create comment")
		return
	}

	resp := reviewCommentToResponse(comment)
	workspaceID := h.resolveWorkspaceID(r)
	if workspaceID != "" {
		h.publish(protocol.EventReviewCommentCreated, workspaceID, "member", userID, map[string]any{
			"comment":           resp,
			"issue_id":          util.UUIDToString(asset.IssueID),
			"issue_title":       issue.Title,
			"issue_status":      issue.Status,
			"asset_uploaded_by": util.UUIDToString(asset.UploadedBy),
		})

		// Create a standard comment so it shows up in the issue timeline
		content := fmt.Sprintf("**Review Comment on %s:**\n\n%s", asset.Name, req.Content)
		normalComment, err := h.Queries.CreateComment(ctx, db.CreateCommentParams{
			IssueID:         asset.IssueID,
			WorkspaceID:     asset.WorkspaceID,
			AuthorType:      "member",
			AuthorID:        requester.ID,
			Content:         content,
			Type:            "comment",
			ReviewAssetID:   asset.ID,
			ReviewCommentID: comment.ID,
			ReviewPageIndex: pgtype.Int4{Int32: comment.PageIndex, Valid: true},
			ReviewStartTime: comment.StartTime,
			ReviewEndTime:   comment.EndTime,
		})
		if err == nil {
			// Auto-subscribe mentioned member users and author to the issue
			for _, m := range util.ParseMentions(req.Content) {
				if m.Type == "member" {
					if memberUUID, err := util.ParseUUID(m.ID); err == nil {
						_ = h.Queries.AddIssueSubscriber(ctx, db.AddIssueSubscriberParams{
							IssueID:  asset.IssueID,
							UserType: "member",
							UserID:   memberUUID,
							Reason:   "mentioned",
						})
					}
				}
			}
			_ = h.Queries.AddIssueSubscriber(ctx, db.AddIssueSubscriberParams{
				IssueID:  asset.IssueID,
				UserType: "member",
				UserID:   requester.ID,
				Reason:   "commenter",
			})

			h.triggerTasksForComment(ctx, issue, normalComment, nil, "member", util.UUIDToString(requester.ID), userID, "", nil)
			h.publish(protocol.EventCommentCreated, workspaceID, "member", userID, map[string]any{
				"comment": commentToResponse(normalComment, nil, nil),
			})
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ListReviewAssets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	assets, err := h.Queries.ListReviewAssetsByIssue(ctx, issue.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list review assets")
		return
	}

	var res []ReviewAssetResponse
	for _, a := range assets {
		res = append(res, h.reviewAssetToResponse(a))
	}
	if res == nil {
		res = []ReviewAssetResponse{}
	}

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	writeJSON(w, http.StatusOK, res)
}

type UpdateReviewAssetStatusRequest struct {
	Status string `json:"status"` // pending, approved, changes_requested
}

func (h *Handler) UpdateReviewAssetStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	assetUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "assetId"), "assetId")
	if !ok {
		return
	}

	var req UpdateReviewAssetStatusRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	if req.Status != "pending" && req.Status != "approved" && req.Status != "changes_requested" {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}
	if _, _, ok := h.reviewAssetForIssue(w, r, assetUUID); !ok {
		return
	}

	asset, err := h.Queries.UpdateReviewAssetStatus(ctx, db.UpdateReviewAssetStatusParams{
		ID:     assetUUID,
		Status: req.Status,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update asset status")
		return
	}

	userID := uuidToString(requester.UserID)

	resp := h.reviewAssetToResponse(asset)
	workspaceID := h.resolveWorkspaceID(r)
	if workspaceID != "" {
		issue, _ := h.Queries.GetIssue(ctx, asset.IssueID)
		h.publish(protocol.EventReviewAssetUpdated, workspaceID, "member", userID, map[string]any{
			"asset":        resp,
			"issue_id":     util.UUIDToString(asset.IssueID),
			"issue_title":  issue.Title,
			"issue_status": issue.Status,
		})
	}

	writeJSON(w, http.StatusOK, resp)
}

type BulkApproveReviewAssetsRequest struct {
	IssueID string `json:"issue_id"`
}

func (h *Handler) BulkApproveReviewAssets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	var req BulkApproveReviewAssetsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if req.IssueID != "" && req.IssueID != uuidToString(issue.ID) {
		writeError(w, http.StatusBadRequest, "issue_id does not match request path")
		return
	}

	err := h.Queries.BulkApproveReviewAssets(ctx, issue.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to bulk approve assets")
		return
	}

	userID := uuidToString(requester.UserID)
	workspaceID := h.resolveWorkspaceID(r)
	if workspaceID != "" {
		// Empty payload will force clients to refetch
		h.publish(protocol.EventReviewAssetUpdated, workspaceID, "member", userID, map[string]any{
			"issue_id":     util.UUIDToString(issue.ID),
			"issue_title":  issue.Title,
			"issue_status": issue.Status,
		})
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (h *Handler) DownloadReviewAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	assetUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "assetId"), "assetId")
	if !ok {
		return
	}

	asset, err := h.Queries.GetReviewAsset(ctx, assetUUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "asset not found")
		return
	}

	workspaceIDStr := uuidToString(asset.WorkspaceID)
	member, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	checked := r.Clone(middleware.SetMemberContext(r.Context(), workspaceIDStr, member))
	checked.Header = r.Header.Clone()
	checked.Header.Set("X-Workspace-ID", workspaceIDStr)
	issue, ok := h.loadIssueForUser(w, checked, chi.URLParam(r, "id"))
	if !ok || issue.ID != asset.IssueID {
		if ok {
			writeError(w, http.StatusNotFound, "asset not found")
		}
		return
	}

	if h.Storage == nil {
		writeError(w, http.StatusServiceUnavailable, "storage not configured")
		return
	}

	// review_assets.file_url stores a bare S3 key (e.g. "reviews/<issueId>/<uuid>_file.jpg"),
	// NOT a full URL. Presign it directly.
	key := asset.FileUrl
	presigner, ok := h.Storage.(storage.Presigner)
	if !ok {
		writeError(w, http.StatusInternalServerError, "storage does not support presigned downloads")
		return
	}
	signedURL, err := presigner.PresignGet(ctx, key, h.attachmentDownloadURLTTL())
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to create download URL")
		return
	}
	http.Redirect(w, r, signedURL, http.StatusFound)
}

func (h *Handler) ResolveReviewComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	commentUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "commentId"), "commentId")
	if !ok {
		return
	}
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	userID := uuidToString(requester.UserID)
	if _, _, ok := h.reviewCommentForIssue(w, r, commentUUID); !ok {
		return
	}

	comment, err := h.Queries.ResolveReviewComment(ctx, db.ResolveReviewCommentParams{
		ID:         commentUUID,
		ResolvedBy: requester.ID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to resolve comment")
		return
	}

	resp := reviewCommentToResponse(comment)
	workspaceID := h.resolveWorkspaceID(r)
	if workspaceID != "" {
		h.publish(protocol.EventReviewCommentResolved, workspaceID, "member", userID, map[string]any{"comment": resp})
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) UnresolveReviewComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	commentUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "commentId"), "commentId")
	if !ok {
		return
	}
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	userID := uuidToString(requester.UserID)
	if _, _, ok := h.reviewCommentForIssue(w, r, commentUUID); !ok {
		return
	}

	comment, err := h.Queries.UnresolveReviewComment(ctx, commentUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to unresolve comment")
		return
	}

	resp := reviewCommentToResponse(comment)
	workspaceID := h.resolveWorkspaceID(r)
	if workspaceID != "" {
		h.publish(protocol.EventReviewCommentUnresolved, workspaceID, "member", userID, map[string]any{"comment": resp})
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ListPendingReviewIssueIDs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.requireWorkspaceMember(w, r, workspaceID, "workspace not found"); !ok {
		return
	}
	wsUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}

	issueUUIDs, err := h.Queries.ListPendingReviewIssueIDs(ctx, wsUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list pending review issue ids")
		return
	}

	res := make([]string, len(issueUUIDs))
	for i, id := range issueUUIDs {
		res[i] = util.UUIDToString(id)
	}

	writeJSON(w, http.StatusOK, res)
}

// DeleteReviewAsset deletes a single version by asset ID.
// Comments cascade via the FK constraint.
func (h *Handler) DeleteReviewAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	assetID := chi.URLParam(r, "assetId")
	assetUUID, ok := parseUUIDOrBadRequest(w, assetID, "assetId")
	if !ok {
		return
	}
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	asset, _, ok := h.reviewAssetForIssue(w, r, assetUUID)
	if !ok {
		return
	}
	if !canManageReviewAsset(requester, asset) {
		writeError(w, http.StatusForbidden, "only the uploader or a workspace manager can delete this asset")
		return
	}
	if err := h.Queries.DeleteReviewAsset(ctx, assetUUID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete review asset")
		return
	}
	if h.Storage != nil {
		h.Storage.DeleteKeys(ctx, []string{asset.FileUrl})
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteReviewAssetGroup deletes all versions in an asset group.
func (h *Handler) DeleteReviewAssetGroup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	groupID := chi.URLParam(r, "groupId")
	groupUUID, ok := parseUUIDOrBadRequest(w, groupID, "groupId")
	if !ok {
		return
	}
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}
	assets, err := h.Queries.ListReviewAssetVersions(ctx, groupUUID)
	if err != nil || len(assets) == 0 {
		writeError(w, http.StatusNotFound, "asset group not found")
		return
	}
	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	keys := make([]string, 0, len(assets))
	for _, asset := range assets {
		if asset.IssueID != issue.ID || asset.WorkspaceID != issue.WorkspaceID {
			writeError(w, http.StatusNotFound, "asset group not found")
			return
		}
		if !canManageReviewAsset(requester, asset) {
			writeError(w, http.StatusForbidden, "only uploaders or workspace managers can delete this asset group")
			return
		}
		keys = append(keys, asset.FileUrl)
	}
	if err := h.Queries.DeleteReviewAssetGroup(ctx, groupUUID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete review asset group")
		return
	}
	if h.Storage != nil {
		h.Storage.DeleteKeys(ctx, keys)
	}
	w.WriteHeader(http.StatusNoContent)
}

type UpdateReviewCommentRequest struct {
	Content   string          `json:"content"`
	StartTime *float32        `json:"start_time"`
	EndTime   *float32        `json:"end_time"`
	Shapes    json.RawMessage `json:"shapes"`
	PageIndex *int32          `json:"page_index"`
}

func (h *Handler) UpdateReviewComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	commentUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "commentId"), "commentId")
	if !ok {
		return
	}
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}

	var req UpdateReviewCommentRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" || len(req.Content) > 5000 || (req.PageIndex != nil && *req.PageIndex < 0) || !validReviewTimeRange(req.StartTime, req.EndTime) {
		writeError(w, http.StatusBadRequest, "content, timing, or page_index is invalid")
		return
	}
	if len(req.Shapes) > 0 && !json.Valid(req.Shapes) {
		writeError(w, http.StatusBadRequest, "shapes must be valid json")
		return
	}

	existing, _, ok := h.reviewCommentForIssue(w, r, commentUUID)
	if !ok {
		return
	}
	if existing.AuthorID != requester.ID {
		writeError(w, http.StatusForbidden, "only the author can edit this comment")
		return
	}

	var shapes []byte
	if len(req.Shapes) > 0 {
		shapes = req.Shapes
	} else {
		shapes = []byte("null")
	}

	var startTime, endTime pgtype.Float4
	if req.StartTime != nil {
		startTime = pgtype.Float4{Float32: *req.StartTime, Valid: true}
	}
	if req.EndTime != nil {
		endTime = pgtype.Float4{Float32: *req.EndTime, Valid: true}
	}

	updated, err := h.Queries.UpdateReviewComment(ctx, db.UpdateReviewCommentParams{
		ID:        commentUUID,
		Content:   req.Content,
		Shapes:    shapes,
		StartTime: startTime,
		EndTime:   endTime,
		PageIndex: func() pgtype.Int4 {
			if req.PageIndex == nil {
				return pgtype.Int4{}
			}
			return pgtype.Int4{Int32: *req.PageIndex, Valid: true}
		}(),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update comment")
		return
	}

	resp := reviewCommentToResponse(updated)
	// Optionally publish an event
	writeJSON(w, http.StatusOK, resp)
}

type GuestReviewResponse struct {
	Asset    ReviewAssetResponse     `json:"asset"`
	Comments []ReviewCommentResponse `json:"comments"`
}

func guestReviewTokenHash(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

// CreateGuestReviewLink creates a new opaque link and rotates any existing
// link for the asset. Only the hash is persisted, so a database read cannot
// recover a usable guest URL.
func (h *Handler) CreateGuestReviewLink(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	workspaceID := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceID, "workspace not found")
	if !ok {
		return
	}
	assetID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "assetId"), "assetId")
	if !ok {
		return
	}
	asset, _, ok := h.reviewAssetForIssue(w, r, assetID)
	if !ok {
		return
	}
	if !canManageReviewAsset(requester, asset) {
		writeError(w, http.StatusForbidden, "only the uploader or a workspace manager can share this asset")
		return
	}

	raw := make([]byte, 32)
	if _, err := cryptorand.Read(raw); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create guest link")
		return
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	if _, err := h.Queries.UpsertGuestReviewLink(ctx, db.UpsertGuestReviewLinkParams{
		AssetID: assetID, TokenHash: guestReviewTokenHash(token), CreatedBy: requester.ID,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create guest link")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"token": token})
}

func (h *Handler) guestReviewAsset(w http.ResponseWriter, r *http.Request) (db.ReviewAsset, bool) {
	token := chi.URLParam(r, "token")
	if len(token) < 32 || len(token) > 128 {
		writeError(w, http.StatusNotFound, "guest review not found")
		return db.ReviewAsset{}, false
	}
	assetID, err := h.Queries.GetGuestReviewAssetIDByTokenHash(r.Context(), guestReviewTokenHash(token))
	if err != nil {
		writeError(w, http.StatusNotFound, "guest review not found")
		return db.ReviewAsset{}, false
	}
	asset, err := h.Queries.GetReviewAsset(r.Context(), assetID)
	if err != nil {
		writeError(w, http.StatusNotFound, "guest review not found")
		return db.ReviewAsset{}, false
	}
	return asset, true
}

func (h *Handler) GetGuestReview(w http.ResponseWriter, r *http.Request) {
	asset, ok := h.guestReviewAsset(w, r)
	if !ok {
		return
	}
	comments, err := h.Queries.ListReviewCommentsByAsset(r.Context(), asset.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch guest review")
		return
	}
	res := GuestReviewResponse{Asset: h.reviewAssetToResponse(asset), Comments: make([]ReviewCommentResponse, 0, len(comments))}
	for _, comment := range comments {
		res.Comments = append(res.Comments, reviewCommentToResponse(comment))
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, res)
}

type CreateGuestReviewCommentRequest struct {
	GuestName string          `json:"guest_name"`
	Content   string          `json:"content"`
	StartTime *float32        `json:"start_time"`
	EndTime   *float32        `json:"end_time"`
	Shapes    json.RawMessage `json:"shapes"`
	ParentID  *string         `json:"parent_id"`
	PageIndex int32           `json:"page_index"`
}

func (h *Handler) CreateGuestReviewComment(w http.ResponseWriter, r *http.Request) {
	asset, ok := h.guestReviewAsset(w, r)
	if !ok {
		return
	}
	var req CreateGuestReviewCommentRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.GuestName = strings.TrimSpace(req.GuestName)
	req.Content = strings.TrimSpace(req.Content)
	if req.GuestName == "" || len(req.GuestName) > 80 || req.Content == "" || len(req.Content) > 5000 || req.PageIndex < 0 || !validReviewTimeRange(req.StartTime, req.EndTime) {
		writeError(w, http.StatusBadRequest, "guest_name, content, or page_index is invalid")
		return
	}
	var parentID pgtype.UUID
	if req.ParentID != nil {
		parsed, ok := parseUUIDOrBadRequest(w, *req.ParentID, "parent_id")
		if !ok {
			return
		}
		parent, err := h.Queries.GetReviewComment(r.Context(), parsed)
		if err != nil || parent.AssetID != asset.ID {
			writeError(w, http.StatusBadRequest, "parent comment is not part of this review")
			return
		}
		parentID = parsed
	}
	shapes := []byte(`[]`)
	if len(req.Shapes) > 0 {
		if !json.Valid(req.Shapes) {
			writeError(w, http.StatusBadRequest, "shapes must be valid json")
			return
		}
		shapes = req.Shapes
	}
	var startTime, endTime pgtype.Float4
	if req.StartTime != nil {
		startTime = pgtype.Float4{Float32: *req.StartTime, Valid: true}
	}
	if req.EndTime != nil {
		endTime = pgtype.Float4{Float32: *req.EndTime, Valid: true}
	}
	comment, err := h.Queries.CreateGuestReviewComment(r.Context(), db.CreateGuestReviewCommentParams{
		AssetID: asset.ID, GuestName: pgtype.Text{String: req.GuestName, Valid: true}, Content: req.Content,
		StartTime: startTime, EndTime: endTime, Shapes: shapes, ParentID: parentID, PageIndex: req.PageIndex,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create comment")
		return
	}
	writeJSON(w, http.StatusCreated, reviewCommentToResponse(comment))
}

func (h *Handler) UpdateGuestReviewStatus(w http.ResponseWriter, r *http.Request) {
	asset, ok := h.guestReviewAsset(w, r)
	if !ok {
		return
	}
	var req UpdateReviewAssetStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Status != "pending" && req.Status != "approved" && req.Status != "changes_requested" {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	updated, err := h.Queries.UpdateReviewAssetStatus(r.Context(), db.UpdateReviewAssetStatusParams{
		ID:     asset.ID,
		Status: req.Status,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update status")
		return
	}

	h.publish(protocol.EventReviewAssetUpdated, asset.WorkspaceID.String(), "system", "", h.reviewAssetToResponse(updated))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteReviewComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	commentUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "commentId"), "commentId")
	if !ok {
		return
	}
	workspaceIDStr := h.resolveWorkspaceID(r)
	requester, ok := h.requireWorkspaceMember(w, r, workspaceIDStr, "workspace not found")
	if !ok {
		return
	}

	existing, _, ok := h.reviewCommentForIssue(w, r, commentUUID)
	if !ok {
		return
	}
	if existing.AuthorID != requester.ID {
		writeError(w, http.StatusForbidden, "only the author can delete this comment")
		return
	}

	if err := h.Queries.DeleteReviewComment(ctx, commentUUID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete comment")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
