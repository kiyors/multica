/**
 * Media review comments — mobile-owned mirror of
 * packages/core/reviews/queries.ts (key shape and endpoint match web
 * verbatim; see apps/mobile/CLAUDE.md "Mirror, don't import").
 */
import { queryOptions } from "@tanstack/react-query";
import { api } from "@/data/api";

export const reviewKeys = {
  all: (wsId: string | null) => ["reviews", wsId] as const,
  comments: (wsId: string | null, assetId: string) =>
    [...reviewKeys.all(wsId), "comments", assetId] as const,
};

export function listReviewCommentsOptions(
  wsId: string | null,
  issueId: string,
  assetId: string,
) {
  return queryOptions({
    queryKey: reviewKeys.comments(wsId, assetId),
    queryFn: ({ signal }) => api.listReviewComments(issueId, assetId, { signal }),
    enabled: !!wsId && !!issueId && !!assetId,
  });
}
