package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
	"github.com/multica-ai/multica/server/pkg/protocol"
)

type ProjectDocumentResponse struct {
	ID           string  `json:"id"`
	ProjectID    string  `json:"project_id"`
	ParentID     *string `json:"parent_id"`
	Title        string  `json:"title"`
	Content      string  `json:"content"`
	SortOrder    int32   `json:"sort_order"`
	CreatedBy    string  `json:"created_by"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
	DocumentType string  `json:"document_type"`
}

func projectDocumentToResponse(d db.ProjectDocument) ProjectDocumentResponse {
	return ProjectDocumentResponse{
		ID:           uuidToString(d.ID),
		ProjectID:    uuidToString(d.ProjectID),
		ParentID:     uuidToPtr(d.ParentID),
		Title:        d.Title,
		Content:      d.Content,
		SortOrder:    d.SortOrder,
		CreatedBy:    uuidToString(d.CreatedBy),
		CreatedAt:    timestampToString(d.CreatedAt),
		UpdatedAt:    timestampToString(d.UpdatedAt),
		DocumentType: d.DocumentType,
	}
}

func (h *Handler) ListProjectDocuments(w http.ResponseWriter, r *http.Request) {
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

	documents, err := h.Queries.ListDocumentsByProject(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list project documents")
		return
	}

	resp := make([]ProjectDocumentResponse, len(documents))
	for i, d := range documents {
		resp[i] = projectDocumentToResponse(d)
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreateProjectDocument(w http.ResponseWriter, r *http.Request) {
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
		ParentID     *string `json:"parent_id"`
		Title        string  `json:"title"`
		Content      string  `json:"content"`
		SortOrder    int32   `json:"sort_order"`
		DocumentType string  `json:"document_type"`
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
	if req.DocumentType == "" {
		req.DocumentType = "page"
	}
	if req.DocumentType != "page" && req.DocumentType != "folder" {
		writeError(w, http.StatusBadRequest, "invalid document_type")
		return
	}
	if req.DocumentType == "folder" {
		req.Content = ""
	}

	var parentUUID pgtype.UUID
	if req.ParentID != nil && *req.ParentID != "" {
		parsed, ok := parseUUIDOrBadRequest(w, *req.ParentID, "parent_id")
		if !ok {
			return
		}
		parentUUID = parsed
		parent, err := h.Queries.GetDocument(r.Context(), parentUUID)
		if err != nil || uuidToString(parent.ProjectID) != uuidToString(projectID) || parent.DocumentType != "folder" {
			writeError(w, http.StatusBadRequest, "parent must be a folder in this project")
			return
		}
	}

	d, err := h.Queries.CreateDocument(r.Context(), db.CreateDocumentParams{
		ProjectID:    projectID,
		ParentID:     parentUUID,
		Title:        req.Title,
		Content:      req.Content,
		SortOrder:    req.SortOrder,
		CreatedBy:    requester.ID,
		DocumentType: req.DocumentType,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create project document")
		return
	}

	resp := projectDocumentToResponse(d)
	writeJSON(w, http.StatusCreated, resp)

	h.publish(protocol.EventProjectDocumentCreated, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
		"document": resp,
	})
}

func (h *Handler) GetProjectDocument(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	documentIdStr := chi.URLParam(r, "documentId")
	documentUUID, ok := parseUUIDOrBadRequest(w, documentIdStr, "document id")
	if !ok {
		return
	}

	d, err := h.Queries.GetDocument(r.Context(), documentUUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "document not found")
		return
	}
	if !h.projectExistsInWorkspace(r.Context(), d.ProjectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "document not found")
		return
	}

	writeJSON(w, http.StatusOK, projectDocumentToResponse(d))
}

func (h *Handler) UpdateProjectDocument(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	documentIdStr := chi.URLParam(r, "documentId")
	documentUUID, ok := parseUUIDOrBadRequest(w, documentIdStr, "document id")
	if !ok {
		return
	}

	requester, ok := h.requireWorkspaceRole(w, r, workspaceID, "workspace not found", "owner", "admin", "member")
	if !ok {
		return
	}

	var req struct {
		ParentID     *string `json:"parent_id"`
		Title        *string `json:"title"`
		Content      *string `json:"content"`
		SortOrder    *int32  `json:"sort_order"`
		DocumentType *string `json:"document_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	existing, err := h.Queries.GetDocument(r.Context(), documentUUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project document not found")
		return
	}
	if !h.projectExistsInWorkspace(r.Context(), existing.ProjectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "project document not found")
		return
	}

	params := db.UpdateDocumentParams{ID: documentUUID}

	if req.ParentID != nil {
		params.ParentIDSet = true
		if *req.ParentID == "" {
			params.ParentID = pgtype.UUID{Valid: false}
		} else {
			parsed, ok := parseUUIDOrBadRequest(w, *req.ParentID, "parent_id")
			if !ok {
				return
			}
			if uuidToString(parsed) == documentIdStr {
				writeError(w, http.StatusBadRequest, "document cannot be its own parent")
				return
			}
			parent, err := h.Queries.GetDocument(r.Context(), parsed)
			if err != nil || uuidToString(parent.ProjectID) != uuidToString(existing.ProjectID) || parent.DocumentType != "folder" {
				writeError(w, http.StatusBadRequest, "parent must be a folder in this project")
				return
			}
			params.ParentID = parsed
		}
	}

	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			writeError(w, http.StatusBadRequest, "title is required")
			return
		}
		params.Title = pgtype.Text{String: title, Valid: true}
	}
	if req.Content != nil {
		params.Content = pgtype.Text{String: *req.Content, Valid: true}
	}
	if req.DocumentType != nil {
		if *req.DocumentType != "page" && *req.DocumentType != "folder" {
			writeError(w, http.StatusBadRequest, "invalid document_type")
			return
		}
		params.DocumentType = pgtype.Text{String: *req.DocumentType, Valid: true}
		if *req.DocumentType == "folder" {
			params.Content = pgtype.Text{String: "", Valid: true}
		}
	}
	if req.SortOrder != nil {
		params.SortOrder = pgtype.Int4{Int32: *req.SortOrder, Valid: true}
	}

	d, err := h.Queries.UpdateDocument(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update project document")
		return
	}

	resp := projectDocumentToResponse(d)
	writeJSON(w, http.StatusOK, resp)

	h.publish(protocol.EventProjectDocumentUpdated, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
		"document": resp,
	})
}

func (h *Handler) DeleteProjectDocument(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace_id")
	if !ok {
		return
	}
	documentIdStr := chi.URLParam(r, "documentId")
	documentUUID, ok := parseUUIDOrBadRequest(w, documentIdStr, "document id")
	if !ok {
		return
	}
	existing, err := h.Queries.GetDocument(r.Context(), documentUUID)
	if err != nil || !h.projectExistsInWorkspace(r.Context(), existing.ProjectID, workspaceUUID) {
		writeError(w, http.StatusNotFound, "project document not found")
		return
	}

	requester, ok := h.requireWorkspaceRole(w, r, workspaceID, "workspace not found", "owner", "admin", "member")
	if !ok {
		return
	}

	err = h.Queries.DeleteDocument(r.Context(), documentUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete project document")
		return
	}

	w.WriteHeader(http.StatusNoContent)

	h.publish(protocol.EventProjectDocumentDeleted, workspaceID, "member", uuidToString(requester.UserID), map[string]any{
		"document_id": documentIdStr,
	})
}
