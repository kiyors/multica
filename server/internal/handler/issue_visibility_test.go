package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	"multica/server/internal/db"
)

func TestListIssues_ProjectMemberVisibility(t *testing.T) {
	t.Parallel()
	ws, admin, _ := setupWorkspace(t)
	// Create a project
	proj := createProject(t, ws.ID, admin.ID, "Test Project")

	// Create a non-admin member
	member := createMember(t, ws.ID, "member")

	// Add member to project
	_, err := testQueries.AddProjectMember(context.Background(), db.AddProjectMemberParams{
		ProjectID: proj.ID,
		MemberID:  member.ID,
		Role:      "viewer",
	})
	if err != nil {
		t.Fatalf("failed to add member to project: %v", err)
	}

	// Create an unassigned issue in the project
	_, err = testQueries.CreateIssue(context.Background(), db.CreateIssueParams{
		WorkspaceID: ws.ID,
		ProjectID:   proj.ID,
		Title:       "Unassigned issue",
		CreatorType: "member",
		CreatorID:   admin.ID,
		Status:      "todo",
	})
	if err != nil {
		t.Fatalf("failed to create issue: %v", err)
	}

	// Create an issue assigned to the admin in the project
	_, err = testQueries.CreateIssue(context.Background(), db.CreateIssueParams{
		WorkspaceID: ws.ID,
		ProjectID:   proj.ID,
		Title:       "Admin issue",
		CreatorType: "member",
		CreatorID:   admin.ID,
		Status:      "todo",
		AssigneeType: pgtype.Text{String: "member", Valid: true},
		AssigneeID:   admin.ID,
	})
	if err != nil {
		t.Fatalf("failed to create issue: %v", err)
	}

	// Request issues as the non-admin member
	token, _ := createTestToken(t, member.ID)
	req := newRequest("GET", fmt.Sprintf("/api/workspaces/%s/issues?project_id=%s", uuidToString(ws.ID), uuidToString(proj.ID)), nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := executeRequest(req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Issues []IssueResponse `json:"issues"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if len(resp.Issues) != 2 {
		t.Fatalf("expected 2 issues, got %d", len(resp.Issues))
	}
}
