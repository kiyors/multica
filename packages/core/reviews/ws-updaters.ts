import type { QueryClient } from "@tanstack/react-query";
import { reviewKeys } from "./queries";
import type { ReviewAsset, ReviewComment } from "../types";

export function onReviewAssetUpdated(
  qc: QueryClient,
  wsId: string,
  payload: { asset?: ReviewAsset },
) {
  if (payload.asset) {
    // Single asset update - we could patch the cache directly, but it's safer/simpler to invalidate
    // since we don't have the issue ID readily available in the event to build the precise key.
    // Actually, payload.asset.issue_id is there!
    qc.invalidateQueries({ queryKey: reviewKeys.assets(wsId, payload.asset.issue_id) });
    qc.invalidateQueries({ queryKey: reviewKeys.pendingIssues(wsId) });
  } else {
    // Bulk approve (no single asset in payload)
    // Invalidate everything to be safe
    qc.invalidateQueries({ queryKey: reviewKeys.all(wsId) });
  }
}

export function onReviewCommentCreated(
  qc: QueryClient,
  wsId: string,
  payload: { comment: ReviewComment },
) {
  if (!payload.comment) return;
  qc.invalidateQueries({ queryKey: reviewKeys.comments(wsId, payload.comment.asset_id) });
}

export function onReviewCommentResolved(
  qc: QueryClient,
  wsId: string,
  payload: { comment: ReviewComment },
) {
  if (!payload.comment) return;
  qc.invalidateQueries({ queryKey: reviewKeys.comments(wsId, payload.comment.asset_id) });
}

export function onReviewCommentUnresolved(
  qc: QueryClient,
  wsId: string,
  payload: { comment: ReviewComment },
) {
  if (!payload.comment) return;
  qc.invalidateQueries({ queryKey: reviewKeys.comments(wsId, payload.comment.asset_id) });
}
