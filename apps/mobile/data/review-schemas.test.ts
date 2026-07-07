import { describe, expect, it } from "vitest";
import { ReviewCommentListSchema, EMPTY_REVIEW_COMMENTS } from "./schemas";
import { parseWithFallback } from "@multica/core/api/schema";

describe("ReviewCommentListSchema", () => {
  it("parses a well-formed comment list", () => {
    const raw = [
      {
        id: "c1",
        asset_id: "a1",
        author_id: "u1",
        content: "too dark here",
        start_time: 1.5,
        end_time: 1.5,
        shapes: [
          { type: "rectangle", x: 0.1, y: 0.2, width: 0.3, height: 0.1, color: "#f00", strokeWidth: 2 },
        ],
        resolved: false,
        created_at: "2026-07-08T00:00:00Z",
      },
    ];
    const out = parseWithFallback(raw, ReviewCommentListSchema, EMPTY_REVIEW_COMMENTS, { endpoint: "test" });
    expect(out).toHaveLength(1);
    expect(out[0]!.shapes[0]!.type).toBe("rectangle");
  });

  it("defaults missing optional fields instead of dropping the row", () => {
    const raw = [{ id: "c1", asset_id: "a1", author_id: "u1", content: "x", created_at: "2026-07-08T00:00:00Z" }];
    const out = parseWithFallback(raw, ReviewCommentListSchema, EMPTY_REVIEW_COMMENTS, { endpoint: "test" });
    expect(out[0]!.shapes).toEqual([]);
    expect(out[0]!.resolved).toBe(false);
    // start_time stays undefined (not null) — core's ReviewComment declares
    // `start_time?: number` and mobile must not diverge on data identity.
    expect(out[0]!.start_time).toBeUndefined();
  });

  it("falls back to the empty list on a malformed body", () => {
    const out = parseWithFallback({ nonsense: true }, ReviewCommentListSchema, EMPTY_REVIEW_COMMENTS, { endpoint: "test" });
    expect(out).toEqual([]);
  });

  it("tolerates unknown shape types (server-driven enum rule)", () => {
    const raw = [
      {
        id: "c1",
        asset_id: "a1",
        author_id: "u1",
        content: "x",
        created_at: "2026-07-08T00:00:00Z",
        shapes: [{ type: "star", x: 0, y: 0, width: 0.5, height: 0.5, color: "#0f0", strokeWidth: 2 }],
      },
    ];
    const out = parseWithFallback(raw, ReviewCommentListSchema, EMPTY_REVIEW_COMMENTS, { endpoint: "test" });
    expect(out[0]!.shapes[0]!.type).toBe("star");
  });
});
