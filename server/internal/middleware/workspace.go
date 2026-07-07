package middleware

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/multica-ai/multica/server/internal/util"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

// Context keys for workspace-scoped request data.
type contextKey int

const (
	ctxKeyWorkspaceID contextKey = iota
	ctxKeyMember
	ctxKeyWorkspace
)

// MemberFromContext returns the workspace member injected by the workspace middleware.
func MemberFromContext(ctx context.Context) (db.Member, bool) {
	m, ok := ctx.Value(ctxKeyMember).(db.Member)
	return m, ok
}

// WorkspaceFromContext returns the full workspace row injected by the
// workspace middleware's slug path. Handlers should prefer this over
// re-fetching the workspace by ID — it saves a DB round trip on every
// request that came through slug resolution (all web/desktop traffic).
// Not populated on UUID-resolved requests (CLI/daemon compat paths).
func WorkspaceFromContext(ctx context.Context) (db.Workspace, bool) {
	w, ok := ctx.Value(ctxKeyWorkspace).(db.Workspace)
	return w, ok
}

// WorkspaceIDFromContext returns the workspace ID injected by the workspace middleware.
func WorkspaceIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(ctxKeyWorkspaceID).(string)
	return id
}

// SetMemberContext injects workspace ID and member into the context.
// This is useful for handlers that resolve the workspace from an entity lookup
// and want to share the member with downstream code.
func SetMemberContext(ctx context.Context, workspaceID string, member db.Member) context.Context {
	ctx = context.WithValue(ctx, ctxKeyWorkspaceID, workspaceID)
	ctx = context.WithValue(ctx, ctxKeyMember, member)
	return ctx
}

// errWorkspaceNotFound is returned when a slug was provided but doesn't match
// any workspace. This lets the middleware distinguish "no identifier provided"
// (400) from "identifier provided but invalid" (404).
var errWorkspaceNotFound = errors.New("workspace not found")

// ResolveWorkspaceIDFromRequest returns the workspace UUID for an HTTP
// request using the same priority order as the workspace middleware. This is
// the single source of truth for "which workspace is this request targeting?",
// shared by middleware-protected routes (via context fast path) and
// middleware-less routes (e.g. /api/upload-file) that must resolve the slug
// themselves.
//
// Priority:
//  1. task-token binding (X-Actor-Source == "task_token") — authoritative,
//     server-set, cannot be re-negotiated by the client (MUL-2600)
//  2. middleware-injected context (fast path for middleware-protected routes)
//  3. X-Workspace-Slug header → GetWorkspaceBySlug → UUID (post-refactor frontend)
//  4. ?workspace_slug query → GetWorkspaceBySlug → UUID
//  5. X-Workspace-ID header (CLI/daemon compat)
//  6. ?workspace_id query (CLI/daemon compat)
//
// Returns "" when no identifier was provided OR a slug was provided but
// doesn't resolve to any workspace. Callers that need to distinguish "no
// identifier" (400) from "invalid slug" (404) should use the middleware's
// internal resolver instead — this helper collapses both cases to "" for
// simpler handler-level checks.
func ResolveWorkspaceIDFromRequest(r *http.Request, queries *db.Queries) string {
	// A mat_ task token is bound to exactly one workspace by the token
	// row. Auth middleware writes that workspace into X-Workspace-ID
	// after stripping any client-supplied X-Actor-Source. Any other
	// workspace identifier on the request (slug header/query, ID
	// query, URL param) is the agent trying to widen its blast
	// radius — ignore it.
	if r.Header.Get("X-Actor-Source") == "task_token" {
		return r.Header.Get("X-Workspace-ID")
	}
	if id := WorkspaceIDFromContext(r.Context()); id != "" {
		return id
	}
	if slug := r.Header.Get("X-Workspace-Slug"); slug != "" {
		if ws, err := queries.GetWorkspaceBySlug(r.Context(), slug); err == nil {
			return util.UUIDToString(ws.ID)
		}
	}
	if slug := r.URL.Query().Get("workspace_slug"); slug != "" {
		if ws, err := queries.GetWorkspaceBySlug(r.Context(), slug); err == nil {
			return util.UUIDToString(ws.ID)
		}
	}
	if id := r.Header.Get("X-Workspace-ID"); id != "" {
		return id
	}
	return r.URL.Query().Get("workspace_id")
}

// workspaceResolution carries the resolved workspace UUID plus, when the
// slug fast path ran, the workspace and member rows it already fetched so
// buildMiddleware doesn't repeat the lookups.
type workspaceResolution struct {
	workspaceID string
	ws          *db.Workspace
	member      *db.Member
}

// workspaceResolver extracts a workspace UUID from the request.
// Returns a zero resolution and nil error if no workspace identifier was
// provided at all. Returns errWorkspaceNotFound if a slug was provided but
// doesn't exist (or, on the combined fast path, the user isn't a member).
type workspaceResolver func(r *http.Request) (workspaceResolution, error)

// resolveWorkspaceUUID builds a resolver that accepts slug-first identification.
//
// Priority:
//  1. task-token binding (X-Actor-Source == "task_token") — authoritative,
//     server-set; the agent cannot widen its workspace scope by passing a
//     different slug/id (MUL-2600)
//  2. X-Workspace-Slug header / ?workspace_slug query → GetWorkspaceBySlug → UUID
//  3. X-Workspace-ID header / ?workspace_id query → UUID directly (CLI/daemon compat)
func resolveWorkspaceUUID(queries *db.Queries) workspaceResolver {
	// resolveSlug is the hot path for all web/desktop traffic: one JOIN
	// resolves the slug AND validates membership, replacing the previous
	// two sequential lookups (GetWorkspaceBySlug + GetMemberByUserAndWorkspace).
	// The fetched rows ride along so buildMiddleware can skip its member
	// query and stash the workspace for handlers (getIssuePrefix).
	resolveSlug := func(r *http.Request, slug string) (workspaceResolution, error) {
		if userUUID, err := util.ParseUUID(r.Header.Get("X-User-ID")); err == nil {
			row, err := queries.GetWorkspaceAndMemberBySlug(r.Context(), db.GetWorkspaceAndMemberBySlugParams{
				Slug:   slug,
				UserID: userUUID,
			})
			if err != nil {
				// Missing workspace and non-membership are deliberately
				// indistinguishable here; both have always been a 404.
				return workspaceResolution{}, errWorkspaceNotFound
			}
			return workspaceResolution{
				workspaceID: util.UUIDToString(row.Workspace.ID),
				ws:          &row.Workspace,
				member:      &row.Member,
			}, nil
		}
		// No authenticated user on the request — resolve the slug alone so
		// buildMiddleware can return its usual 401 for the missing user.
		ws, err := queries.GetWorkspaceBySlug(r.Context(), slug)
		if err != nil {
			return workspaceResolution{}, errWorkspaceNotFound
		}
		return workspaceResolution{workspaceID: util.UUIDToString(ws.ID)}, nil
	}

	return func(r *http.Request) (workspaceResolution, error) {
		// Task-token-authenticated requests must operate on the
		// token's bound workspace. The auth middleware wrote that ID
		// into X-Workspace-ID; nothing the agent can put on the wire
		// (slug header/query, id query, URL param) can override it.
		if r.Header.Get("X-Actor-Source") == "task_token" {
			id := r.Header.Get("X-Workspace-ID")
			if id == "" {
				return workspaceResolution{}, errWorkspaceNotFound
			}
			return workspaceResolution{workspaceID: id}, nil
		}
		// Slug path (preferred — frontend sends this after the URL refactor)
		if slug := r.URL.Query().Get("workspace_slug"); slug != "" {
			return resolveSlug(r, slug)
		}
		if slug := r.Header.Get("X-Workspace-Slug"); slug != "" {
			return resolveSlug(r, slug)
		}
		// UUID fallback (CLI, daemon, legacy clients)
		if id := r.URL.Query().Get("workspace_id"); id != "" {
			return workspaceResolution{workspaceID: id}, nil
		}
		if id := r.Header.Get("X-Workspace-ID"); id != "" {
			return workspaceResolution{workspaceID: id}, nil
		}
		return workspaceResolution{}, nil
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"error":"` + msg + `"}`))
}

// RequireWorkspaceMember resolves the workspace from slug (preferred) or UUID
// (fallback), validates membership, and injects the member and workspace ID
// into the request context.
func RequireWorkspaceMember(queries *db.Queries) func(http.Handler) http.Handler {
	return buildMiddleware(queries, resolveWorkspaceUUID(queries), nil)
}

// RequireWorkspaceRole is like RequireWorkspaceMember but additionally checks
// that the member has one of the specified roles.
func RequireWorkspaceRole(queries *db.Queries, roles ...string) func(http.Handler) http.Handler {
	return buildMiddleware(queries, resolveWorkspaceUUID(queries), roles)
}

// RequireWorkspaceMemberFromURL resolves the workspace ID from a chi URL
// parameter, validates membership, and injects into context.
func RequireWorkspaceMemberFromURL(queries *db.Queries, param string) func(http.Handler) http.Handler {
	return buildMiddleware(queries, func(r *http.Request) (workspaceResolution, error) {
		return workspaceResolution{workspaceID: chi.URLParam(r, param)}, nil
	}, nil)
}

// RequireWorkspaceRoleFromURL is like RequireWorkspaceMemberFromURL but
// additionally checks that the member has one of the specified roles.
func RequireWorkspaceRoleFromURL(queries *db.Queries, param string, roles ...string) func(http.Handler) http.Handler {
	return buildMiddleware(queries, func(r *http.Request) (workspaceResolution, error) {
		return workspaceResolution{workspaceID: chi.URLParam(r, param)}, nil
	}, roles)
}

func buildMiddleware(queries *db.Queries, resolve workspaceResolver, roles []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			resolution, resolveErr := resolve(r)
			if resolveErr != nil {
				writeError(w, http.StatusNotFound, "workspace not found")
				return
			}
			workspaceID := resolution.workspaceID
			if workspaceID == "" {
				writeError(w, http.StatusBadRequest, "workspace_id or workspace_slug is required")
				return
			}

			// Final task-token binding check: even when the workspace
			// was resolved from a chi URL parameter
			// (RequireWorkspaceMemberFromURL), the agent must not be
			// allowed to operate on a workspace other than the one
			// stamped into its task token. This is the catch-all
			// behind resolveWorkspaceUUID's earlier check. MUL-2600.
			if r.Header.Get("X-Actor-Source") == "task_token" {
				bound := r.Header.Get("X-Workspace-ID")
				if bound == "" || workspaceID != bound {
					writeError(w, http.StatusForbidden, "task token is bound to a different workspace")
					return
				}
			}

			userID := r.Header.Get("X-User-ID")
			if userID == "" {
				writeError(w, http.StatusUnauthorized, "user not authenticated")
				return
			}

			userUUID, err := util.ParseUUID(userID)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "user not authenticated")
				return
			}
			wsUUID, err := util.ParseUUID(workspaceID)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid workspace_id")
				return
			}

			// The slug fast path already validated membership in the same
			// query that resolved the slug; only UUID-resolved requests
			// still need the separate member lookup.
			var member db.Member
			if resolution.member != nil {
				member = *resolution.member
			} else {
				member, err = queries.GetMemberByUserAndWorkspace(r.Context(), db.GetMemberByUserAndWorkspaceParams{
					UserID:      userUUID,
					WorkspaceID: wsUUID,
				})
				if err != nil {
					writeError(w, http.StatusNotFound, "workspace not found")
					return
				}
			}

			if len(roles) > 0 {
				allowed := false
				for _, role := range roles {
					if member.Role == role {
						allowed = true
						break
					}
				}
				if !allowed {
					writeError(w, http.StatusForbidden, "insufficient permissions")
					return
				}
			}

			ctx := SetMemberContext(r.Context(), workspaceID, member)
			if resolution.ws != nil {
				ctx = context.WithValue(ctx, ctxKeyWorkspace, *resolution.ws)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
