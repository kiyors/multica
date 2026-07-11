import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation - Multica",
  description: "User guide and documentation for Multica",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl p-8 py-12">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-4xl font-bold tracking-tight">Multica Documentation</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Welcome to Multica! Here is a quick guide to help you get started with workspaces, projects, tasks, and agents.
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">1. Workspaces</h2>
          <p className="text-muted-foreground mb-4">
            A workspace is your organization's home in Multica. All projects, tasks, and team members belong to a workspace.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>You can invite team members to your workspace from the <strong>Settings &rarr; Members</strong> tab.</li>
            <li>Workspace settings allow you to configure global issue types and labels that are available across all projects.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">2. Projects</h2>
          <p className="text-muted-foreground mb-4">
            Projects help you organize related tasks. Each project can have its own specific configurations.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>When creating a task, you can assign it to a specific project.</li>
            <li>You can view a project's tasks in List, Board, Swimlane, or Gantt views.</li>
            <li><strong>Project Settings:</strong> You can define custom labels and issue types that are specific only to that project.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">3. Tasks (Issues)</h2>
          <p className="text-muted-foreground mb-4">
            Tasks are the core unit of work in Multica.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>You can quickly create tasks using the <strong>C</strong> keyboard shortcut from anywhere.</li>
            <li>Tasks can have assignees, start dates, due dates, priority levels, and custom labels.</li>
            <li>Click on any task to open its details and leave comments or update its status.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">4. AI Agents</h2>
          <p className="text-muted-foreground mb-4">
            Multica features autonomous AI agents that can assist you with your tasks.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>You can chat with agents in the <strong>Agents</strong> tab.</li>
            <li>When creating a task, you can switch to "Agent Mode" to have an agent automatically draft the task details for you based on a prompt.</li>
            <li>You can set up <strong>Autopilots</strong> to trigger agents automatically on specific events (e.g., when a task is moved to a specific status).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
