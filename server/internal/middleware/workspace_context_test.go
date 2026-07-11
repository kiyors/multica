package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	db "github.com/kiyors/multica/server/pkg/db/generated"
)

const testCtxSlug = "middleware-ws-context-test"

// TestRequireWorkspaceMemberStashesWorkspace pins the contract that the slug
// path of the workspace middleware resolves workspace + membership in one
// query and exposes the full workspace row via WorkspaceFromContext, so
// downstream handlers (getIssuePrefix) don't re-fetch the workspace.
func TestRequireWorkspaceMemberStashesWorkspace(t *testing.T) {
	pool := openPool(t)
	defer pool.Close()
	ctx := context.Background()
	queries := db.New(pool)

	// Fixture: user + workspace + member.
	_, _ = pool.Exec(ctx, `DELETE FROM workspace WHERE slug = $1`, testCtxSlug)
	_, _ = pool.Exec(ctx, `DELETE FROM "user" WHERE email = $1`, "ws-ctx-test@multica.ai")

	var userID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO "user" (name, email) VALUES ('WS Ctx Test', 'ws-ctx-test@multica.ai') RETURNING id`,
	).Scan(&userID); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	var wsID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO workspace (name, slug, description, issue_prefix) VALUES ('WS Ctx Test', $1, '', 'WCT') RETURNING id`,
		testCtxSlug,
	).Scan(&wsID); err != nil {
		t.Fatalf("insert workspace: %v", err)
	}
	if _, err := pool.Exec(ctx,
		`INSERT INTO member (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
		wsID, userID,
	); err != nil {
		t.Fatalf("insert member: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM workspace WHERE slug = $1`, testCtxSlug)
		_, _ = pool.Exec(ctx, `DELETE FROM "user" WHERE id = $1::uuid`, userID)
	})

	newReq := func() *http.Request {
		req := httptest.NewRequest(http.MethodGet, "/api/issues", nil)
		req.Header.Set("X-User-ID", userID)
		req.Header.Set("X-Workspace-Slug", testCtxSlug)
		return req
	}

	t.Run("member: workspace and member land in context", func(t *testing.T) {
		var gotWs db.Workspace
		var gotWsOk bool
		var gotMember db.Member
		var gotMemberOk bool
		probe := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotWs, gotWsOk = WorkspaceFromContext(r.Context())
			gotMember, gotMemberOk = MemberFromContext(r.Context())
			w.WriteHeader(http.StatusOK)
		})
		rec := httptest.NewRecorder()
		RequireWorkspaceMember(queries)(probe).ServeHTTP(rec, newReq())

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body %s)", rec.Code, rec.Body.String())
		}
		if !gotWsOk {
			t.Fatal("WorkspaceFromContext: workspace not in context")
		}
		if got := gotWs.Slug; got != testCtxSlug {
			t.Errorf("workspace slug = %q, want %q", got, testCtxSlug)
		}
		if got := gotWs.IssuePrefix; got != "WCT" {
			t.Errorf("workspace issue_prefix = %q, want WCT", got)
		}
		if !gotMemberOk {
			t.Fatal("MemberFromContext: member not in context")
		}
		if gotMember.Role != "owner" {
			t.Errorf("member role = %q, want owner", gotMember.Role)
		}
		if WorkspaceIDFromContext(context.Background()) != "" {
			t.Error("WorkspaceIDFromContext on empty context should be empty")
		}
	})

	t.Run("role gate still enforced", func(t *testing.T) {
		rec := httptest.NewRecorder()
		RequireWorkspaceRole(queries, "admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("handler should not run for insufficient role")
		})).ServeHTTP(rec, newReq())
		if rec.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", rec.Code)
		}
	})

	t.Run("non-member gets 404, matching pre-change behavior", func(t *testing.T) {
		var strangerID string
		if err := pool.QueryRow(ctx,
			`INSERT INTO "user" (name, email) VALUES ('WS Ctx Stranger', 'ws-ctx-stranger@multica.ai') RETURNING id`,
		).Scan(&strangerID); err != nil {
			t.Fatalf("insert stranger: %v", err)
		}
		t.Cleanup(func() {
			_, _ = pool.Exec(ctx, `DELETE FROM "user" WHERE id = $1::uuid`, strangerID)
		})
		req := newReq()
		req.Header.Set("X-User-ID", strangerID)
		rec := httptest.NewRecorder()
		RequireWorkspaceMember(queries)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("handler should not run for non-member")
		})).ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
	})

	t.Run("unknown slug gets 404", func(t *testing.T) {
		req := newReq()
		req.Header.Set("X-Workspace-Slug", "no-such-slug-ws-ctx")
		rec := httptest.NewRecorder()
		RequireWorkspaceMember(queries)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("handler should not run for unknown slug")
		})).ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
	})
}
