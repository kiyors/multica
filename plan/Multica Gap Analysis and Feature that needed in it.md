Here is a comprehensive documentation of the gaps you have identified in Multica, combined with a technical roadmap on how to upgrade your custom fork to support these features.

This is structured as a feature specification document that you can use directly for your development planning.

## Multica Fork: Gap Analysis and Feature Roadmap

### 1. The Editor & Markdown Experience

- **Current State:** The built-in markdown preview is robust, effectively rendering standard syntax like H1, H2, and standard blocks.
    
- **The Problem:** It lacks the interactive, block-based authoring experience that modern marketing teams rely on. There are no slash-command (`/`) suggestions or floating formatting menus, making it difficult for non-technical users to format text efficiently.
    
- **The Upgrade Strategy:** Replace the raw text input with a block-based editor. You can implement a headless rich-text editor (like TipTap or MDXEditor) that outputs raw Markdown to the database. Building the popup helper menus and slash-command palettes using `animate-ui` will give the interface the fluid, Notion-like interactions your creative team needs without bloating the frontend architecture.
    

### 2. Task & Issue Assignment

- **Current State:** Multica excels at linking tasks together to create a cohesive chain of work.
    
- **The Problem:** It is unclear or restrictive regarding multi-assignee support. Cross-functional workflows often require multiple people (e.g., a copywriter and a graphic designer) attached to the same ticket.
    
- **The Upgrade Strategy:** Update the database schema to change the `assignee_id` column to an array of `assignees`. This allows you to assign a human developer, a marketing team member, and an AI agent to a single task simultaneously, facilitating better cross-team collaboration.
    

### 3. Project Architecture & Access Control

- **Current State:** Projects default to a Kanban view, which is great for immediate execution.
    
- **The Problem:** Multica's project structure is too flat. It lacks granular access controls (the ability to invite/remove specific personnel to private projects). Furthermore, it completely lacks long-term planning tools like project-level documentation, Gantt charts, and milestones (monthly, yearly, or micro-tasks).
    
- **The Upgrade Strategy:**
    
    - **Role-Based Access Control (RBAC):** Introduce a `ProjectMembers` database table that joins users to projects with specific roles (Admin, Viewer, Editor). If a user is not in the table, the project does not render in their UI.
        
    - **Milestones & Views:** Expand the project schema to include a `Milestone` entity. You can build custom timeline and calendar views that filter tasks by these milestone deadlines, drawing direct inspiration from Huly's roadmap capabilities.
        
    - **Project Wiki:** Add a dedicated document hub inside each project container for strategy briefs and asset requirements.
        

### 4. Autopilots: Clarification & Usage

- **What they are:** Your understanding is correct. Autopilots are essentially automated schedules and triggers for your AI agents. Instead of manually creating a task and assigning it to an agent, you set an Autopilot to trigger via a cron schedule (e.g., every Monday at 9 AM) or a webhook (e.g., when a new lead is added to a CRM). The system automatically spins up a task and routes it to the agent to execute.
    
- **The Upgrade Strategy:** The current implementation of Autopilots is incredibly powerful. You should keep this system as-is. For your marketing use case, you can leverage it heavily to automate weekly SEO audits, scheduled social media drafting, or automated weekly performance reports.
    

### 5. GitHub Integration & Tracking

- **The Problem:** The current setup needs a cleaner bridge between the project board and actual code repositories to track PRs and code issues effortlessly.
    
- **The Upgrade Strategy:** Leverage GitHub Apps and Webhooks. When a developer mentions a Multica Issue ID in a GitHub Pull Request title (e.g., `Fixes MUL-102`), the webhook will catch it and automatically move the Multica Kanban card to "In Review," linking the PR directly in the task activity feed.
    

How would you like to handle the database migrations for these new features—are you planning to stick with Multica's existing PostgreSQL setup, or do you want to transition to a different database architecture?