import type { Issue } from "@multica/core/types";
import { dateOnlyToLocalDate, toDateOnly } from "@multica/core/issues/date";

export interface IssueCalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: true;
  issue: Issue;
}

export function issueToCalendarEvent(
  issue: Issue,
): IssueCalendarEvent | null {
  const rawStart = dateOnlyToLocalDate(issue.start_date ?? issue.due_date);
  const rawEnd = dateOnlyToLocalDate(issue.due_date ?? issue.start_date);
  if (!rawStart || !rawEnd) return null;

  const start = rawStart <= rawEnd ? rawStart : rawEnd;
  const inclusiveEnd = rawStart <= rawEnd ? rawEnd : rawStart;
  const end = new Date(inclusiveEnd);
  end.setDate(end.getDate() + 1);

  return {
    title: issue.title,
    start,
    end,
    allDay: true,
    issue,
  };
}

export function calendarInteractionToIssueDates(
  start: Date,
  exclusiveEnd: Date,
): { startDate: string; dueDate: string } {
  const inclusiveEnd = new Date(exclusiveEnd);
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
  if (inclusiveEnd < start) inclusiveEnd.setTime(start.getTime());

  return {
    startDate: toDateOnly(start),
    dueDate: toDateOnly(inclusiveEnd),
  };
}
