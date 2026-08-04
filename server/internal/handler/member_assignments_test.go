package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
)

func memberAssignmentsRequest(userID, method, memberID string, body any) *http.Request {
	req := newRequestAs(userID, method, "/api/workspaces/"+testWorkspaceID+"/members/"+memberID+"/assignments", body)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", testWorkspaceID)
	rctx.URLParams.Add("memberId", memberID)
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
}

func TestReconcileMemberAssignmentsReplacesProjectsAndSquadsAtomically(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}

	ctx := context.Background()
	targetUserID := createProjectPermissionTestMember(t, "member")
	var targetMemberID string
	if err := testPool.QueryRow(ctx,
		"SELECT id FROM member WHERE workspace_id = $1 AND user_id = $2",
		testWorkspaceID,
		targetUserID,
	).Scan(&targetMemberID); err != nil {
		t.Fatalf("load target member: %v", err)
	}

	oldProject := createProjectPermissionTestProject(t, "assignment reconcile old project")
	newProject := createProjectPermissionTestProject(t, "assignment reconcile new project")

	var leaderID string
	if err := testPool.QueryRow(ctx,
		"SELECT id FROM agent WHERE workspace_id = $1 LIMIT 1",
		testWorkspaceID,
	).Scan(&leaderID); err != nil {
		t.Fatalf("load squad leader: %v", err)
	}
	suffix := time.Now().UnixNano()
	var oldSquadID, newSquadID string
	for name, destination := range map[string]*string{
		fmt.Sprintf("assignment-old-%d", suffix): &oldSquadID,
		fmt.Sprintf("assignment-new-%d", suffix): &newSquadID,
	} {
		if err := testPool.QueryRow(ctx, `
			INSERT INTO squad (workspace_id, name, description, leader_id, creator_id)
			VALUES ($1, $2, '', $3, $4)
			RETURNING id
		`, testWorkspaceID, name, leaderID, testUserID).Scan(destination); err != nil {
			t.Fatalf("create squad: %v", err)
		}
	}
	t.Cleanup(func() {
		_, _ = testPool.Exec(context.Background(),
			"DELETE FROM squad_member WHERE squad_id IN ($1, $2)", oldSquadID, newSquadID)
		_, _ = testPool.Exec(context.Background(),
			"DELETE FROM squad WHERE id IN ($1, $2)", oldSquadID, newSquadID)
	})

	if _, err := testPool.Exec(ctx, `
		INSERT INTO project_member (project_id, member_id, role, invited_by)
		VALUES ($1, $2, 'viewer', $3)
	`, oldProject.ID, targetMemberID, targetMemberID); err != nil {
		t.Fatalf("seed project assignment: %v", err)
	}
	if _, err := testPool.Exec(ctx, `
		INSERT INTO squad_member (squad_id, member_type, member_id, role)
		VALUES ($1, 'member', $2, 'member')
	`, oldSquadID, targetUserID); err != nil {
		t.Fatalf("seed squad assignment: %v", err)
	}

	w := httptest.NewRecorder()
	req := memberAssignmentsRequest(testUserID, http.MethodPut, targetMemberID, map[string]any{
		"project_ids": []string{newProject.ID},
		"squad_ids":   []string{newSquadID},
	})
	testHandler.ReconcileMemberAssignments(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("reconcile assignments: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var response MemberAssignmentsResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("decode assignments: %v", err)
	}
	if len(response.ProjectIDs) != 1 || response.ProjectIDs[0] != newProject.ID {
		t.Fatalf("unexpected project assignments: %#v", response.ProjectIDs)
	}
	if len(response.SquadIDs) != 1 || response.SquadIDs[0] != newSquadID {
		t.Fatalf("unexpected squad assignments: %#v", response.SquadIDs)
	}

	var oldProjectExists, newProjectExists, oldSquadExists, newSquadExists bool
	checks := []struct {
		query string
		args  []any
		dest  *bool
	}{
		{"SELECT EXISTS(SELECT 1 FROM project_member WHERE project_id = $1 AND member_id = $2)", []any{oldProject.ID, targetMemberID}, &oldProjectExists},
		{"SELECT EXISTS(SELECT 1 FROM project_member WHERE project_id = $1 AND member_id = $2)", []any{newProject.ID, targetMemberID}, &newProjectExists},
		{"SELECT EXISTS(SELECT 1 FROM squad_member WHERE squad_id = $1 AND member_type = 'member' AND member_id = $2)", []any{oldSquadID, targetUserID}, &oldSquadExists},
		{"SELECT EXISTS(SELECT 1 FROM squad_member WHERE squad_id = $1 AND member_type = 'member' AND member_id = $2)", []any{newSquadID, targetUserID}, &newSquadExists},
	}
	for _, check := range checks {
		if err := testPool.QueryRow(ctx, check.query, check.args...).Scan(check.dest); err != nil {
			t.Fatalf("verify assignment: %v", err)
		}
	}
	if oldProjectExists || oldSquadExists || !newProjectExists || !newSquadExists {
		t.Fatalf("reconcile mismatch: oldProject=%v newProject=%v oldSquad=%v newSquad=%v", oldProjectExists, newProjectExists, oldSquadExists, newSquadExists)
	}
}

func TestReconcileMemberAssignmentsRejectsPlainMembers(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}

	targetUserID := createProjectPermissionTestMember(t, "member")
	var targetMemberID string
	if err := testPool.QueryRow(context.Background(),
		"SELECT id FROM member WHERE workspace_id = $1 AND user_id = $2",
		testWorkspaceID,
		targetUserID,
	).Scan(&targetMemberID); err != nil {
		t.Fatalf("load target member: %v", err)
	}

	w := httptest.NewRecorder()
	req := memberAssignmentsRequest(targetUserID, http.MethodPut, targetMemberID, map[string]any{
		"project_ids": []string{},
		"squad_ids":   []string{},
	})
	testHandler.ReconcileMemberAssignments(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for plain member, got %d: %s", w.Code, w.Body.String())
	}
}
