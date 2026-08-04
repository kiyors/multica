import { describe, expect, it } from "vitest";
import type { Issue } from "@multica/core/types";
import {
  calendarInteractionToIssueDates,
  issueToCalendarEvent,
} from "./calendar-adapter";

function issue(overrides: Partial<Issue>): Issue {
  return {
    id: "issue-1",
    workspace_id: "ws-1",
    number: 1,
    identifier: "MUL-1",
    title: "Scheduled task",
    description: null,
    status: "todo",
    priority: "none",
    assignee_type: null,
    assignee_id: null,
    creator_type: "member",
    creator_id: "user-1",
    parent_issue_id: null,
    project_id: null,
    position: 1,
    stage: null,
    start_date: null,
    due_date: null,
    metadata: {},
    properties: {},
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("calendar adapter", () => {
  it("maps an inclusive issue due date to React Big Calendar's exclusive end", () => {
    const event = issueToCalendarEvent(
      issue({ start_date: "2026-08-04", due_date: "2026-08-06" }),
    );

    expect(event?.start.getFullYear()).toBe(2026);
    expect(event?.start.getMonth()).toBe(7);
    expect(event?.start.getDate()).toBe(4);
    expect(event?.end.getDate()).toBe(7);
  });

  it("renders a one-date task as one full day", () => {
    const event = issueToCalendarEvent(issue({ due_date: "2026-08-04" }));

    expect(event?.start.getDate()).toBe(4);
    expect(event?.end.getDate()).toBe(5);
  });

  it("converts a drag result back to date-only inclusive fields", () => {
    expect(
      calendarInteractionToIssueDates(
        new Date(2026, 7, 10),
        new Date(2026, 7, 13),
      ),
    ).toEqual({ startDate: "2026-08-10", dueDate: "2026-08-12" });
  });
});
