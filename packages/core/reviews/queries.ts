import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const reviewKeys = {
  all: (wsId: string) => ["reviews", wsId] as const,
  assets: (wsId: string, issueId: string) => [...reviewKeys.all(wsId), "assets", issueId] as const,
  comments: (wsId: string, assetId: string) => [...reviewKeys.all(wsId), "comments", assetId] as const,
};

export function listReviewCommentsOptions(workspaceId: string, assetId: string) {
  return queryOptions({
    queryKey: reviewKeys.comments(workspaceId, assetId),
    queryFn: async () => {
      return await api.listReviewComments(workspaceId, assetId);
    },
    enabled: !!workspaceId && !!assetId,
  });
}
