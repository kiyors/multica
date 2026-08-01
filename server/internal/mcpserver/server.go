package mcpserver

import (
	"context"
	"net/url"

	"github.com/kiyors/multica/server/internal/cli"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// NewServer creates a new MCP server that proxies tool calls via the Multica REST API.
// It relies on the provided APIClient, which handles authentication automatically
// by sending the token via the Authorization header and setting the X-Workspace-ID.
func NewServer(client *cli.APIClient) *mcp.Server {
	srv := mcp.NewServer(&mcp.Implementation{Name: "multica", Version: "1.0.0"}, nil)

	registerCreateTask(srv, client)
	registerListTasks(srv, client)
	registerGetTaskDetails(srv, client)
	registerUpdateTask(srv, client)

	return srv
}

type CreateTaskParams struct {
	Title       string `json:"title" jsonschema:"description=The title of the task"`
	Description string `json:"description,omitempty" jsonschema:"description=The task description"`
	Priority    string `json:"priority,omitempty" jsonschema:"description=Priority (e.g., urgent, high, medium, low, none)"`
	Status      string `json:"status,omitempty" jsonschema:"description=Status (e.g., backlog, todo, in_progress, in_review, done)"`
}

func registerCreateTask(srv *mcp.Server, client *cli.APIClient) {
	mcp.AddTool(srv, &mcp.Tool{
		Name:        "create_task",
		Description: "Create a new task (issue) in Multica.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, input CreateTaskParams) (*mcp.CallToolResult, any, error) {
		var out any
		err := client.PostJSON(ctx, "/api/issues", input, &out)
		return nil, out, err
	})
}

type ListTasksParams struct {
	Query  string `json:"query,omitempty" jsonschema:"description=Search term to filter tasks"`
}

func registerListTasks(srv *mcp.Server, client *cli.APIClient) {
	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_tasks",
		Description: "List tasks (issues) in the workspace. Returns a list of tasks. You can optionally filter by query.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, input ListTasksParams) (*mcp.CallToolResult, any, error) {
		var out any
		path := "/api/issues"
		if input.Query != "" {
			path = "/api/issues/search?q=" + url.QueryEscape(input.Query)
		}
		err := client.GetJSON(ctx, path, &out)
		return nil, out, err
	})
}

type GetTaskDetailsParams struct {
	ID string `json:"id" jsonschema:"description=The ID or identifier (e.g. ENG-123) of the task to fetch"`
}

func registerGetTaskDetails(srv *mcp.Server, client *cli.APIClient) {
	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_task_details",
		Description: "Get the full details of a specific task by its UUID or identifier (e.g., ENG-123).",
	}, func(ctx context.Context, req *mcp.CallToolRequest, input GetTaskDetailsParams) (*mcp.CallToolResult, any, error) {
		var out any
		err := client.GetJSON(ctx, "/api/issues/"+input.ID, &out)
		return nil, out, err
	})
}

type UpdateTaskParams struct {
	ID          string  `json:"id" jsonschema:"description=The ID or identifier (e.g. ENG-123) of the task to update"`
	Title       *string `json:"title,omitempty" jsonschema:"description=The new title"`
	Description *string `json:"description,omitempty" jsonschema:"description=The new description"`
	Status      *string `json:"status,omitempty" jsonschema:"description=The new status"`
	Priority    *string `json:"priority,omitempty" jsonschema:"description=The new priority"`
}

func registerUpdateTask(srv *mcp.Server, client *cli.APIClient) {
	mcp.AddTool(srv, &mcp.Tool{
		Name:        "update_task",
		Description: "Update properties of an existing task.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, input UpdateTaskParams) (*mcp.CallToolResult, any, error) {
		var out any
		
		payload := make(map[string]any)
		if input.Title != nil {
			payload["title"] = *input.Title
		}
		if input.Description != nil {
			payload["description"] = *input.Description
		}
		if input.Status != nil {
			payload["status"] = *input.Status
		}
		if input.Priority != nil {
			payload["priority"] = *input.Priority
		}

		err := client.PutJSON(ctx, "/api/issues/"+input.ID, payload, &out)
		return nil, out, err
	})
}
