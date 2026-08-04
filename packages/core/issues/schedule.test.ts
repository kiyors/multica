import { describe, expect, it } from "vitest";
import {
  issueScheduleOverlapsPeriod,
  issueSchedulePeriodForFilter,
} from "./schedule";

describe("issueSchedulePeriodForFilter", () => {
  it("uses a Monday-through-Sunday week", () => {
    expect(issueSchedulePeriodForFilter("weekly", "2026-08-04")).toEqual({
      from: "2026-08-03",
      to: "2026-08-09",
    });
  });

  it("handles month and year boundaries", () => {
    expect(issueSchedulePeriodForFilter("monthly", "2026-12-17")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });
});

describe("issueScheduleOverlapsPeriod", () => {
  const period = { from: "2026-08-03", to: "2026-08-09" };

  it("includes an issue spanning the whole period", () => {
    expect(
      issueScheduleOverlapsPeriod(
        { start_date: "2026-07-20", due_date: "2026-08-20" },
        period,
      ),
    ).toBe(true);
  });

  it("includes either boundary and one-sided dates", () => {
    expect(
      issueScheduleOverlapsPeriod(
        { start_date: null, due_date: "2026-08-03" },
        period,
      ),
    ).toBe(true);
    expect(
      issueScheduleOverlapsPeriod(
        { start_date: "2026-08-09", due_date: null },
        period,
      ),
    ).toBe(true);
  });

  it("excludes undated and non-overlapping issues", () => {
    expect(
      issueScheduleOverlapsPeriod(
        { start_date: null, due_date: null },
        period,
      ),
    ).toBe(false);
    expect(
      issueScheduleOverlapsPeriod(
        { start_date: "2026-08-10", due_date: "2026-08-12" },
        period,
      ),
    ).toBe(false);
  });

  it("normalizes inverted legacy intervals", () => {
    expect(
      issueScheduleOverlapsPeriod(
        { start_date: "2026-08-12", due_date: "2026-08-05" },
        period,
      ),
    ).toBe(true);
  });
});
