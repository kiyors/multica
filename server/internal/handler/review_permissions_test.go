package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func reviewRequest(userID, method, path, issueID string, body any, params map[string]string) *http.Request {
	req := newRequestAs(userID, method, path, body)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID)
	for key, value := range params {
		rctx.URLParams.Add(key, value)
	}
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
}

func seedCompletedReviewAsset(t *testing.T, issueID, uploadedByUserID string) string {
	t.Helper()
	var memberID, assetID string
	if err := testPool.QueryRow(context.Background(), `
		SELECT id FROM member WHERE workspace_id = $1 AND user_id = $2
	`, testWorkspaceID, uploadedByUserID).Scan(&memberID); err != nil {
		t.Fatalf("load uploader member: %v", err)
	}
	if err := testPool.QueryRow(context.Background(), `
		INSERT INTO review_assets (
			issue_id, workspace_id, name, asset_type, file_url, uploaded_by, upload_completed_at
		) VALUES ($1, $2, 'permission.png', 'image', 'reviews/permission.png', $3, now())
		RETURNING id
	`, issueID, testWorkspaceID, memberID).Scan(&assetID); err != nil {
		t.Fatalf("seed review asset: %v", err)
	}
	t.Cleanup(func() {
		_, _ = testPool.Exec(context.Background(), `DELETE FROM review_comments WHERE asset_id = $1`, assetID)
		_, _ = testPool.Exec(context.Background(), `DELETE FROM review_assets WHERE id = $1`, assetID)
	})
	return assetID
}

func TestReviewAssetMutationEnforcesPathAndManagerBoundary(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	issueID := createIssueForTimeline(t, "Review permissions")
	otherIssueID := createIssueForTimeline(t, "Other review path")
	assetID := seedCompletedReviewAsset(t, issueID, testUserID)
	plainUserID := createProjectPermissionTestMember(t, "member")

	wrongPath := httptest.NewRecorder()
	wrongPathReq := reviewRequest(testUserID, http.MethodPatch, "/api/issues/"+otherIssueID+"/reviews/assets/"+assetID+"/status", otherIssueID, map[string]any{
		"status": "approved",
	}, map[string]string{"assetId": assetID})
	testHandler.UpdateReviewAssetStatus(wrongPath, wrongPathReq)
	if wrongPath.Code != http.StatusNotFound {
		t.Fatalf("wrong issue path: expected 404, got %d: %s", wrongPath.Code, wrongPath.Body.String())
	}

	deleteAttempt := httptest.NewRecorder()
	deleteReq := reviewRequest(plainUserID, http.MethodDelete, "/api/issues/"+issueID+"/reviews/assets/"+assetID, issueID, nil, map[string]string{"assetId": assetID})
	testHandler.DeleteReviewAsset(deleteAttempt, deleteReq)
	if deleteAttempt.Code != http.StatusForbidden {
		t.Fatalf("non-uploader delete: expected 403, got %d: %s", deleteAttempt.Code, deleteAttempt.Body.String())
	}

	shareAttempt := httptest.NewRecorder()
	shareReq := reviewRequest(plainUserID, http.MethodPost, "/api/issues/"+issueID+"/reviews/assets/"+assetID+"/guest-link", issueID, nil, map[string]string{"assetId": assetID})
	testHandler.CreateGuestReviewLink(shareAttempt, shareReq)
	if shareAttempt.Code != http.StatusForbidden {
		t.Fatalf("non-uploader share: expected 403, got %d: %s", shareAttempt.Code, shareAttempt.Body.String())
	}
}

func TestReviewCommentAuthorCanEditButOtherMemberCannot(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	issueID := createIssueForTimeline(t, "Review comment identity")
	authorUserID := createProjectPermissionTestMember(t, "member")
	assetID := seedCompletedReviewAsset(t, issueID, testUserID)
	var authorMemberID, commentID string
	if err := testPool.QueryRow(context.Background(), `SELECT id FROM member WHERE workspace_id = $1 AND user_id = $2`, testWorkspaceID, authorUserID).Scan(&authorMemberID); err != nil {
		t.Fatalf("load author member: %v", err)
	}
	if err := testPool.QueryRow(context.Background(), `
		INSERT INTO review_comments (asset_id, author_id, content) VALUES ($1, $2, 'original') RETURNING id
	`, assetID, authorMemberID).Scan(&commentID); err != nil {
		t.Fatalf("seed review comment: %v", err)
	}

	ownerEdit := httptest.NewRecorder()
	ownerReq := reviewRequest(testUserID, http.MethodPatch, "/api/issues/"+issueID+"/reviews/comments/"+commentID, issueID, map[string]any{
		"content": "not mine",
	}, map[string]string{"commentId": commentID})
	testHandler.UpdateReviewComment(ownerEdit, ownerReq)
	if ownerEdit.Code != http.StatusForbidden {
		t.Fatalf("non-author edit: expected 403, got %d: %s", ownerEdit.Code, ownerEdit.Body.String())
	}

	authorEdit := httptest.NewRecorder()
	authorReq := reviewRequest(authorUserID, http.MethodPatch, "/api/issues/"+issueID+"/reviews/comments/"+commentID, issueID, map[string]any{
		"content": "updated by author",
	}, map[string]string{"commentId": commentID})
	testHandler.UpdateReviewComment(authorEdit, authorReq)
	if authorEdit.Code != http.StatusOK {
		t.Fatalf("author edit: expected 200, got %d: %s", authorEdit.Code, authorEdit.Body.String())
	}
}

func TestGuestReviewTokenAllowsBoundReviewAndRejectsMalformedComment(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	issueID := createIssueForTimeline(t, "Guest review contract")
	assetID := seedCompletedReviewAsset(t, issueID, testUserID)

	share := httptest.NewRecorder()
	shareReq := reviewRequest(testUserID, http.MethodPost, "/api/issues/"+issueID+"/reviews/assets/"+assetID+"/guest-link", issueID, nil, map[string]string{"assetId": assetID})
	testHandler.CreateGuestReviewLink(share, shareReq)
	if share.Code != http.StatusCreated {
		t.Fatalf("create guest link: expected 201, got %d: %s", share.Code, share.Body.String())
	}
	var payload map[string]string
	if err := json.NewDecoder(share.Body).Decode(&payload); err != nil {
		t.Fatalf("decode guest link: %v", err)
	}
	token := payload["token"]
	if token == "" {
		t.Fatal("guest link response omitted token")
	}
	t.Cleanup(func() {
		_, _ = testPool.Exec(context.Background(), `DELETE FROM guest_review_link WHERE asset_id = $1`, assetID)
	})

	get := httptest.NewRecorder()
	getReq := withURLParam(newRequest(http.MethodGet, "/api/guest/reviews/"+token, nil), "token", token)
	testHandler.GetGuestReview(get, getReq)
	if get.Code != http.StatusOK {
		t.Fatalf("get guest review: expected 200, got %d: %s", get.Code, get.Body.String())
	}

	malformed := httptest.NewRecorder()
	malformedReq := withURLParam(newRequest(http.MethodPost, "/api/guest/reviews/"+token+"/comments", map[string]any{
		"guest_name": "Guest",
		"content":    "",
		"page_index": -1,
	}), "token", token)
	testHandler.CreateGuestReviewComment(malformed, malformedReq)
	if malformed.Code != http.StatusBadRequest {
		t.Fatalf("malformed guest comment: expected 400, got %d: %s", malformed.Code, malformed.Body.String())
	}

	invalid := httptest.NewRecorder()
	invalidReq := withURLParam(newRequest(http.MethodGet, "/api/guest/reviews/not-a-token", nil), "token", "not-a-token")
	testHandler.GetGuestReview(invalid, invalidReq)
	if invalid.Code != http.StatusNotFound {
		t.Fatalf("invalid guest token: expected 404, got %d: %s", invalid.Code, invalid.Body.String())
	}
}
