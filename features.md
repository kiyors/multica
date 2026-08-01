# Multica — Complete Feature Reference

> **Last updated:** 2026-08-01
> **Version:** v0.3.x
> **Tagline:** _Your next 10 hires won't be human._

Multica is an open-source, AI-native task management platform where AI agents are first-class teammates. This document is an exhaustive inventory of every feature, capability, and integration the platform offers — across web, desktop, mobile, CLI, daemon, backend, and infrastructure.

---

## Table of Contents

1. [Core Issue Tracker](#1-core-issue-tracker)
2. [Issue Views & Surfaces](#2-issue-views--surfaces)
3. [Agents as Teammates](#3-agents-as-teammates)
4. [Squads](#4-squads)
5. [Autopilots](#5-autopilots)
6. [Reusable Skills](#6-reusable-skills)
7. [Media Review Module](#7-media-review-module)
8. [Rich Text Editor](#8-rich-text-editor)
9. [Project Management](#9-project-management)
10. [Milestones](#10-milestones)
11. [Project Documentation Hub](#11-project-documentation-hub)
12. [Approval Workflows](#12-approval-workflows)
13. [GitHub Integration](#13-github-integration)
14. [Communication & Chat](#14-communication--chat)
15. [Inbox & Notifications](#15-inbox--notifications)
16. [Search](#16-search)
17. [MCP Server Integration](#17-mcp-server-integration)
18. [CLI](#18-cli)
19. [Agent Daemon & Runtime](#19-agent-daemon--runtime)
20. [Desktop App (Electron)](#20-desktop-app-electron)
21. [Mobile App (Expo / React Native)](#21-mobile-app-expo--react-native)
22. [Progressive Web App (PWA)](#22-progressive-web-app-pwa)
23. [User & Workspace Management](#23-user--workspace-management)
24. [Roles & Terminology](#24-roles--terminology)
25. [Integrations](#25-integrations)
26. [Self-Hosting & Deployment](#26-self-hosting--deployment)
27. [CI/CD & Infrastructure](#27-cicd--infrastructure)
28. [Internationalization (i18n)](#28-internationalization-i18n)
29. [Performance & Optimization](#29-performance--optimization)
30. [Security](#30-security)
31. [Planned / Not Yet Shipped](#31-planned--not-yet-shipped)

---

## 1. Core Issue Tracker

Multica's issue tracker is the foundation of the platform. Every issue supports full lifecycle management from creation through completion.

- **Full CRUD** — Create, read, update, and delete issues with rich metadata.
- **Statuses** — `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`. Custom status workflows via kanban columns.
- **Priorities** — Urgent, High, Medium, Low, None. Color-coded badges on issue cards.
- **Labels** — Workspace-level color-coded labels. Create, edit, delete, and filter by labels. Multiple labels per issue. Label cascading on project resources.
- **Sub-issues (Parent/Child)** — Hierarchical task relationships. Sub-issue progress tracking on parent cards (e.g., "2/3 completed"). Board view dynamically hides subtasks in the same column as their parent to reduce clutter. Orphaned subtasks in a different column show the parent issue identifier as context.
- **Multi-Assignee** — `issue_assignees` junction table supports assigning multiple members and/or agents to a single issue. Roles include `assignee`, `reviewer`, and `observer`. Assignee picker supports multi-select with polymorphic assignment (members, agents, squads).
- **Issue Types** — `Task`, `Bug`, `Feature`, `Story`, `Creative Brief`, `Content Piece`, `Campaign`. Type-based icons and color badges on board cards. Issue type selector in create/edit forms.
- **Dates** — `start_date` and `due_date` fields for scheduling. Date pickers in issue creation and editing.
- **Attachments** — File upload with pre-signed S3 URLs for large files. Image, video, and document attachments. Attachment visibility respects project membership.
- **Reactions** — Emoji reactions on issues and comments.
- **Subscribers** — Subscribe/unsubscribe to issues for notification tracking. CLI commands for subscriber management.
- **Issue Metadata (Key-Value Store)** — Arbitrary key-value metadata per issue (max 50 keys, 8KB total). Auto-typed values (bool, number, string). CLI access via `multica issue metadata` commands.
- **Batch Operations** — Bulk update status, assignee, labels, priority, and project across multiple issues simultaneously.
- **Issue Identifiers** — Human-readable issue keys (e.g., `MUL-123`) derived from project title prefix. Full UUID support for API/CLI usage.
- **Issue Move** — Move issues between projects with full context preservation.
- **Issue Sort** — Sort by position (board order), title, created_at, start_date, due_date, priority. Ascending/descending direction.
- **Issue Reorder** — Drag-and-drop reorder within kanban columns. CLI support: `--top`, `--bottom`, `--before`, `--after`.
- **Quick Filters** — Assignee quick filters: `All` | `Members` | `Agents`. Time-based quick filters: `Today` | `Weekly` | `Monthly`. Displayed as segmented controls on the issues header.
- **Issue Activity Timeline** — Full chronological activity log: status changes, assignee changes, PR events, comment additions, label changes.
- **Execution Run History** — View all past and active agent execution runs for an issue. Detailed execution message stream (tool calls, thinking, logs, errors). Incremental polling for live runs.
- **Token Usage Metrics** — Aggregated input/output/cache token usage across all agent runs on an issue.

---

## 2. Issue Views & Surfaces

Six distinct view modes for visualizing issues, each with dedicated controls and interactions:

- **Board (Kanban)** — Default view. Columns represent statuses. Drag-and-drop cards between columns. Subtask merging in parent column. Pending review indicators on cards. Agent working indicators.
- **List** — Compact row-based view with inline editing. Sortable columns.
- **Table** — Spreadsheet-style tabular view with grouping, faceted filters, and inline column editing. Working-agents facet for filtering by active agent runs.
- **Swimlane** — Grouped horizontal lanes (by assignee, priority, label, project, or custom grouping) with kanban columns within each lane.
- **Gantt** — Timeline bar chart view. Issues rendered as horizontal bars based on start/due dates. Milestone markers overlaid. Drag to resize/reposition bars to change dates.
- **Calendar** — Custom monthly/weekly grid layout using CSS Grid and `date-fns`. Issues mapped to their start/due date cells. Draggable issue chips via `@dnd-kit/core`; dropping on a new day updates the issue's date. Calendar-specific navigation: Today, Previous Month, Next Month.

### View Controls

- **Filter System** — Filter by status, assignee, priority, label, project, milestone, issue type, date range. Combinable filters with AND logic. Global date filter across all views (All Tasks, Project, My Tasks).
- **Group By** — Group issues by status, assignee, priority, label, project, milestone.
- **My Issues** — Dedicated personal task view with time-based filtering (Today/Weekly/Monthly) and assignee tabs (All/Members/Agents).

---

## 3. Agents as Teammates

AI coding agents are first-class teammates in Multica. They appear on the board, post comments, create issues, raise blockers, and autonomously execute tasks.

- **Agent Profiles** — Each agent has a name, avatar, assigned runtime, and provider. Agents appear in the assignee picker, activity timeline, and workspace member list.
- **Polymorphic Assignees** — The assignee picker treats members and agents identically. `assignee_type` can be `member`, `agent`, or `squad`.
- **Autonomous Execution** — Full task lifecycle: enqueue → claim → start → in_progress → completed / failed / cancelled. Agents pick up assigned tasks, execute autonomously, and report progress in real time.
- **Real-Time Progress Streaming** — Agent stdout/stderr streamed to the backend via WebSocket. Live task output visible in the UI.
- **Agent Comments** — Agents can post comments on issues, create sub-issues, and report blockers proactively — just like human teammates.
- **Agent Chat** — Direct real-time chat with agents (tied to runtimes). Send messages, receive responses with streaming. Chat drafts, attachment support, pinned agents.
- **Agent Thinking** — Real-time streaming of agent "thinking" output during execution.
- **Task Cancellation** — Users can cancel running agent tasks. Daemon detects cancellation and kills the agent process.
- **Agent Builder** — UI for creating and configuring agents (name, runtime, provider, model, custom arguments).
- **Agent Templates** — Predefined agent configurations for quick setup.
- **Agent Permissions** — Granular permission controls for what agents can access.
- **Agent Environment Variables** — Custom environment variables passed to agent processes.
- **Agent Presence** — Real-time online/offline status indicators for agents.
- **Supported Providers (16 runtimes):**
  1. Claude Code (`claude`)
  2. Codex (`codex`)
  3. CodeBuddy (`codebuddy`)
  4. GitHub Copilot CLI (`copilot`)
  5. OpenCode (`opencode`)
  6. OpenClaw (`openclaw`)
  7. Hermes (`hermes`)
  8. Pi (`pi`)
  9. Cursor Agent (`cursor-agent`)
  10. Kimi (`kimi`)
  11. Kiro CLI (`kiro-cli`)
  12. Antigravity (`agy`)
  13. Qoder CLI (`qodercli` / `qoderclicn`)
  14. Trae CLI (`traecli`)
  15. Grok Build CLI (`grok`)
  16. Qwen Code (`qwen`)

---

## 4. Squads

Squads add a stable routing layer for organizing agent and human teams.

- **Squad Creation** — Group agents and humans under a leader agent. Assign work to the squad (e.g., `@FrontendTeam`), and the leader delegates to the right member.
- **Leader Delegation** — The squad leader agent receives the assignment and routes it to the best available member.
- **Squad Briefings** — Leader agents can generate squad briefings summarizing member status and workload.
- **Squad Members** — Add/remove members. View member status within squads.
- **Polymorphic Assignment** — Assign issues directly to a squad. The squad leader picks it up and routes accordingly.
- **Private Leader Support** — Squad leaders can be private (invisible to non-admin members).

---

## 5. Autopilots

Autopilots automate recurring work by scheduling or triggering agent tasks automatically.

- **Cron Triggers** — Schedule recurring work with standard cron expressions and timezone support. Cron preview shows upcoming execution times.
- **Webhook Triggers** — Trigger autopilot runs via incoming webhooks. IP rate limiting and secret validation on webhook endpoints.
- **Manual Triggers** — One-click manual execution of any autopilot.
- **Two Modes:**
  - `create_issue` — Creates a new issue and routes it to an agent.
  - `run_only` — Executes the agent directly without creating an issue.
- **Subscribers** — Add members as subscribers to autopilot runs for notifications.
- **Execution History** — View all past autopilot runs with status and output.
- **Attribution Transfer** — Autopilot-created issues properly attribute the automation as the creator.
- **CLI Management** — `multica autopilot list/get/create/update/delete/trigger/runs` + trigger management commands.

---

## 6. Reusable Skills

Skills are YAML-based reusable instructions that agents can leverage across tasks.

- **Skill Creation** — Define skills with title, description, YAML-based instructions, and metadata.
- **Skill Injection** — Skills are automatically injected into the agent's context when executing tasks.
- **Local Skills Sync** — Workspace skills synced from server and cached locally on the daemon for fast injection.
- **Skill Search** — Search and browse available skills within a workspace.
- **Skill Import/Export** — Import skills from archives. Duplicate detection prevents re-importing existing skills.
- **Skill Overwriting** — Update existing skills with new versions while preserving references.
- **Runtime-Scoped Skills** — Skills can be scoped to specific runtimes.
- **Builtin Skills** — Built-in skills ship with the platform (in `server/internal/service/builtin_skills/`).

---

## 7. Media Review Module

A comprehensive video and graphic annotation/review tool integrated directly into issues. Designed for creative teams to review video, image, and PDF assets with frame-accurate feedback.

### 7.1 Asset Management

- **Asset Upload** — Drag-and-drop upload zone in issue detail page. Pre-signed URL generation for S3 direct upload (bypasses Next.js for large files). Upload progress indicator with cancel support.
- **Asset Types** — Video, Image, and PDF review assets.
- **Asset Versioning** — Upload new versions of an asset (v1, v2, v3...) with a version switcher. Full version history preserved.
- **Asset Deletion** — Delete individual versions or entire asset groups with confirmation.
- **Approval Status** — Per-asset status: `Pending` → `Approved` / `Changes Requested`. Bulk approval: approve all assets on an issue at once.
- **Thumbnail Generation** — Automatic thumbnail extraction for videos (frame at 1s mark).
- **Stale Upload Cleanup** — `DeleteStaleIncompleteReviewAssets` runs lazily, reaping abandoned pending assets older than 24h. Upload mutation remembers newly created asset ID and calls `deleteReviewAsset` if upload/completion fails.

### 7.2 Media Player

- **Custom Video Player** — HTML5 `<video>` with custom controls: play/pause, scrubber, frame step (←/→ Arrow keys for 1/30s frame-accurate stepping), playback speed (0.5x–2x), fullscreen.
- **Image Viewer** — Zoom/pan support for image review.
- **PDF Review** — PDF is a supported review asset type. Page navigation, page-index filtering for feedback.
- **Glassmorphism Controls** — Custom floating control bar with `backdrop-blur-md` frosted-glass effect (no native HTML5 controls).
- **Keyboard Shortcuts** — Arrow keys for frame stepping, ArrowUp/Down for ±10s seek, spacebar play/pause.
- **Timecode Formatting** — Toggle between Standard (00:00), Frames (0123), and SMPTE Timecode formats.
- **Frame-Accurate Preview** — `useFramePreview` hook renders a hidden video element + offscreen canvas (160x90) for thumbnail preview on scrubber hover (like YouTube/Vimeo).

### 7.3 Adaptive Quality (HLS Transcoding)

- **Server-Side Transcoding** — Native Go goroutine (`processVideoAsync` in `transcoder.go`) using `ffmpeg`. Splits input to 720p (CRF 22) and 480p (CRF 26).
- **HLS Streaming** — Segments uploaded to S3. Frontend uses `hls.js` with `capLevelToPlayerSize` for adaptive quality.

### 7.4 Annotation System

- **Drawing Tools** — Rectangle select (bounding box), circle, arrow, freehand draw, ellipse, text annotation. Integrated `@multica/canvas-drawing-editor` (zero dependencies, 33KB).
- **Color System** — Each annotation gets a distinct/random color. Comment cards border with the exact same color as the corresponding bounding box for instant visual correlation.
- **Normalized Coordinates** — All annotation coordinates stored as 0.0–1.0 normalized values (never pixels). Shapes scale perfectly across all devices and resolutions.
- **Canvas Overlay** — HTML5 `<canvas>` absolutely positioned over media with `pointer-events-auto`. `ResizeObserver` + `requestAnimationFrame` for performance.
- **Undo/Redo** — Shape history stack with undo/redo support.

### 7.5 Review Comments

- **Timestamped Comments** — Video comments tied to specific timestamps. Single-frame (point-in-time) or range-based (duration) comments.
- **Timeline Markers** — Comment timestamps rendered as visual dots on the video scrubber. Glowing boxShadow and hover scale animations. Range markers as translucent colored bands. Portal-based hover tooltips (prevents clipping).
- **Single-Frame Flash** — During playback, single-frame comments briefly flash visible for 0.5s so reviewers don't miss them.
- **Page-Specific Feedback** — For PDFs and multi-page assets, comments are scoped to the selected page via `review_comments.page_index`.
- **Threaded Replies** — Nested replies with `parent_id` for complex review discussions.
- **Resolve/Unresolve** — Mark feedback as addressed. Filter by All / Unresolved / Resolved.
- **Edit/Delete** — Authors can edit/delete review comments and replies.
- **Comment → Task Bridge** — "Create Task" button on each review comment. Pops open the Create Issue dialog pre-filled with comment content and a reference to the original media asset.
- **Pending/Optimistic Comments** — Review comments render immediately with visible pending state and retry on failure (React Query pending-message pattern).
- **Timeline Deep-Linking** — Review metadata persisted on timeline entries. Clicking a timeline entry opens the review, selects the comment, navigates to the page, seeks the video, and highlights the annotation.
- **Real-Time Updates** — WebSocket-driven real-time comment updates.

### 7.6 Guest Share Mode

- **Tokenized Guest Links** — Authenticated members create a random 256-bit capability token; only its SHA-256 hash is stored. Creating another link rotates the previous link.
- **Public Guest Route** — `/guest/review/[token]` loads the asset and feedback without requiring a Multica account.
- **Named Guest Feedback** — Guests provide a required display name and freeform feedback. Guest authors stored separately from member authors.
- **Endpoint Hardening** — Token validation, request-size/content validation, token-scoped asset access, no-store responses, per-IP rate limiting.

### 7.7 Review UI Polish

- **Resizable Sidebar** — `ResizablePanelGroup` for media player and review sidebar. Users can drag to expand/collapse.
- **Semantic Theming** — Uses `bg-background`, `bg-muted`, `border-border` tokens for perfect Light/Dark mode support.
- **Native Tooltips** — Custom player controls wrapped with `@multica/ui` Tooltip components.
- **Freeframe-style Comment Input** — Timecode badges as clickable pills. Unified input area with inline timecode, bottom toolbar (Clock, Pencil, Smile icons). Duration toggle more intuitive than numeric input.
- **Board View Integration** — Visual "Pending Review" indicator (eye icon / badge) on issue cards in the kanban board.

---

## 8. Rich Text Editor

A block-based rich text editor powered by TipTap, replacing basic text inputs across the platform.

### 8.1 Editor Features

- **TipTap Integration** — Built on `@tiptap/react` with `@tiptap/starter-kit`.
- **Rich Formatting** — Bold, italic, strikethrough, headings (H1–H3), bullet lists, numbered lists, blockquotes, code blocks with syntax highlighting (`CodeBlockLowlight`), inline code, horizontal rules.
- **Task Lists** — Interactive checkboxes via `TaskList` + `TaskItem` extensions.
- **Tables** — Basic table support with row/column management.
- **Links** — Auto-detect URLs. Inline link editing.
- **Images** — Inline images with upload support.
- **@Mentions** — Mention team members and agents via `@tiptap/extension-mention`. Autocomplete dropdown with filtering.
- **Placeholder** — Empty state hints for better UX.

### 8.2 Slash Command Palette

- **Trigger** — Floating command menu triggered by `/` keystroke.
- **Commands** — Heading 1–3, Bullet List, Numbered List, To-Do, Code Block, Quote, Divider, Image, Table, Mention.
- **Navigation** — Keyboard navigation (↑/↓/Enter/Escape). Filter commands by typed text after `/`.

### 8.3 Floating Format Toolbar (Bubble Menu)

- **Selection-based** — Appears on text selection with: Bold, Italic, Strikethrough, Code, Link, Heading toggle.
- **Dynamic Positioning** — Positioned above selection using TipTap's `BubbleMenu` component with CSS transition animations.

### 8.4 Integration Points

- **Issue Description** — Create and edit issue descriptions.
- **Comments** — New comment and edit comment.
- **Project Description** — Project-level descriptions.
- **Project Documents** — Full-page document editing (see §11).
- **Markdown Roundtrip** — TipTap → Markdown → DB → Markdown → TipTap with no data loss. Preserves KaTeX, Mermaid rendering for read-only views.

---

## 9. Project Management

Projects organize issues into logical groups with their own settings, members, and access controls.

- **Project CRUD** — Create, edit, archive, delete projects. Project title, description, icon, status, start/due dates, lead assignment.
- **Project Statuses** — `planned`, `in_progress`, `paused`, `completed`, `cancelled`.
- **Project-Level RBAC** — `project_members` table with roles: `admin`, `editor`, `viewer`. Permission matrix:
  | Action                | Admin | Editor | Viewer |
  | --------------------- | ----- | ------ | ------ |
  | View issues           | ✅    | ✅     | ✅     |
  | Create/edit issues    | ✅    | ✅     | ❌     |
  | Manage members        | ✅    | ❌     | ❌     |
  | Delete project        | ✅    | ❌     | ❌     |
  | Edit project settings | ✅    | ❌     | ❌     |
- **Project Membership Filter** — `ListProjects` returns only projects where the user has a `project_member` row (unless workspace admin/owner).
- **Task Membership Filter** — Workspace task queries hide tasks from inaccessible projects while keeping non-project tasks visible.
- **Direct Project Guard** — `GetProject` returns 404 to unauthorized members (existence not leaked).
- **Workspace Admin/Owner Override** — Workspace admins and owners can access all projects regardless of project membership.
- **Project Members UI** — "Members" tab in project settings with invite/remove/role-change functionality.
- **Project Navigation** — Distinct URLs for project tabs: Board, Documents, Milestones, Settings. URL-driven navigation (not `useState`) so refreshing preserves the active tab.
- **Project Resources** — Attach external resources to projects with label cascading.
- **CLI** — `multica project list/get/create/update/status/delete`.

---

## 10. Milestones

Milestones provide timeline-based planning within projects.

- **Milestone CRUD** — Create, edit, delete milestones within a project. Title, description, start/due dates, status.
- **Milestone Statuses** — `active`, `completed`, `cancelled`.
- **Issue Linking** — `milestone_id` column on issues links tasks to milestones. Issue type and milestone selection in the Create Issue modal.
- **Milestone Detail View** — Issues grouped by status within a milestone. Progress bar showing % of issues completed.
- **Gantt Integration** — Milestones rendered as markers on the existing Gantt view.
- **Milestone List** — Sidebar navigation showing all project milestones with sort order.

---

## 11. Project Documentation Hub

A per-project wiki/documentation system using the TipTap editor.

- **Document Tree** — Nested document hierarchy with `parent_id` for tree structure. Drag-to-reorder support.
- **Full-Page Editor** — TipTap-powered full-page document editor.
- **Document Title** — Large borderless inline title input with debounced save and blur flush.
- **Docs Tab** — "Documents" tab in project navigation alongside Issues/Milestones/Settings.
- **Markdown Export** — Export documents as `.md` files. Available in the document tree's three-dot menu. Filename follows sanitized document title.
- **Document CRUD** — Create, edit, delete documents with backend tree structure support.

---

## 12. Approval Workflows

Formal approval system for issues requiring sign-off before proceeding.

- **Approval Requests** — Request approval on an issue by selecting an approver.
- **Approval Status** — `pending` → `approved` / `rejected` per issue.
- **Approver Notifications:**
  - **In-App** — Inbox notifications for approval events.
  - **Email** — Transactional emails dispatched when an approval is requested or decided.
- **Approval UI** — "Request Approval" button on issues. "Pending My Approval" filter.
- **Backend API** — Request, approve, reject endpoints (`server/internal/handler/approvals.go`).

---

## 13. GitHub Integration

Seamless bidirectional bridge between Multica and GitHub repositories.

### 13.1 Auto-Link PRs to Issues

- **PR Parsing** — Parse PR title, body, and branch name for Multica issue references (e.g., `Fixes MUL-102`).
- **Automatic Linking** — On `pull_request.opened` / `edited`, extract refs, create linkage rows, publish `EventPullRequestUpdated`.

### 13.2 Auto-Move Kanban Cards

- **PR Opened → In Review** — Qualifying linked issues move to `in_review` (draft PRs excluded).
- **PR Merged → Done** — Linked issues auto-transition to `done`.
- **PR Closed (not merged)** — No automatic status change.
- **Configurable** — `github_auto_transitions_enabled` workspace setting gates all status moves. Linking itself is never gated.

### 13.3 CI Status Integration

- **CI Failing Label** — Failed `check_suite` webhook events attach "CI Failing" label to linked issues.

### 13.4 PR Review Status

- **`pull_request_review` Webhook** — Tracks approved/changes_requested/pending review status.
- **PR Card on Issue Detail** — Shows review status line (approved count, changes requested count).

### 13.5 PR Timeline Activities

- **Activity Log Entries** — `pr_linked`, `pr_merged`, `pr_closed` activity rows in the issue timeline.
- **i18n** — Localized strings for all three PR activity types (en + zh).

### 13.6 GitHub Identity & Cross-Posting

- **CLI Authentication via GitHub Device Flow** — `multica login github` for CLI authentication.
- **GitHub Token Storage** — `github_access_token` and `github_username` stored on the `members` table.
- **Repo Listing** — `GET /api/me/github/repos` lists repositories the connected user has write access to.
- **Create as GitHub Issue** — "Create as GitHub Issue" toggle on the manual issue creation modal. Creates issues on GitHub natively as the connected user.
- **Identity Mapping** — PR webhooks match GitHub `sender.login` to Multica `member.github_username` so PRs show the Multica user's avatar/name.
- **Settings UI** — Connect/disconnect GitHub from Workspace Settings > Profile.
- **Token Refresh** — Handles expired GitHub tokens gracefully (prompt to reconnect).

### 13.7 GitHub OAuth

- **GitHub OAuth** — `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` for user profile sync and authentication.

### 13.8 GitHub App Integration (Advanced)

- **GitHub App** — Full webhook-driven automation via GitHub App installation. Secret validation, event filtering.
- **Private Key Support** — PEM or base64-encoded key for Docker/Dokploy environments.

---

## 14. Communication & Chat

### 14.1 Agent Chat

- **Real-Time Chat** — Direct real-time chat with agents tied to runtimes.
- **Chat Sessions** — Multiple chat sessions per workspace.
- **Chat History** — Persistent chat history with pagination.
- **Chat Drafts** — Draft restoration on reconnect.
- **Attachments** — File attachments in chat messages.
- **Pinned Agents** — Pin frequently used agents for quick access.
- **Chat Titles** — Auto-generated and editable chat session titles.
- **Pending Messages** — Messages render immediately with pending state and retry on failure.
- **Project Context** — Chat sessions can be scoped to specific projects for contextual agent responses.

### 14.2 Issue Comments & Threading

- **Rich Comments** — Markdown/TipTap comments on issues with full formatting.
- **Threaded Replies** — Nested reply threads on comments.
- **Resolved Threads** — Mark comment threads as resolved.
- **@Mentions** — Mention members and agents in comments with notifications.
- **Reactions** — Emoji reactions on comments.
- **Agent Comments** — Agents can autonomously post comments, creating sub-issues and reporting blockers.
- **Comment Folding** — Long comment threads can be collapsed/folded.
- **Content Sanitization** — Comment content is sanitized before storage.

### 14.3 Channels (Backend Ready)

- **Channel Infrastructure** — `channels`, `channel_members`, `channel_messages` tables created. Backend CRUD + message handlers built. Redis Pub/Sub for real-time delivery. Core hooks and mutations in `packages/core/channels/`.
- **Status:** Backend complete; frontend views (channel list, message view, composer, thread view) not yet shipped.

---

## 15. Inbox & Notifications

- **Notification Inbox** — Centralized inbox for all workspace notifications (assignments, mentions, status changes, approvals, review comments).
- **Unread Tracking** — Unread count badges on inbox icon. Desktop dock/taskbar badge with "99+" formatting for counts > 99.
- **Swipeable Actions** — Mobile: swipeable inbox rows for quick actions (mark read, dismiss).
- **Desktop Native Notifications** — OS-level notification banners when the app is unfocused. Clicking notification focuses window and routes to the item.
- **Push Notifications (Mobile)** — Expo Push Notifications via `expo-notifications`. Device token registration. Deep linking from notification taps (`multica://[workspace]/issue/[id]`).
- **Notification Preferences** — Per-event-type toggle (mentions, assignments, status changes) in both web and mobile settings.
- **Email Notifications** — Approval events trigger transactional emails via Resend API or SMTP.

---

## 16. Search

- **Global Search** — Search issues across the entire workspace by title, identifier, description.
- **Project-Scoped Search** — Search within a specific project.
- **Command Palette** — Quick action command palette for fast navigation and issue lookup.
- **Search Timeout** — Configurable search timeout to prevent long-running queries.
- **CLI Search** — `multica issue list` with filter flags for CLI-based search.

---

## 17. MCP Server Integration

Multica natively supports the Model Context Protocol (MCP), allowing external AI tools to interact with workspaces.

### 17.1 Stdio MCP (Local AI Apps)

- **CLI Command** — `multica mcp --server-url <url> --token <token> --workspace-id <id>`.
- **Supported Clients** — Cursor, Claude Desktop, and any stdio-based MCP client.
- **Exposed Tools** — `list_tasks`, `get_task`, `create_task`, `update_task`, `list_projects`, `search_tasks`, `get_workspace_info`.

### 17.2 SSE MCP (Remote/Web Agents)

- **SSE Endpoint** — `https://api.your-domain.com/api/mcp`.
- **Authentication** — Bearer token + `X-Workspace-ID` header.
- **Use Cases** — LangChain, custom AI agents, online platforms.

### 17.3 OAuth2 MCP (Google Gemini Web)

- **Built-in OAuth2 Proxy** — Bridges Gemini's strict OAuth2 requirement without a real OAuth2 application.
- **Authorization URI** — `/api/mcp/oauth/authorize` (displays safe "Authorize Connection" screen).
- **Token URI** — `/api/mcp/oauth/token` (validates and echoes the client secret as a Bearer token).
- **Client Secret** — User's Personal Access Token serves as the OAuth2 client secret.

---

## 18. CLI

The `multica` CLI connects local machines to Multica for authentication, workspace management, issue tracking, and agent orchestration.

### 18.1 Setup & Authentication

- `multica setup` — One-command bootstrap (configure + login + start daemon). Idempotent.
- `multica setup self-host` — Self-hosted setup with `--server-url` and `--app-url`.
- `multica login` — Browser OTP authentication. `--no-browser` flag for headless environments.
- `multica login --token <token>` — Direct PAT authentication for CI/headless use.
- `multica login github` — GitHub Device Flow authentication.
- `multica token` — Print stored API token. `--verify` validates against server.
- `multica logout` / `multica auth logout` — Clear stored credentials.
- `multica auth status` — Display active server URL, user, and token validity.

### 18.2 Workspace Commands

- `multica workspace list` — List workspaces (current marked with `*`).
- `multica workspace switch <id|slug>` — Switch active workspace.
- `multica workspace create <name>` — Create new workspace.
- `multica workspace get [<id>]` — Fetch workspace details.
- `multica workspace member list <id>` — List workspace members.

### 18.3 Issue Commands

- `multica issue list` — List/filter issues (`--status`, `--priority`, `--assignee`, `--project`, `--mine`, `--limit`, `--sort`, `--direction`).
- `multica issue create` — Create issue with all fields.
- `multica issue view/get <id>` — View issue details.
- `multica issue update <id>` — Update issue fields.
- `multica issue status <id> <status>` — Set status.
- `multica issue assign <id>` — Assign/unassign (`--to`, `--to-id`, `--unassign`).
- `multica issue reorder <id>` — Reorder in column (`--top`, `--bottom`, `--before`, `--after`).
- `multica issue comment list/add/delete` — Comment management with thread paging, tail, before, since.
- `multica issue metadata list/get/set/delete` — Key-value metadata management.
- `multica issue subscriber list/add/remove` — Subscriber management.
- `multica issue runs <id>` — Execution run history.
- `multica issue run-messages <task-id>` — Detailed execution message stream.
- `multica issue usage <id>` — Aggregated token usage.

### 18.4 Project Commands

- `multica project list/get/create/update/status/delete` — Full project lifecycle management.

### 18.5 Agent Commands

- `multica agent list` — List workspace agents.
- `multica agent create` — Create agent (name, runtime, provider).
- `multica agent delete <id>` — Delete agent.
- `multica agent logs <id>` — View agent execution logs.

### 18.6 Autopilot Commands

- `multica autopilot list/get/create/update/delete/trigger/runs` — Full autopilot management.
- `multica autopilot trigger-add/trigger-update/trigger-delete` — Cron trigger management.

### 18.7 Profile & Config Commands

- `multica profile list/create/delete/switch` — Multi-profile management.
- `multica config show/set/path` — Configuration management.
- `multica version` — Version and build info.
- `multica update` — Check/install CLI updates.

### 18.8 CLI Features

- **Output Formats** — `--output table` (default) or `--output json` for scripting.
- **Global Flags** — `--profile`, `--verbose`, `--json`, `--server-url`, `--token`, `--workspace-id`.
- **Error Handling** — Tiered exit codes: 0 (success), 1 (generic), 2 (network), 3 (auth), 4 (not found), 5 (validation).
- **Locale Auto-Detection** — Chinese error messages if `LC_ALL`/`LC_MESSAGES`/`LANG` matches `zh`.
- **Debug Mode** — `--debug` or `MULTICA_DEBUG=1` for verbose error output.
- **HTTP Timeout** — `MULTICA_HTTP_TIMEOUT` configurable (default 30s).

---

## 19. Agent Daemon & Runtime

The daemon runs on local machines and connects to the Multica server to execute agent tasks.

### 19.1 Daemon Lifecycle

- `multica daemon start` — Start background daemon. Auto-detects agent CLIs on PATH.
- `multica daemon stop` — Graceful shutdown.
- `multica daemon status` — PID, uptime, registered agents, watched workspaces.
- `multica daemon restart` — Stop and restart.
- `multica daemon logs` — View logs (`-f` for tail, `-n` for line count).
- `multica daemon version` — Running daemon version.

### 19.2 Runtime Features

- **Auto-Detection** — Scans PATH for all 16 supported agent CLIs at startup. Wrapper detection skips `~/.multica/hooks`.
- **Runtime Registration** — Registers as a compute runtime with the API, reporting available CLI capabilities.
- **Runtime Heartbeat** — Periodic heartbeats (default 15s) for liveness detection.
- **Custom Runtime Name** — `--name` flag or `MULTICA_AGENT_RUNTIME_NAME` env var.
- **Work Directory Override** — `--work-dir` or `MULTICA_WORKSPACES_ROOT` (default `~/multica_workspaces`).
- **Multi-Profile** — Run multiple daemon instances targeting different environments.

### 19.3 Task Execution

- **Task Claiming** — Polls for available tasks (default every 3s). Batch claiming for efficiency.
- **Agent Process Management** — Spawns the correct agent CLI as an isolated subprocess for each task.
- **Real-Time Streaming** — Agent output streamed to backend via WebSocket.
- **Task Lifecycle** — `claimed` → `in_progress` → `completed` / `failed` / `cancelled`.
- **Task Cancellation** — Detects cancellation and kills agent process.
- **Graceful Shutdown** — Finishes in-progress tasks or marks for retry.
- **Skill Injection** — Injects YAML-based skills into agent context.
- **Comment Delivery** — Delivers issue comments to running agents.
- **Attachment Handling** — File attachment support in agent conversations.
- **Max Concurrent Tasks** — Configurable (default 20).

### 19.4 Workspace Garbage Collection

- **Full Task Cleanup** — Deletes task directories for `done`/`cancelled` issues after `MULTICA_GC_TTL` (default 24h).
- **Orphan Cleanup** — Removes directories missing `.gc_meta.json` after `MULTICA_GC_ORPHAN_TTL` (default 72h).
- **Artifact-Only Cleanup** — Deletes regenerable build directories (`node_modules`, `.next`, `.turbo`) after `MULTICA_GC_ARTIFACT_TTL` (default 12h). Preserves source, `.git`, output, and logs.
- **Configurable** — `MULTICA_GC_ENABLED`, `MULTICA_GC_INTERVAL` (default 2h), custom artifact patterns.

### 19.5 Agent Binary & Model Overrides

- Per-agent environment variables for binary path, model selection, and custom arguments (e.g., `MULTICA_CLAUDE_PATH`, `MULTICA_CLAUDE_MODEL`, `MULTICA_CLAUDE_ARGS`).
- **Argument Precedence** — Hardcoded defaults → Daemon env vars → Task `custom_args`.
- **POSIX Shellword Parsing** — Args parsed with POSIX rules for proper quoting/escaping.
- **Model Catalog** — Reports available models from each provider to the backend.

---

## 20. Desktop App (Electron)

A native desktop application built with Electron, electron-vite, and React, providing a first-class multi-workspace experience.

### 20.1 Multi-Tab Interface

- **Browser-Style Tabs** — Multiple workspace tabs open simultaneously with full session state (URL, title, history stack, scroll memento).
- **Tab Operations** — New tab, close tab (Cmd/Ctrl+W), close others, close tabs to right, restore last closed, move left/right, next/prev cycling, reload tab.
- **Drag-and-Drop Reorder** — Tab reordering via `@dnd-kit/sortable`.
- **Tab Pinning** — Pinned tabs stay parked at the left, omit close buttons.
- **Per-Workspace Isolation** — Tab arrays stored per workspace, preserving layout on workspace switching.
- **Tab State Persistence** — Tabs survive app restart.
- **Scroll Memento** — Remembers scroll position per route inside each tab.

### 20.2 Window Management

- **Custom Title Bar** — `<DragStrip />` component for frameless window drag area. Interactive controls use `WebkitAppRegion: "no-drag"`.
- **Window Overlays** — Pre-workspace flows (create workspace, accept invite) as overlays, not routes.
- **Window State Persistence** — Size, position, maximized, fullscreen state remembered.
- **Detachable Issue Windows** — Open individual issues in dedicated standalone native windows.
- **Cross-Window Auth Coordinator** — Auto-closes detached windows on logout/account switch.
- **Immersive Mode** — Dynamic hiding of macOS traffic lights during full-screen overlays.

### 20.3 Built-in Daemon Management

- **CLI Auto-Bootstrap** — Downloads, verifies (SHA-256 checksum), extracts, and ad-hoc codesigns the `multica` CLI binary automatically.
- **Automated Daemon Lifecycle** — Spawns, monitors (health polling), auto-starts, stops, and restarts the background daemon.
- **Multi-Profile Auth Sync** — Synchronizes PAT between Desktop and CLI.
- **Live Daemon Log Viewer** — Dedicated modal with tail replay (~200 lines), real-time log streaming, log level filter chips (DEBUG/INFO/WARN/ERROR), search filtering, duplicate line folding, auto-scroll toggle.
- **Local Runtime Probing** — Reports status of local agent runtimes.

### 20.4 Deep Link & Protocol Handling

- **`multica://` Protocol** — Handles `multica://auth/callback?token=...` (auth) and `multica://invite/<id>` (invitations).
- **Windows Pathname Normalization** — Strips trailing slashes from Windows custom protocol URLs.
- **Single-Instance Locking** — Prevents multiple app instances.

### 20.5 Auto-Updater

- **GitHub Releases Integration** — Background update checking and downloading.
- **Architecture-Specific Channels** — Separate feeds for ARM64/x64.
- **Settings UI** — Toggle auto-updates, manual check, progress monitoring, instant install.
- **Install on Quit** — `autoInstallOnAppQuit` with force restart option.

### 20.6 Native OS Integration

- **Native Notifications** — OS notification banners for unread inbox items when unfocused.
- **Dock/Taskbar Badges** — Unread count badges.
- **macOS Trackpad Gestures** — 2-finger swipe for back/forward navigation.
- **Native File Dialogs** — OS-native directory picker, Save dialogs for downloads.
- **PDF Viewer** — Chromium PDFium plugin for iframe PDF previews.
- **Context Menu** — Localized Cut/Copy/Paste/Select All + link options (en, zh-CN, ja, ko).
- **Keyboard Shortcuts** — Custom shortcuts: zoom controls, tab closure, reload blocking.
- **PATH Repair** — `fix-path` imports shell PATH on macOS/Linux GUI launches.

### 20.7 Diagnostics & Resilience

- **Freeze/Crash Breadcrumbs** — JSON failure breadcrumbs (`last-client-failure.json`) on renderer crashes.
- **CDP Stack Capture** — Chrome DevTools Protocol debugger captures JS callstacks on renderer hangs.
- **Renderer Recovery** — Automatic recovery from renderer crashes.
- **Worktree Support** — Self-isolated per worktree with own renderer port and app name.

### 20.8 Build & Distribution

- **Platforms** — macOS (.dmg, .zip), Windows (.exe/.msi via NSIS, .zip), Linux (.AppImage, .tar.gz).
- **GitHub Actions** — `release.yml` workflow builds and publishes desktop binaries.
- **Code Signing** — macOS notarization support.

---

## 21. Mobile App (Expo / React Native)

A native iOS/Android mobile application built with Expo SDK 55 and React Native.

### 21.1 Core Mobile Features

- **Issue Management** — Full issue list with pagination, pull-to-refresh, skeleton loading. Issue detail with all fields. Create issues with assignee, project, priority, labels, due date. Tap-to-change status. Optimistic updates via React Query `onMutate`.
- **Project Management** — Project list, project detail, project-level filtering.
- **Board View** — Kanban board with status-based columns.
- **My Issues** — Personal filtered view with time-based and assignee quick filters.
- **Inbox** — Notification inbox with swipeable rows (`runOnJS(true)` for Reanimated compatibility).
- **Agent Integration** — Agent list, status/presence indicators, agent assignment, agent chat.
- **Search** — Global workspace search by title/identifier.
- **Comments & Activity** — Comment threading, activity timeline, PR event formatting.
- **Attachments** — File attachment viewing, image rendering, upload support.
- **Settings** — Account/profile, workspace switching, notification preferences, theme toggle, logout.

### 21.2 Media Review (Mobile Native)

- **HLS Video Playback** — Native HLS via `expo-video`.
- **Custom Gesture Scrubber** — `react-native-gesture-handler` Gesture.Pan() for native scrubbing.
- **SVG Drawing Overlay** — `react-native-svg` for annotation shapes (rectangle, circle, arrow, freehand, ellipse). Normalized coordinates (0.0–1.0) via `review-shape-geometry.ts`.
- **Point Decimation** — Optimized pen tool prevents UI lag.

### 21.3 Push Notifications

- **Expo Push** — Device registration via `expo-notifications`. Backend dispatch via `notification_listeners.go` listening for `EventInboxNew`.
- **Deep Linking** — Notification taps route to `multica://[workspace]/issue/[id]`.
- **Preferences** — Per-event-type toggles (mentions, assignments, status changes).
- **Permission Prompt** — Only shown to authenticated users.

### 21.4 Offline Support

- **Offline Mutation Queueing** — `@react-native-community/netinfo` + `shouldDehydrateMutation`. Issues created offline sync automatically on reconnection.
- **Persistent Cache** — MMKV-based query cache persistence.
- **Skeleton Loading** — Animated skeleton placeholders during loading.

### 21.5 Native Polish

- **Haptic Feedback** — `expo-haptics` for scrubber bumps at comment markers and success vibrations.
- **Dark Mode** — Automatic OS theme detection with secure fallback. No white-flash on launch.
- **File-Based Routing** — Expo Router v5 with typed routes. Tab, stack, and modal navigation.
- **Deep Links** — `multica://` scheme for external navigation.
- **Real-Time Updates** — WebSocket connection for live issue and chat updates.

---

## 22. Progressive Web App (PWA)

- **Service Worker** — `next-pwa` generates service workers and manifest files.
- **Install Prompt** — Custom "Install as App" UI (`PwaInstallPrompt`) listening to `beforeinstallprompt`.
- **Offline Resilience** — IndexedDB query caching via `@tanstack/react-query-persist-client`. App shell loads offline with previously cached issues.

---

## 23. User & Workspace Management

### 23.1 Authentication

- **Email OTP** — Browser-based OTP authentication flow.
- **GitHub OAuth** — OAuth-based authentication and profile sync.
- **Google OAuth** — Google Single Sign-On (`/auth/google/login` and `/auth/google/callback`).
- **Personal Access Tokens (PAT)** — Generate API keys from Account Settings for CLI, MCP, and programmatic access.
- **Deep Link Auth (Desktop)** — `multica://auth/callback` for desktop app authentication.

### 23.2 Workspace Management

- **Multi-Workspace** — Organize work across teams with workspace-level isolation. Each workspace has its own agents, issues, settings, and members.
- **Workspace CRUD** — Create, rename, delete workspaces. Reserved slugs prevent conflicts.
- **Workspace Settings** — General settings, integrations, runtimes, agents, members, billing.
- **Workspace Roles** — Owner, Admin, Member roles with different access levels.

### 23.3 Member Management

- **Member Invitations** — Invite members via email. Assign project/squad access during invitation.
- **Bulk Assignment** — "Manage Access" for each member: dual-pane selector for all available Projects and Squads.
- **Member Profiles** — Avatar upload, display name, email, role, GitHub identity.
- **Member Revocation** — Remove members from workspaces.

### 23.4 User Preferences

- **Sidebar Position** — Left/Right sidebar position preference stored in localStorage.
- **Theme** — Light/Dark mode toggle.
- **Language** — Locale selection in Preferences.
- **Notification Preferences** — Per-event-type notification toggles.
- **Timezone** — User timezone setting.
- **Task Creation Mode Persistence** — Remembers last selected creation mode (manual/agent).

### 23.5 Onboarding

- **Guided Onboarding** — Multi-step onboarding flow for new users.
- **Multi-Role Selection** — Select up to 3 ordered roles during onboarding or in profile settings.
- **Workspace Discovery** — Auto-discover available workspaces after login.
- **Marketing Guide** — Contextual guidance for non-developer users.

### 23.6 Billing

- **Cloud Billing** — Subscription management for Multica Cloud users.
- **Usage Dashboard** — Aggregated token usage, task counts, runtime metrics via `task_usage_hourly` rollup.
- **Contact Sales** — Enterprise contact flow.

---

## 24. Roles & Terminology

- **Multi-Role User Profile** — Users can select up to 3 ordered roles. `QuestionnaireAnswers.role` accepts `Role | Role[] | null`.
- **Role Taxonomy** — `creative`, `graphic_designer`, `marketing_team`, `video_writer`, `videographer`, `social_media`, `developer`, and more.
- **Dynamic Terminology** — First role drives UI terminology via `UserLocaleSync` i18n overrides (e.g., "Issues" → "Tasks" for non-dev roles).
- **Terminology Dialects** — `en-marketing` and `en-creative` dialects via `i18next` fallbacks. Non-developer teams can use familiar vocabulary.
- **Dev Terminology Cleanup** — Developer jargon replaced with user-friendly alternatives (e.g., "Runtime" → "Agent Environment").

---

## 25. Integrations

### 25.1 GitHub

See [§13 GitHub Integration](#13-github-integration) for full details.

### 25.2 Slack

- **Slack Integration** — Connect Slack workspaces. Notification delivery to Slack channels.

### 25.3 Lark

- **Lark Integration** — Connect Lark (Feishu) workspaces. Notification delivery and bot interactions.

### 25.4 Composio

- **External Tool Access** — Agents can use external tools (Gmail, Calendar, Notion, etc.) via Composio integration.
- **Tool Allowlisting** — Workspace-level control of which Composio tools agents can use.
- **API Key** — `COMPOSIO_API_KEY` configuration.

### 25.5 Pinned Items

- **Pin System** — Pin frequently accessed projects, issues, or other resources for quick sidebar access.

### 25.6 Quick Actions

- **Quick Action System** — Workspace-level quick actions for common operations. Access-controlled quick action execution.

### 25.7 Webhooks (Outgoing)

- **Webhook Delivery** — Configurable outgoing webhooks for issue events. Delivery worker with retry logic. Rate limiter for webhook endpoints.

### 25.8 VCS Integration (Generic)

- **Version Control** — Generic VCS integration layer (`vcs.go`, `vcs_webhook.go`) for broader source control support beyond GitHub.

---

## 26. Self-Hosting & Deployment

### 26.1 Deployment Methods

- **Docker Compose** — Primary method via `docker-compose.selfhost.yml`. Auto-creates `.env`, generates `JWT_SECRET`, pulls GHCR images.
- **Source Build** — `make selfhost-build` with overlay compose file.
- **Kubernetes (Helm)** — OCI chart `oci://ghcr.io/multica-ai/charts/multica` or source chart at `deploy/helm/multica/`. k3s/k8s with Traefik/NGINX ingress. PostgreSQL, backend, frontend resources with PVC storage.
- **Dokploy** — Native Traefik labels in docker-compose for Dokploy dashboards. Auto-Traefik routing and SSL.
- **Manual/Bare-Metal** — Go + Node.js + PostgreSQL without Docker.
- **One-Command Install** — `curl -fsSL .../install.sh | bash -s -- --with-server` + `multica setup self-host`.

### 26.2 Database

- **PostgreSQL 17** with `pgvector` extension.
- **External DB Support** — NeonDB, Supabase, AWS RDS, self-managed.
- **Connection Pool Tuning** — `DATABASE_MAX_CONNS` (default 25), `DATABASE_MIN_CONNS` (default 5).
- **Auto Migrations** — Run on server startup.

### 26.3 Storage Options

- **Local Filesystem** — Default for small deployments.
- **Amazon S3** — Full S3-compatible storage.
- **Cloudflare R2** — S3-compatible with custom endpoint.
- **MinIO** — Self-hosted S3-compatible storage.
- **CloudFront CDN** — Signed URLs for private media delivery.
- **Attachment Download Modes** — `auto`, `cloudfront`, `presign`, `proxy`.

### 26.4 Email Delivery

- **Resend API** — Cloud email delivery.
- **SMTP** — Self-hosted relay with TLS support (STARTTLS, implicit TLS). Insecure TLS option for self-signed certificates.
- **Dev Mode** — Verification codes logged to stdout when no email service configured.

### 26.5 Reverse Proxy Support

- **Caddy** — Single-domain and separate-domain configurations with WebSocket support.
- **Nginx** — Separate-domain with WebSocket proxy.
- **Traefik** — Native Docker Compose labels for Dokploy.
- **Same-Origin Layout** — Recommended: Next.js rewrites handle `/api`, `/auth`, `/uploads` proxying.

### 26.6 Security Controls

- **Signup Control** — `ALLOW_SIGNUP=true/false`.
- **Email Domain Allowlist** — `ALLOWED_EMAIL_DOMAINS`.
- **Email Allowlist** — `ALLOWED_EMAILS`.
- **Workspace Creation Control** — `DISABLE_WORKSPACE_CREATION=true/false`.
- **Cookie Security** — `COOKIE_DOMAIN`, auto `Secure` flag, CSRF token validation.
- **Deterministic Test Code** — `MULTICA_DEV_VERIFICATION_CODE` (non-production only).

### 26.7 Observability

- **Health Endpoints** — `/health` (liveness), `/readyz` and `/healthz` (readiness with PostgreSQL + migration checks).
- **Prometheus Metrics** — `METRICS_ADDR` for dedicated metrics listener.
- **Structured Logging** — JSON log output. Configurable `LOG_LEVEL` (debug/info/warn/error).

### 26.8 Usage Dashboard Rollup

- **In-Process Scheduler** — Ticks every 30s, contends for 5-minute UTC plan via `sys_cron_executions`. DB advisory lock `4246` prevents double-writing.
- **Backfill Utility** — `./backfill_task_usage_hourly` for historical data. Monthly slices, throttling, dry-run support.
- **Compatibility** — Supports legacy `pg_cron`, systemd timers, Kubernetes CronJob triggers.

---

## 27. CI/CD & Infrastructure

- **GitHub Actions CI** — Node 22, Go 1.26.1, PostgreSQL 17 with pgvector service.
- **Container Publish** — `build-and-push.yml` workflow builds and pushes Docker images to GHCR.
- **Desktop Releases** — macOS, Windows, Linux builds in electron-builder release matrix.
- **Homebrew Tap** — `multica-ai/tap/multica` for CLI distribution.
- **CLI Release Tags** — Production deployment via CLI release tag on `main` branch (`v0.x.x`).
- **Turborepo** — Monorepo build orchestration with `pnpm` workspaces.
- **Typecheck, Lint, Test** — `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest), `make test` (Go), `pnpm exec playwright test` (E2E).
- **Full Verification** — `make check` runs complete verification pipeline.
- **Worktree Support** — Multiple Git worktrees share one PostgreSQL container with isolated DB names/ports via `.env.worktree`.

---

## 28. Internationalization (i18n)

- **Supported Languages** — English (`en`), Simplified Chinese (`zh-CN`), Japanese (`ja`), Korean (`ko`).
- **i18next** — Frontend internationalization with namespace-based translations.
- **Locale Dialects** — `en-marketing` and `en-creative` terminology variants.
- **CLI Locale Detection** — Auto-detects Chinese locale from `LC_ALL`/`LC_MESSAGES`/`LANG`.
- **Desktop Context Menu** — Localized in English, Chinese, Japanese, Korean.
- **Issue Types i18n** — Localized issue type names across all supported languages.

---

## 29. Performance & Optimization

- **React Query Persistence** — IndexedDB caching via `@tanstack/react-query-persist-client` + `idb-keyval`. Instant page loads from local cache with background revalidation.
- **WebSocket Realtime Sync** — All server state changes pushed via WebSocket. `visibilitychange` listener invalidates stale caches when returning to the tab after 30s away.
- **Backend Round-Trip Reductions:**
  - Workspace middleware: slug + membership in one JOIN (`GetWorkspaceAndMemberBySlug`).
  - `ListIssues` total via `count(*) OVER()` (eliminated separate COUNT query).
  - Labels + assignees hydrate concurrently (parallel batched lookups).
- **Database Indexes** — Targeted compound indexes for sub-100ms query resolution.
- **HLS Adaptive Streaming** — Server-side video transcoding to 720p/480p with `hls.js` client-side adaptive quality.
- **Mobile Optimistic Updates** — Instant UI updates on status/assignee changes with rollback on failure.
- **Mobile Offline Cache** — MMKV-based persistent cache with automatic sync on reconnection.

---

## 30. Security

- **JWT Authentication** — Signed tokens with configurable `JWT_SECRET`.
- **CSRF Protection** — `X-CSRF-Token` validation on all non-GET requests via `multica_csrf` cookie.
- **Cookie Security** — `SameSite=Strict`, auto `Secure` flag for HTTPS, configurable `COOKIE_DOMAIN`.
- **Pre-Signed URLs** — S3 pre-signed URLs for secure file upload/download with configurable TTL.
- **Private Avatar Delivery** — `/api/avatars/<signature>/<key>` with signature validation for private bucket avatars.
- **Admission Controls** — Signup gating, email domain allowlist, workspace creation control.
- **Rate Limiting** — Per-IP rate limiting on public endpoints (guest review, webhooks).
- **Webhook Secret Validation** — HMAC signature verification on GitHub webhooks.
- **Token Hashing** — Guest share tokens stored as SHA-256 hashes (not plaintext).
- **Input Sanitization** — Comment content sanitization, request size/content validation.
- **API Schema Validation** — Zod schemas with `parseWithFallback` for all API responses.
- **UUID Validation** — Strict UUID validation in handlers (`parseUUIDOrBadRequest`).
- **Reserved Slugs** — `reserved_slugs.json` prevents workspace slug collisions with routes.
- **Navigation Guards (Desktop)** — Security guards preventing navigation to untrusted URLs.
- **External URL Safety (Desktop)** — OS-level URL safety validation before opening external links.

---

## 31. Planned / Not Yet Shipped

Features that are designed and documented in `plan.md` but not yet implemented:

### 31.1 Dynamic Custom Fields (Phase 8)

- Per-issue-type custom field definitions (text, select, date, URL, boolean).
- `custom_field_definitions` and `issue_custom_field_values` tables.
- Settings UI for building custom fields. Dynamic form rendering on issue create/detail.

### 31.2 Project & Issue Templates (Phase 9)

- `issue_templates` — Pre-filled title, description, issue type, custom fields, default assignees.
- `project_templates` — Pre-configured milestones, issue templates, roles.
- Template Gallery for browsing and instantiating templates.

### 31.3 Autopilot Automation Presets (Phase 10)

- Marketplace-like gallery for enabling predefined automations.
- Preset examples: weekly SEO audit reports, content calendar reminders.
- Configuration UI for automation parameters (schedule, targets).

### 31.4 Communication Layer (Phase 6 — Backend Ready)

- **Channels** — Backend complete. Frontend views (channel list, message composer, thread view) not shipped.
- **Direct Messages** — DM channels between two members. Presence indicators.
- **Issue-Linked Conversations** — Link channel conversations to specific issues.

### 31.5 Google Workspace Integrations (Phase 14)

- **Google SSO** — `/auth/google/login` and `/auth/google/callback` endpoints.
- **Google Calendar 2-Way Sync** — Push due-date events to Google Calendar. Read free/busy times for scheduling.
- **Milestone Sync** — Sync milestones as multi-day Google Calendar events.

### 31.6 Remaining Phase 13 Items

- Complete first-role terminology across all locales and surfaces.
- Audit every project-derived surface for membership rule consistency.
- Persisted editable per-project issue prefixes.
- Requested-reviewer workflow with decision aggregation.
- Structured guest decisions (approved/looks_good/changes_needed).
- True bounded PDF/multi-image carousel with swipe navigation.
- Guest link expiry/revoke UI.
- Cross-platform share URL (canonical public frontend origin for Electron).
