package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
	"github.com/multica-ai/multica/server/pkg/protocol"
)

func dateToString(d pgtype.Date) *string {
	if !d.Valid {
		return nil
	}
	s := d.Time.Format("2006-01-02")
	return &s
}

func parseDateParam(w http.ResponseWriter, s *string, paramName string) (pgtype.Date, bool) {
	if s == nil || *s == "" {
		return pgtype.Date{Valid: false}, true
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid date format for "+paramName)
		return pgtype.Date{Valid: false}, false
	}
	return pgtype.Date{Time: t, Valid: true}, true
}

type MilestoneResponse struct {
	ID          string   `json:"id"`
	ProjectID   string   `json:"project_id"`
	Title       string   `json:"title"`
	Description *string  `json:"description"`
	StartDate   *string  `json:"start_date"`
	DueDate     *string  `json:"due_date"`
	Status      string   `json:"status"`
	SortOrder   int32    `json:"sort_order"`
	CreatedBy   string   `json:"created_by"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
	MemberIDs   []string `json:"member_ids"`
}

func milestoneToResponse(m db.Milestone, memberIDs []string) MilestoneResponse {
	if memberIDs == nil {
		memberIDs = []string{}
	}
	return MilestoneResponse{
		ID:          uuidToString(m.ID),
		ProjectID:   uuidToString(m.ProjectID),
		Title:       m.Title,
		Description: textToPtr(m.Description),
		StartDate:   dateToString(m.StartDate),
		DueDate:     dateToString(m.DueDate),
		Status:      m.Status,
		SortOrder:   m.SortOrder,
		CreatedBy:   uuidToString(m.CreatedBy),
		CreatedAt:   timestampToString(m.CreatedAt),
		UpdatedAt:   timestampToString(m.UpdatedAt),
		MemberIDs:   memberIDs,
	}
}

func milestoneMemberIDStrings(ids []pgtype.UUID) []string {
	result := make([]string, len(ids))
	for i, id := range ids {
		result[i] = uuidToString(id)
	}
	return result
}

func (h *Handler) ListMilestones(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	projectID, ok := parseUUIDOrBadRequest(w, id, "project id")
	if !ok {
		return
	}
	if !h.projectExistsInWorkspace(r.Context(), projectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	milestones, err := h.Queries.ListMilestonesByProject(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list milestones")
		return
	}

	memberRows, err := h.Queries.ListMilestoneMembersByProject(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list milestone assignees")
		return
	}
	membersByMilestone := make(map[string][]string)
	for _, row := range memberRows {
		key := uuidToString(row.MilestoneID)
		membersByMilestone[key] = append(membersByMilestone[key], uuidToString(row.MemberID))
	}

	resp := make([]MilestoneResponse, len(milestones))
	for i, m := range milestones {
		resp[i] = milestoneToResponse(m, membersByMilestone[uuidToString(m.ID)])
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreateMilestone(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	projectID, ok := parseUUIDOrBadRequest(w, id, "project id")
	if !ok {
		return
	}
	if !h.projectExistsInWorkspace(r.Context(), projectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	requester, ok := h.requireWorkspaceRole(w, r, workspaceID, "workspace not found", "owner", "admin", "member")
	if !ok {
		return
	}

	var req struct {
		Title       string   `json:"title"`
		Description *string  `json:"description"`
		StartDate   *string  `json:"start_date"`
		DueDate     *string  `json:"due_date"`
		Status      string   `json:"status"`
		SortOrder   int32    `json:"sort_order"`
		MemberIDs   []string `json:"member_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if req.Status == "" {
		req.Status = "active"
	}
	if req.Status != "active" && req.Status != "completed" && req.Status != "cancelled" {
		writeError(w, http.StatusBadRequest, "invalid milestone status")
		return
	}

	startDate, ok := parseDateParam(w, req.StartDate, "start_date")
	if !ok {
		return
	}
	dueDate, ok := parseDateParam(w, req.DueDate, "due_date")
	if !ok {
		return
	}
	if startDate.Valid && dueDate.Valid && dueDate.Time.Before(startDate.Time) {
		writeError(w, http.StatusBadRequest, "due_date must be on or after start_date")
		return
	}

	tx, err := h.TxStarter.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create milestone")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.Queries.WithTx(tx)

	m, err := qtx.CreateMilestone(r.Context(), db.CreateMilestoneParams{
		ProjectID:   projectID,
		Title:       req.Title,
		Description: ptrToText(req.Description),
		StartDate:   startDate,
		DueDate:     dueDate,
		Status:      req.Status,
		SortOrder:   req.SortOrder,
		CreatedBy:   requester.ID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create milestone")
		return
	}

	memberIDs := make([]pgtype.UUID, 0, len(req.MemberIDs))
	for _, rawID := range req.MemberIDs {
		memberID, ok := parseUUIDOrBadRequest(w, rawID, "member_id")
		if !ok {
			return
		}
		member, err := qtx.GetMember(r.Context(), memberID)
		if err != nil || uuidToString(member.WorkspaceID) != workspaceID {
			writeError(w, http.StatusBadRequest, "milestone assignee must be a workspace member")
			return
		}
		if err := qtx.AddMilestoneMember(r.Context(), db.AddMilestoneMemberParams{MilestoneID: m.ID, MemberID: memberID}); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to assign milestone member")
			return
		}
		memberIDs = append(memberIDs, memberID)
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create milestone")
		return
	}

	resp := milestoneToResponse(m, milestoneMemberIDStrings(memberIDs))
	writeJSON(w, http.StatusCreated, resp)

	h.publish(protocol.EventMilestoneCreated, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
		"milestone": resp,
	})
}

func (h *Handler) GetMilestone(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	milestoneIdStr := chi.URLParam(r, "milestoneId")
	milestoneUUID, ok := parseUUIDOrBadRequest(w, milestoneIdStr, "milestone id")
	if !ok {
		return
	}

	m, err := h.Queries.GetMilestone(r.Context(), milestoneUUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "milestone not found")
		return
	}
	if !h.projectExistsInWorkspace(r.Context(), m.ProjectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "milestone not found")
		return
	}

	memberIDs, err := h.Queries.ListMilestoneMemberIDs(r.Context(), milestoneUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load milestone assignees")
		return
	}

	writeJSON(w, http.StatusOK, milestoneToResponse(m, milestoneMemberIDStrings(memberIDs)))
}

func (h *Handler) UpdateMilestone(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	milestoneIdStr := chi.URLParam(r, "milestoneId")
	milestoneUUID, ok := parseUUIDOrBadRequest(w, milestoneIdStr, "milestone id")
	if !ok {
		return
	}
	existingMilestone, err := h.Queries.GetMilestone(r.Context(), milestoneUUID)
	if err != nil || !h.projectExistsInWorkspace(r.Context(), existingMilestone.ProjectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "milestone not found")
		return
	}

	requester, ok := h.requireWorkspaceRole(w, r, workspaceID, "workspace not found", "owner", "admin", "member")
	if !ok {
		return
	}

	var req struct {
		Title       *string  `json:"title"`
		Description *string  `json:"description"`
		StartDate   *string  `json:"start_date"`
		DueDate     *string  `json:"due_date"`
		Status      *string  `json:"status"`
		SortOrder   *int32   `json:"sort_order"`
		MemberIDs   []string `json:"member_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title != nil && strings.TrimSpace(*req.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if req.Status != nil && *req.Status != "active" && *req.Status != "completed" && *req.Status != "cancelled" {
		writeError(w, http.StatusBadRequest, "invalid milestone status")
		return
	}

	startDate, ok := parseDateParam(w, req.StartDate, "start_date")
	if !ok {
		return
	}
	dueDate, ok := parseDateParam(w, req.DueDate, "due_date")
	if !ok {
		return
	}
	effectiveStartDate := existingMilestone.StartDate
	if req.StartDate != nil {
		effectiveStartDate = startDate
	}
	effectiveDueDate := existingMilestone.DueDate
	if req.DueDate != nil {
		effectiveDueDate = dueDate
	}
	if effectiveStartDate.Valid && effectiveDueDate.Valid && effectiveDueDate.Time.Before(effectiveStartDate.Time) {
		writeError(w, http.StatusBadRequest, "due_date must be on or after start_date")
		return
	}

	params := db.UpdateMilestoneParams{
		ID:           milestoneUUID,
		StartDateSet: req.StartDate != nil,
		StartDate:    startDate,
		DueDateSet:   req.DueDate != nil,
		DueDate:      dueDate,
	}
	if req.Title != nil {
		params.Title = pgtype.Text{String: strings.TrimSpace(*req.Title), Valid: true}
	}
	if req.Description != nil {
		params.Description = pgtype.Text{String: *req.Description, Valid: true}
	}
	if req.Status != nil {
		params.Status = pgtype.Text{String: *req.Status, Valid: true}
	}
	if req.SortOrder != nil {
		params.SortOrder = pgtype.Int4{Int32: *req.SortOrder, Valid: true}
	}
	tx, err := h.TxStarter.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update milestone")
		return
	}
	defer tx.Rollback(r.Context())
	qtx := h.Queries.WithTx(tx)

	m, err := qtx.UpdateMilestone(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update milestone")
		return
	}

	if req.MemberIDs != nil {
		if err := qtx.DeleteMilestoneMembers(r.Context(), milestoneUUID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update milestone assignees")
			return
		}
		for _, rawID := range req.MemberIDs {
			memberID, ok := parseUUIDOrBadRequest(w, rawID, "member_id")
			if !ok {
				return
			}
			member, err := qtx.GetMember(r.Context(), memberID)
			if err != nil || uuidToString(member.WorkspaceID) != workspaceID {
				writeError(w, http.StatusBadRequest, "milestone assignee must be a workspace member")
				return
			}
			if err := qtx.AddMilestoneMember(r.Context(), db.AddMilestoneMemberParams{MilestoneID: milestoneUUID, MemberID: memberID}); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to update milestone assignees")
				return
			}
		}
	}
	memberIDs, err := qtx.ListMilestoneMemberIDs(r.Context(), milestoneUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load milestone assignees")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update milestone")
		return
	}

	resp := milestoneToResponse(m, milestoneMemberIDStrings(memberIDs))
	writeJSON(w, http.StatusOK, resp)

	h.publish(protocol.EventMilestoneUpdated, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
		"milestone": resp,
	})
}

func (h *Handler) DeleteMilestone(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	milestoneIdStr := chi.URLParam(r, "milestoneId")
	milestoneUUID, ok := parseUUIDOrBadRequest(w, milestoneIdStr, "milestone id")
	if !ok {
		return
	}
	existingMilestone, err := h.Queries.GetMilestone(r.Context(), milestoneUUID)
	if err != nil || !h.projectExistsInWorkspace(r.Context(), existingMilestone.ProjectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "milestone not found")
		return
	}

	requester, ok := h.requireWorkspaceRole(w, r, workspaceID, "workspace not found", "owner", "admin", "member")
	if !ok {
		return
	}

	err = h.Queries.DeleteMilestone(r.Context(), milestoneUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete milestone")
		return
	}

	w.WriteHeader(http.StatusNoContent)

	h.publish(protocol.EventMilestoneDeleted, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
		"milestone_id": milestoneIdStr,
	})
}
