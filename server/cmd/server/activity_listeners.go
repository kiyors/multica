package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/multica-ai/multica/server/internal/events"
	"github.com/multica-ai/multica/server/internal/handler"
	"github.com/multica-ai/multica/server/internal/util"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
	"github.com/multica-ai/multica/server/pkg/protocol"
)

// registerActivityListeners wires up event bus listeners that record activity
// entries in the activity_log table. Each listener creates one or more activity
// records depending on what changed, then publishes an activity:created event
// for WS broadcasting.
func registerActivityListeners(bus *events.Bus, queries *db.Queries) {
	ctx := context.Background()

	// issue:created — record "created" activity
	bus.Subscribe(protocol.EventIssueCreated, func(e events.Event) {
		payload, ok := e.Payload.(map[string]any)
		if !ok {
			return
		}
		issue, ok := payload["issue"].(handler.IssueResponse)
		if !ok {
			return
		}

		activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
			WorkspaceID: parseUUID(issue.WorkspaceID),
			IssueID:     parseUUID(issue.ID),
			ActorType:   util.StrToText(e.ActorType),
			ActorID:     optionalUUID(e.ActorID),
			Action:      "created",
			Details:     []byte("{}"),
		})
		if err != nil {
			slog.Error("activity: failed to record issue created",
				"issue_id", issue.ID, "error", err)
			return
		}

		publishActivityEvent(bus, e, activity)
	})

	// issue:updated — record specific changes as separate activities
	bus.Subscribe(protocol.EventIssueUpdated, func(e events.Event) {
		payload, ok := e.Payload.(map[string]any)
		if !ok {
			return
		}
		issue, ok := payload["issue"].(handler.IssueResponse)
		if !ok {
			return
		}

		statusChanged, _ := payload["status_changed"].(bool)
		priorityChanged, _ := payload["priority_changed"].(bool)
		assigneeChanged, _ := payload["assignee_changed"].(bool)
		descriptionChanged, _ := payload["description_changed"].(bool)

		if statusChanged {
			prevStatus, _ := payload["prev_status"].(string)
			details, _ := json.Marshal(map[string]string{
				"from": prevStatus,
				"to":   issue.Status,
			})
			activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
				WorkspaceID: parseUUID(issue.WorkspaceID),
				IssueID:     parseUUID(issue.ID),
				ActorType:   util.StrToText(e.ActorType),
				ActorID:     optionalUUID(e.ActorID),
				Action:      "status_changed",
				Details:     details,
			})
			if err != nil {
				slog.Error("activity: failed to record status change",
					"issue_id", issue.ID, "error", err)
			} else {
				publishActivityEvent(bus, e, activity)
			}
		}

		if priorityChanged {
			prevPriority, _ := payload["prev_priority"].(string)
			details, _ := json.Marshal(map[string]string{
				"from": prevPriority,
				"to":   issue.Priority,
			})
			activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
				WorkspaceID: parseUUID(issue.WorkspaceID),
				IssueID:     parseUUID(issue.ID),
				ActorType:   util.StrToText(e.ActorType),
				ActorID:     optionalUUID(e.ActorID),
				Action:      "priority_changed",
				Details:     details,
			})
			if err != nil {
				slog.Error("activity: failed to record priority change",
					"issue_id", issue.ID, "error", err)
			} else {
				publishActivityEvent(bus, e, activity)
			}
		}

		if assigneeChanged {
			prevAssigneeType, _ := payload["prev_assignee_type"].(*string)
			prevAssigneeID, _ := payload["prev_assignee_id"].(*string)

			detailsMap := map[string]string{}
			if prevAssigneeType != nil {
				detailsMap["from_type"] = *prevAssigneeType
			}
			if prevAssigneeID != nil {
				detailsMap["from_id"] = *prevAssigneeID
			}
			if issue.AssigneeType != nil {
				detailsMap["to_type"] = *issue.AssigneeType
			}
			if issue.AssigneeID != nil {
				detailsMap["to_id"] = *issue.AssigneeID
			}

			details, _ := json.Marshal(detailsMap)
			activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
				WorkspaceID: parseUUID(issue.WorkspaceID),
				IssueID:     parseUUID(issue.ID),
				ActorType:   util.StrToText(e.ActorType),
				ActorID:     optionalUUID(e.ActorID),
				Action:      "assignee_changed",
				Details:     details,
			})
			if err != nil {
				slog.Error("activity: failed to record assignee change",
					"issue_id", issue.ID, "error", err)
			} else {
				publishActivityEvent(bus, e, activity)
			}
		}

		if startDateChanged, _ := payload["start_date_changed"].(bool); startDateChanged {
			prevStartDate := ""
			if v, ok := payload["prev_start_date"].(*string); ok && v != nil {
				prevStartDate = *v
			}
			newStartDate := ""
			if issue.StartDate != nil {
				newStartDate = *issue.StartDate
			}
			details, _ := json.Marshal(map[string]string{
				"from": prevStartDate,
				"to":   newStartDate,
			})
			activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
				WorkspaceID: parseUUID(issue.WorkspaceID),
				IssueID:     parseUUID(issue.ID),
				ActorType:   util.StrToText(e.ActorType),
				ActorID:     optionalUUID(e.ActorID),
				Action:      "start_date_changed",
				Details:     details,
			})
			if err != nil {
				slog.Error("activity: failed to record start date change",
					"issue_id", issue.ID, "error", err)
			} else {
				publishActivityEvent(bus, e, activity)
			}
		}

		if dueDateChanged, _ := payload["due_date_changed"].(bool); dueDateChanged {
			prevDueDate := ""
			if v, ok := payload["prev_due_date"].(*string); ok && v != nil {
				prevDueDate = *v
			}
			newDueDate := ""
			if issue.DueDate != nil {
				newDueDate = *issue.DueDate
			}
			details, _ := json.Marshal(map[string]string{
				"from": prevDueDate,
				"to":   newDueDate,
			})
			activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
				WorkspaceID: parseUUID(issue.WorkspaceID),
				IssueID:     parseUUID(issue.ID),
				ActorType:   util.StrToText(e.ActorType),
				ActorID:     optionalUUID(e.ActorID),
				Action:      "due_date_changed",
				Details:     details,
			})
			if err != nil {
				slog.Error("activity: failed to record due date change",
					"issue_id", issue.ID, "error", err)
			} else {
				publishActivityEvent(bus, e, activity)
			}
		}

		if titleChanged, _ := payload["title_changed"].(bool); titleChanged {
			prevTitle, _ := payload["prev_title"].(string)
			details, _ := json.Marshal(map[string]string{
				"from": prevTitle,
				"to":   issue.Title,
			})
			activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
				WorkspaceID: parseUUID(issue.WorkspaceID),
				IssueID:     parseUUID(issue.ID),
				ActorType:   util.StrToText(e.ActorType),
				ActorID:     optionalUUID(e.ActorID),
				Action:      "title_changed",
				Details:     details,
			})
			if err != nil {
				slog.Error("activity: failed to record title change",
					"issue_id", issue.ID, "error", err)
			} else {
				publishActivityEvent(bus, e, activity)
			}
		}

		if descriptionChanged {
			activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
				WorkspaceID: parseUUID(issue.WorkspaceID),
				IssueID:     parseUUID(issue.ID),
				ActorType:   util.StrToText(e.ActorType),
				ActorID:     optionalUUID(e.ActorID),
				Action:      "description_updated",
				Details:     []byte("{}"),
			})
			if err != nil {
				slog.Error("activity: failed to record description change",
					"issue_id", issue.ID, "error", err)
			} else {
				publishActivityEvent(bus, e, activity)
			}
		}
	})

	// pull_request:updated — record PR lifecycle entries on linked issues.
	// "System comments" from the Phase 5 spec are modeled as activities, not
	// comment rows: PR events are machine-generated timeline facts, exactly
	// like status_changed, and must not pollute the human comment thread.
	bus.Subscribe(protocol.EventPullRequestUpdated, func(e events.Event) {
		payload, ok := e.Payload.(map[string]any)
		if !ok {
			return
		}
		pr, ok := payload["pull_request"].(handler.GitHubPullRequestResponse)
		if !ok {
			return
		}
		details, _ := json.Marshal(map[string]string{
			"pr_number": fmt.Sprintf("%d", pr.Number),
			"repo":      pr.RepoOwner + "/" + pr.RepoName,
			"title":     pr.Title,
			"url":       pr.HtmlURL,
		})

		record := func(issueIDs []string, action string) {
			for _, issueID := range issueIDs {
				activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
					WorkspaceID: parseUUID(pr.WorkspaceID),
					IssueID:     parseUUID(issueID),
					ActorType:   util.StrToText("system"),
					ActorID:     pgtype.UUID{},
					Action:      action,
					Details:     details,
				})
				if err != nil {
					slog.Error("activity: failed to record pr event",
						"issue_id", issueID, "action", action, "error", err)
					continue
				}
				publishActivityEvent(bus, e, activity)
			}
		}

		if ids, _ := payload["newly_linked_issue_ids"].([]string); len(ids) > 0 {
			record(ids, "pr_linked")
		}
		// pr_terminal is only set on the single action=="closed" delivery, so
		// terminal entries are written exactly once per PR.
		if terminal, _ := payload["pr_terminal"].(string); terminal == "merged" || terminal == "closed" {
			ids, _ := payload["terminal_issue_ids"].([]string)
			if terminal == "merged" {
				record(ids, "pr_merged")
			} else {
				record(ids, "pr_closed")
			}
		}
	})

	// task:completed — record "task_completed" activity
	bus.Subscribe(protocol.EventTaskCompleted, func(e events.Event) {
		handleTaskActivity(ctx, bus, queries, e, "task_completed")
	})

	// task:failed — record "task_failed" activity
	bus.Subscribe(protocol.EventTaskFailed, func(e events.Event) {
		handleTaskActivity(ctx, bus, queries, e, "task_failed")
	})
}

// handleTaskActivity records an activity for task:completed or task:failed events.
func handleTaskActivity(ctx context.Context, bus *events.Bus, queries *db.Queries, e events.Event, action string) {
	payload, ok := e.Payload.(map[string]any)
	if !ok {
		return
	}
	agentID, _ := payload["agent_id"].(string)
	issueID, _ := payload["issue_id"].(string)
	if issueID == "" {
		return
	}

	// Look up issue to get workspace_id
	issue, err := queries.GetIssue(ctx, parseUUID(issueID))
	if err != nil {
		slog.Error("activity: failed to get issue for task event",
			"issue_id", issueID, "action", action, "error", err)
		return
	}

	activity, err := queries.CreateActivity(ctx, db.CreateActivityParams{
		WorkspaceID: issue.WorkspaceID,
		IssueID:     parseUUID(issueID),
		ActorType:   util.StrToText("agent"),
		ActorID:     parseUUID(agentID),
		Action:      action,
		Details:     []byte("{}"),
	})
	if err != nil {
		slog.Error("activity: failed to record task activity",
			"issue_id", issueID, "action", action, "error", err)
		return
	}

	publishActivityEvent(bus, e, activity)
}

// publishActivityEvent sends an activity:created event for WS broadcasting.
// Payload matches frontend ActivityCreatedPayload: { issue_id, entry: TimelineEntry }
func publishActivityEvent(bus *events.Bus, original events.Event, activity db.ActivityLog) {
	actorType := ""
	if activity.ActorType.Valid {
		actorType = activity.ActorType.String
	}
	action := activity.Action
	bus.Publish(events.Event{
		Type:        protocol.EventActivityCreated,
		WorkspaceID: original.WorkspaceID,
		ActorType:   original.ActorType,
		ActorID:     original.ActorID,
		Payload: map[string]any{
			"issue_id": util.UUIDToString(activity.IssueID),
			"entry": map[string]any{
				"type":       "activity",
				"id":         util.UUIDToString(activity.ID),
				"actor_type": actorType,
				"actor_id":   util.UUIDToString(activity.ActorID),
				"action":     action,
				"details":    json.RawMessage(activity.Details),
				"created_at": util.TimestampToString(activity.CreatedAt),
			},
		},
	})
}
