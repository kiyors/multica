import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const reviewKeys = {
  all: (wsId: string) => ["reviews", wsId] as const,
  assets: (wsId: string, issueId: string) => [...reviewKeys.all(wsId), "assets", issueId] as const,
  comments: (wsId: string, assetId: string) => [...reviewKeys.all(wsId), "comments", assetId] as const,
  pendingIssues: (wsId: string) => [...reviewKeys.all(wsId), "pending-issues"] as const,
};

export function listReviewAssetsOptions(workspaceId: string, issueId: string) {
  return queryOptions({
    queryKey: reviewKeys.assets(workspaceId, issueId),
    queryFn: async () => {
      return await api.listReviewAssets(workspaceId, issueId);
    },
    enabled: !!workspaceId && !!issueId,
  });
}

export function listPendingReviewIssueIDsOptions(workspaceId: string) {
  return queryOptions({
    queryKey: reviewKeys.pendingIssues(workspaceId),
    queryFn: async () => {
      return await api.listPendingReviewIssueIDs(workspaceId);
    },
    enabled: !!workspaceId,
  });
}

export function listReviewCommentsOptions(workspaceId: string, issueId: string, assetId: string) {
  return queryOptions({
    queryKey: reviewKeys.comments(workspaceId, assetId),
    queryFn: async () => {
      return await api.listReviewComments(workspaceId, issueId, assetId);
    },
    enabled: !!workspaceId && !!issueId && !!assetId,
  });
}
