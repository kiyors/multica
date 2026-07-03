Forking Multica to build a custom platform that marries AI agent orchestration with digital marketing workflows is a massive, high-impact architecture project. Multica provides an excellent backend for routing tasks to AI, but its frontend is entirely hostile to non-developers.

Here is a detailed breakdown of how Multica, Huly, and AFFiNE stack up against your specific requirements, revealing exactly what you can borrow from each and what you will have to build from scratch.

## Feature Breakdown by Platform

### 1. Multica (The Base Architecture)

Multica treats AI agents (like Claude or local models) as first-class teammates alongside humans.

- **Creative/Marketing Communication:** **None.** It is strictly built around developer concepts (commits, PRs, code blockers). Marketers will find the UI alienating.
    
- **Graphic/Video Reviews:** **None.** It is designed for text and code generation.
    
- **Inter-Team Communication:** **Basic.** Communication happens in task threads and comments. There is no real-time chat or channel-based messaging.
    
- **Project Status:** **Good for execution, poor for strategy.** It features excellent real-time WebSocket monitoring of what an AI agent is doing right now on a Kanban board, but lacks Gantt charts or timeline views for long-term campaigns.
    
- **Mobile Support:** **None.** It is exclusively a web and desktop environment.
    
- **Integrations:** **Highly Developer-Focused.** Integrates well with GitHub, Slack, Docker, and various LLM APIs, but lacks marketing integrations (like social platforms or CRMs).
    
- **CLI Support:** **Excellent.** This is Multica's superpower. The daemon runs locally, auto-detects agent CLIs on your `PATH`, and allows for extensive terminal-based workflow management.
    
- **Desktop Support:** **Yes.** Offers cross-platform packaging for local daemon execution and web UI access.
    

### 2. Huly (The Operations Engine)

Huly is an all-in-one workspace designed to replace Jira, Slack, and Notion simultaneously.

- **Creative/Marketing Communication:** **Excellent.** It includes built-in chat, virtual office spaces (voice/video calls), and dedicated environments for HR and CRM. Marketing teams feel right at home here.
    
- **Graphic/Video Reviews:** **Weak.** You can attach files via its MinIO object storage, but there are no built-in visual proofing tools, markup features, or frame-by-frame video review capabilities.
    
- **Inter-Team Communication:** **Excellent.** Features real-time collaborative editing, unified chat channels, and presence indicators.
    
- **Project Status:** **Excellent.** Provides robust roadmaps, Gantt charts, Kanban boards, and sprint tracking that works across multiple departments.
    
- **Mobile Support:** **None/Minimal.** The platform is heavily optimized for desktop/web.
    
- **Integrations:** **Good.** Built-in AI chatbots, GitHub OAuth, Google Calendar, and standard business webhooks.
    
- **CLI Support:** **None for users.** Its CLI is strictly for developers deploying the infrastructure (using Microsoft Rush and Docker).
    
- **Desktop Support:** **Yes.** Offers dedicated desktop packages.
    

### 3. AFFiNE (The Visual Canvas)

AFFiNE is a privacy-first, local-first alternative to Notion and Miro.

- **Creative/Marketing Communication:** **Good for asynchronous work.** The infinite whiteboard is excellent for creative brainstorming, mood boards, and campaign planning.
    
- **Graphic/Video Reviews:** **Partial for graphics, None for video.** You can drop static or carousel graphics onto the edgeless canvas and visually arrange or annotate near them. However, it completely lacks video playback and timestamped review tools.
    
- **Inter-Team Communication:** **Asynchronous.** Relies on collaborative document editing and blocks. It does not have real-time messaging channels.
    
- **Project Status:** **Basic.** You can build visual timelines or simple Kanban boards on the canvas, but it lacks strict, automated project tracking or reporting.
    
- **Mobile Support:** **Yes.** Native Android and iOS applications are available (with cross-device sync), though mobile performance can sometimes lag behind the desktop version.
    
- **Integrations:** **Growing.** Strong local-first architecture and an emerging plugin ecosystem, but lacks out-of-the-box enterprise integrations.
    
- **CLI Support:** **None.**
    
- **Desktop Support:** **Excellent.** Native clients for Windows, Mac, and Linux.
    

## Summary Matrix

|**Requirement**|**Multica (Base)**|**Huly (Inspiration)**|**AFFiNE (Inspiration)**|
|---|---|---|---|
|**Marketing Comm.**|❌ No|✅ Yes (Chat/Voice)|🟡 Partial (Visuals)|
|**Asset Reviews**|❌ No|❌ Attachments only|🟡 Canvas (Static only)|
|**Team Chat**|❌ Task threads only|✅ Yes (Full Chat)|❌ Docs only|
|**Project Status**|🟡 Kanban only|✅ Roadmaps/Gantt|🟡 Manual Canvas|
|**Mobile App**|❌ No|❌ No|✅ Yes (iOS/Android)|
|**Integrations**|🟡 Dev-only|✅ Business/Dev|🟡 Growing Plugins|
|**CLI Support**|✅ Exceptional|❌ Dev deployment only|❌ No|
|**Desktop App**|✅ Yes|✅ Yes|✅ Yes|

## Strategy for Your Custom Build

If you are using Multica as your base backend (Go/TypeScript architecture managed via `pnpm`), you already have the most difficult piece solved: **routing autonomous AI agents.**

To bridge the gaps for your digital marketing and creative teams, here is how you should structure your modifications:

1. **The Communication Layer:** Strip out Multica's developer-heavy terminology (commits, pull requests). Borrow Huly's concept of unified messaging by integrating a lightweight real-time chat service (like Redis Pub/Sub or WebSockets) directly into the task views so marketers can talk to developers without leaving the ticket.
    
2. **The Visual Canvas (AFFiNE integration):** AFFiNE's core is open-source and built with Rust and TypeScript. You can integrate a block-based canvas editor (like BlockSuite, which AFFiNE uses) directly into Multica's issue descriptions. This allows marketers to drag and drop static graphics into a whiteboard view right inside a Multica ticket.
    
3. **The Missing Video Review Tool:** None of these three tools do frame-by-frame video review. You will need to build this from scratch. Consider integrating a custom media player that captures timestamps and maps them to Multica issue comments.
    
4. **Mobile Support:** Because Multica lacks a mobile API tailored for end-users, you will need to expose its backend APIs (task creation, agent status) to a custom React Native or Flutter frontend so your marketing team can check project statuses on the go.