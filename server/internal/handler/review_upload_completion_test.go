package handler

import (
	"context"
	"testing"
	"time"
)

func TestReviewAssetsStayHiddenUntilUploadCompletes(t *testing.T) {
	issueID := createIssueForTimeline(t, "Incomplete review upload")
	ctx := context.Background()
	var memberID, assetID string
	if err := testPool.QueryRow(ctx, `SELECT id FROM member WHERE workspace_id = $1 AND user_id = $2`, testWorkspaceID, testUserID).Scan(&memberID); err != nil {
		t.Fatalf("member id: %v", err)
	}
	if err := testPool.QueryRow(ctx, `
		INSERT INTO review_assets (issue_id, workspace_id, name, asset_type, file_url, uploaded_by)
		VALUES ($1, $2, 'pending.png', 'image', 'reviews/pending.png', $3)
		RETURNING id
	`, issueID, testWorkspaceID, memberID).Scan(&assetID); err != nil {
		t.Fatalf("insert incomplete asset: %v", err)
	}
	issueUUID := parseUUID(issueID)
	assets, err := testHandler.Queries.ListReviewAssetsByIssue(ctx, issueUUID)
	if err != nil {
		t.Fatalf("list incomplete assets: %v", err)
	}
	if len(assets) != 0 {
		t.Fatalf("incomplete asset was visible: %+v", assets)
	}
	if _, err := testHandler.Queries.MarkReviewAssetUploadCompleted(ctx, parseUUID(assetID)); err != nil {
		t.Fatalf("mark complete: %v", err)
	}
	assets, err = testHandler.Queries.ListReviewAssetsByIssue(ctx, issueUUID)
	if err != nil || len(assets) != 1 {
		t.Fatalf("completed asset not visible: len=%d err=%v", len(assets), err)
	}
}

func TestDeleteStaleIncompleteReviewAssetsReturnsStorageKeys(t *testing.T) {
	issueID := createIssueForTimeline(t, "Stale review upload")
	ctx := context.Background()
	var memberID string
	if err := testPool.QueryRow(ctx, `SELECT id FROM member WHERE workspace_id = $1 AND user_id = $2`, testWorkspaceID, testUserID).Scan(&memberID); err != nil {
		t.Fatalf("member id: %v", err)
	}
	if _, err := testPool.Exec(ctx, `
		INSERT INTO review_assets (issue_id, workspace_id, name, asset_type, file_url, uploaded_by, created_at)
		VALUES ($1, $2, 'stale.png', 'image', 'reviews/stale.png', $3, $4)
	`, issueID, testWorkspaceID, memberID, time.Now().Add(-25*time.Hour)); err != nil {
		t.Fatalf("insert stale asset: %v", err)
	}
	keys, err := testHandler.Queries.DeleteStaleIncompleteReviewAssets(ctx)
	if err != nil {
		t.Fatalf("delete stale assets: %v", err)
	}
	if len(keys) != 1 || keys[0] != "reviews/stale.png" {
		t.Fatalf("deleted keys = %v, want reviews/stale.png", keys)
	}
}
