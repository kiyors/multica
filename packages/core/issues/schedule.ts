import type { Issue } from "../types";
import { dateOnlyToLocalDate, toDateOnly, todayDateOnly } from "./date";
import type { TimeQuickFilter } from "./stores/view-store";

export interface IssueSchedulePeriod {
  /** Inclusive local calendar day. */
  from: string;
  /** Inclusive local calendar day. */
  to: string;
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Resolve a quick-filter value to an inclusive local-calendar interval.
 * Weeks run Monday through Sunday, matching the Gantt axis.
 */
export function issueSchedulePeriodForFilter(
  filter: TimeQuickFilter,
  today = todayDateOnly(),
): IssueSchedulePeriod | null {
  if (filter === "all") return null;
  const current = dateOnlyToLocalDate(today);
  if (!current) return null;

  if (filter === "today") return { from: today, to: today };

  if (filter === "weekly") {
    const mondayOffset = (current.getDay() + 6) % 7;
    const monday = addLocalDays(current, -mondayOffset);
    return {
      from: toDateOnly(monday),
      to: toDateOnly(addLocalDays(monday, 6)),
    };
  }

  return {
    from: toDateOnly(new Date(current.getFullYear(), current.getMonth(), 1)),
    to: toDateOnly(new Date(current.getFullYear(), current.getMonth() + 1, 0)),
  };
}

/**
 * True when the issue's inclusive scheduled interval overlaps the inclusive
 * period. A one-sided schedule is treated as a one-day interval. Inverted
 * legacy dates are normalized defensively instead of disappearing.
 */
export function issueScheduleOverlapsPeriod(
  issue: Pick<Issue, "start_date" | "due_date">,
  period: IssueSchedulePeriod,
): boolean {
  const rawStart = issue.start_date ?? issue.due_date;
  const rawEnd = issue.due_date ?? issue.start_date;
  if (!rawStart || !rawEnd) return false;

  const issueStart = rawStart <= rawEnd ? rawStart : rawEnd;
  const issueEnd = rawStart <= rawEnd ? rawEnd : rawStart;
  const periodStart = period.from <= period.to ? period.from : period.to;
  const periodEnd = period.from <= period.to ? period.to : period.from;
  return issueStart <= periodEnd && issueEnd >= periodStart;
}
