package main

import (
	"context"
	"fmt"

	"github.com/kiyors/multica/server/internal/mcpserver"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/spf13/cobra"
)

var mcpCmd = &cobra.Command{
	Use:   "mcp",
	Short: "Start a stdio-based MCP server proxy",
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := newAPIClient(cmd)
		if err != nil {
			return err
		}

		// Usually Cursor or Claude will pass these explicitly if not in config,
		// but newAPIClient handles resolving token via config or --token flag.

		// Ensure we can authenticate
		ctx := context.Background()
		var meResp map[string]any
		if err := client.GetJSON(ctx, "/api/auth/me", &meResp); err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}

		// Initialize MCP server with API Client
		srv := mcpserver.NewServer(client)

		// Start stdio transport
		return srv.Run(ctx, &mcp.StdioTransport{})
	},
}

func init() {
	mcpCmd.Flags().String("token", "", "API token for authentication")
	mcpCmd.Flags().String("workspace-id", "", "Workspace ID context for tools")
	mcpCmd.Flags().String("server-url", "", "Multica server URL (default: http://localhost:8080)")
}
