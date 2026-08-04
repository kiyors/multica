package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestApprovalDecisionOnlyAllowsDesignatedApprover(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}

	issueID := createIssueForTimeline(t, "Approval permission boundary")
	approverUserID := createProjectPermissionTestMember(t, "member")

	create := httptest.NewRecorder()
	createReq := withURLParam(newRequest(http.MethodPost, "/api/issues/"+issueID+"/approvals", map[string]any{
		"approver_type": "member",
		"approver_id":   approverUserID,
	}), "id", issueID)
	testHandler.CreateApproval(create, createReq)
	if create.Code != http.StatusCreated {
		t.Fatalf("create approval: expected 201, got %d: %s", create.Code, create.Body.String())
	}
	var approval ApprovalResponse
	if err := json.NewDecoder(create.Body).Decode(&approval); err != nil {
		t.Fatalf("decode approval: %v", err)
	}
	t.Cleanup(func() {
		_, _ = testPool.Exec(context.Background(), `DELETE FROM approvals WHERE id = $1`, approval.ID)
	})

	unauthorized := httptest.NewRecorder()
	unauthorizedReq := withURLParam(newRequest(http.MethodPatch, "/api/approvals/"+approval.ID+"/approve", map[string]any{}), "approvalId", approval.ID)
	testHandler.ApproveApproval(unauthorized, unauthorizedReq)
	if unauthorized.Code != http.StatusForbidden {
		t.Fatalf("non-approver decision: expected 403, got %d: %s", unauthorized.Code, unauthorized.Body.String())
	}

	authorized := httptest.NewRecorder()
	authorizedReq := withURLParam(newRequestAs(approverUserID, http.MethodPatch, "/api/approvals/"+approval.ID+"/approve", map[string]any{
		"comment": "Reviewed and approved",
	}), "approvalId", approval.ID)
	testHandler.ApproveApproval(authorized, authorizedReq)
	if authorized.Code != http.StatusOK {
		t.Fatalf("designated approver decision: expected 200, got %d: %s", authorized.Code, authorized.Body.String())
	}
}

func TestCreateApprovalRejectsMalformedOrForeignApprover(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	issueID := createIssueForTimeline(t, "Approval request validation")

	for name, body := range map[string]any{
		"unknown actor type": map[string]any{"approver_type": "guest", "approver_id": testUserID},
		"malformed id":       map[string]any{"approver_type": "member", "approver_id": "not-a-uuid"},
	} {
		t.Run(name, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := withURLParam(newRequest(http.MethodPost, "/api/issues/"+issueID+"/approvals", body), "id", issueID)
			testHandler.CreateApproval(w, req)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}
