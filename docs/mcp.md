# Multica MCP contract

Multica exposes the same four task tools over local `stdio` and authenticated remote SSE. Every connection is bound to one workspace; tool calls cannot select or switch workspaces.

## Authentication and workspace binding

Use a Multica personal access token (PAT) as a Bearer token. Treat it like a password and grant it only to clients you trust.

| Transport | Authentication | Workspace |
| --- | --- | --- |
| CLI `stdio` | `--token`, or the CLI's configured token | `--workspace-id`, or the CLI's configured default workspace |
| Remote SSE | `Authorization: Bearer <PAT>` | `X-Workspace-ID: <UUID>`; `?workspace_id=<UUID>` is supported for clients that cannot set a workspace header |

The remote endpoint is `https://<server>/api/mcp`. The server authenticates the token and verifies membership in the selected workspace before establishing the MCP session. Missing/invalid credentials return `401`; missing workspace context returns `400`; a workspace the caller cannot access returns `404`.

Do not put a PAT in the SSE URL. Query strings can appear in browser history, proxy logs, and telemetry. Only the workspace ID has a query-string fallback.

### OAuth compatibility bridge

Multica does not currently implement a full OAuth authorization server or dynamic client registration. The legacy PAT-as-client-secret bridge is disabled by default because it asks a third-party client to store a PAT as its OAuth client secret.

An operator may explicitly enable that compatibility mode with:

```bash
ENABLE_MCP_OAUTH_PAT_BRIDGE=true
```

This exposes `/api/mcp/oauth/authorize` and `/api/mcp/oauth/token`. Use it only when the MCP client cannot send a Bearer PAT directly and its secret storage is trusted. Native Bearer authentication is the supported default.

## Tools

| Tool | Input | Result and behavior |
| --- | --- | --- |
| `create_task` | `title` (required), optional `description`, `priority`, `status` | Creates an issue in the bound workspace and returns the API issue response. |
| `list_tasks` | Optional `query` | Without a query, lists workspace issues. With a query, uses workspace issue search. |
| `get_task_details` | `id` (required UUID or workspace identifier such as `ENG-123`) | Returns one visible issue. The ID is path-escaped before the REST call. |
| `update_task` | `id` plus at least one of `title`, `description`, `status`, `priority` | Updates and returns the visible issue. Empty patches are rejected by the MCP server. |

REST authorization remains authoritative. A tool returns an MCP error when the underlying API rejects validation, visibility, membership, or mutation permissions. The server does not convert failures into successful empty results.

## Examples

Claude Desktop or another local `stdio` client:

```json
{
  "mcpServers": {
    "multica": {
      "command": "multica",
      "args": [
        "mcp",
        "--server-url", "https://api.example.com",
        "--token", "<PAT>",
        "--workspace-id", "<WORKSPACE_UUID>"
      ]
    }
  }
}
```

Remote SSE request:

```http
GET /api/mcp HTTP/1.1
Host: api.example.com
Authorization: Bearer <PAT>
X-Workspace-ID: <WORKSPACE_UUID>
Accept: text/event-stream
```

Before starting a `stdio` session, the CLI verifies the PAT against `/api/me` and refuses to start without a workspace context.
