package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kiyors/multica/server/pkg/protocol"
)

const maxMemberAssignmentIDs = 500

type MemberAssignmentsResponse struct {
	ProjectIDs []string `json:"project_ids"`
	SquadIDs   []string `json:"squad_ids"`
}

type reconcileMemberAssignmentsRequest struct {
	ProjectIDs []string `json:"project_ids"`
	SquadIDs   []string `json:"squad_ids"`
}

func parseAssignmentIDs(w http.ResponseWriter, values []string, field string) (map[string]pgtype.UUID, bool) {
	if len(values) > maxMemberAssignmentIDs {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("%s cannot contain more than %d entries", field, maxMemberAssignmentIDs))
		return nil, false
	}
	result := make(map[string]pgtype.UUID, len(values))
	for _, value := range values {
		id, ok := parseUUIDOrBadRequest(w, value, field)
		if !ok {
			return nil, false
		}
		key := uuidToString(id)
		if _, duplicate := result[key]; duplicate {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("%s contains a duplicate id", field))
			return nil, false
		}
		result[key] = id
	}
	return result, true
}

func assignmentIDs(values map[string]pgtype.UUID) []string {
	result := make([]string, 0, len(values))
	for id := range values {
		result = append(result, id)
	}
	sort.Strings(result)
	return result
}

// GetMemberAssignments returns the active project and squad memberships edited
// by the admin bulk-assignment dialog.
func (h *Handler) GetMemberAssignments(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	if _, ok := h.requireWorkspaceRole(w, r, workspaceID, "workspace not found", "owner", "admin"); !ok {
		return
	}
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	memberUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "memberId"), "member_id")
	if !ok {
		return
	}

	var memberUserID pgtype.UUID
	if err := h.DB.QueryRow(r.Context(),
		"SELECT user_id FROM member WHERE id = $1 AND workspace_id = $2",
		memberUUID,
		workspaceUUID,
	).Scan(&memberUserID); err != nil {
		writeError(w, http.StatusNotFound, "member not found")
		return
	}

	resp, err := readMemberAssignments(r.Context(), h.DB, memberUUID, memberUserID, workspaceUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load member assignments")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func readMemberAssignments(ctx context.Context, executor dbExecutor, memberID, memberUserID, workspaceID pgtype.UUID) (MemberAssignmentsResponse, error) {
	resp := MemberAssignmentsResponse{ProjectIDs: []string{}, SquadIDs: []string{}}
	queries := []struct {
		sql  string
		args []any
		dest *[]string
	}{
		{`SELECT pm.project_id FROM project_member pm JOIN project p ON p.id = pm.project_id WHERE pm.member_id = $1 AND p.workspace_id = $2 ORDER BY pm.project_id`, []any{memberID, workspaceID}, &resp.ProjectIDs},
		{`SELECT sm.squad_id FROM squad_member sm JOIN squad s ON s.id = sm.squad_id WHERE sm.member_type = 'member' AND sm.member_id = $1 AND s.workspace_id = $2 AND s.archived_at IS NULL ORDER BY sm.squad_id`, []any{memberUserID, workspaceID}, &resp.SquadIDs},
	}
	for _, query := range queries {
		rows, err := executor.Query(ctx, query.sql, query.args...)
		if err != nil {
			return resp, err
		}
		for rows.Next() {
			var id pgtype.UUID
			if err := rows.Scan(&id); err != nil {
				rows.Close()
				return resp, err
			}
			*query.dest = append(*query.dest, uuidToString(id))
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return resp, err
		}
	}
	return resp, nil
}

// ReconcileMemberAssignments replaces the member's active project and squad
// memberships atomically. Any validation or write failure rolls back every
// addition and removal.
func (h *Handler) ReconcileMemberAssignments(w http.ResponseWriter, r *http.Request) {
	workspaceID := chi.URLParam(r, "id")
	requester, ok := h.requireWorkspaceRole(w, r, workspaceID, "workspace not found", "owner", "admin")
	if !ok {
		return
	}
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	memberUUID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "memberId"), "member_id")
	if !ok {
		return
	}

	var body reconcileMemberAssignmentsRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	desiredProjects, ok := parseAssignmentIDs(w, body.ProjectIDs, "project_ids")
	if !ok {
		return
	}
	desiredSquads, ok := parseAssignmentIDs(w, body.SquadIDs, "squad_ids")
	if !ok {
		return
	}

	tx, err := h.TxStarter.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update member assignments")
		return
	}
	defer tx.Rollback(r.Context())

	var memberUserID pgtype.UUID
	if err := tx.QueryRow(r.Context(),
		"SELECT user_id FROM member WHERE id = $1 AND workspace_id = $2 FOR UPDATE",
		memberUUID,
		workspaceUUID,
	).Scan(&memberUserID); err != nil {
		writeError(w, http.StatusNotFound, "member not found")
		return
	}

	for _, id := range desiredProjects {
		var exists bool
		if err := tx.QueryRow(r.Context(),
			"SELECT EXISTS(SELECT 1 FROM project WHERE id = $1 AND workspace_id = $2)",
			id,
			workspaceUUID,
		).Scan(&exists); err != nil || !exists {
			writeError(w, http.StatusBadRequest, "project_ids contains a project outside this workspace")
			return
		}
	}
	for _, id := range desiredSquads {
		var exists bool
		if err := tx.QueryRow(r.Context(),
			"SELECT EXISTS(SELECT 1 FROM squad WHERE id = $1 AND workspace_id = $2 AND archived_at IS NULL)",
			id,
			workspaceUUID,
		).Scan(&exists); err != nil || !exists {
			writeError(w, http.StatusBadRequest, "squad_ids contains an unavailable squad")
			return
		}
	}

	current, err := readMemberAssignments(r.Context(), tx, memberUUID, memberUserID, workspaceUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update member assignments")
		return
	}
	currentProjects := make(map[string]struct{}, len(current.ProjectIDs))
	for _, id := range current.ProjectIDs {
		currentProjects[id] = struct{}{}
	}
	currentSquads := make(map[string]struct{}, len(current.SquadIDs))
	for _, id := range current.SquadIDs {
		currentSquads[id] = struct{}{}
	}

	changedProjects := map[string]struct{}{}
	changedSquads := map[string]struct{}{}
	for id, parsed := range desiredProjects {
		if _, exists := currentProjects[id]; exists {
			continue
		}
		if _, err := tx.Exec(r.Context(),
			"INSERT INTO project_member (project_id, member_id, role, invited_by) VALUES ($1, $2, 'viewer', $3)",
			parsed,
			memberUUID,
			requester.ID,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update member assignments")
			return
		}
		changedProjects[id] = struct{}{}
	}
	for id := range currentProjects {
		if _, keep := desiredProjects[id]; keep {
			continue
		}
		if _, err := tx.Exec(r.Context(),
			"DELETE FROM project_member WHERE project_id = $1 AND member_id = $2",
			parseUUID(id),
			memberUUID,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update member assignments")
			return
		}
		changedProjects[id] = struct{}{}
	}
	for id, parsed := range desiredSquads {
		if _, exists := currentSquads[id]; exists {
			continue
		}
		if _, err := tx.Exec(r.Context(),
			"INSERT INTO squad_member (squad_id, member_type, member_id, role) VALUES ($1, 'member', $2, 'member')",
			parsed,
			memberUserID,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update member assignments")
			return
		}
		changedSquads[id] = struct{}{}
	}
	for id := range currentSquads {
		if _, keep := desiredSquads[id]; keep {
			continue
		}
		if _, err := tx.Exec(r.Context(),
			"DELETE FROM squad_member WHERE squad_id = $1 AND member_type = 'member' AND member_id = $2",
			parseUUID(id),
			memberUserID,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update member assignments")
			return
		}
		changedSquads[id] = struct{}{}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update member assignments")
		return
	}

	for projectID := range changedProjects {
		h.publish(protocol.EventProjectMemberUpdated, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
			"project_id": projectID,
			"member_id":  uuidToString(memberUUID),
		})
	}
	for squadID := range changedSquads {
		h.publish(protocol.EventSquadUpdated, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
			"squad_id": squadID,
		})
	}

	writeJSON(w, http.StatusOK, MemberAssignmentsResponse{
		ProjectIDs: assignmentIDs(desiredProjects),
		SquadIDs:   assignmentIDs(desiredSquads),
	})
}
