import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { reviewKeys } from "./queries";

interface CreateReviewCommentParams {
  workspaceId: string;
  assetId: string;
  content: string;
  timestamp?: number;
  shapes?: any;
  parentId?: string;
}

export function useCreateReviewComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateReviewCommentParams) => {
      return await api.createReviewComment(params.workspaceId, {
        asset_id: params.assetId,
        content: params.content,
        timestamp: params.timestamp,
        shapes: params.shapes,
        parent_id: params.parentId,
      });
    },
    onSuccess: (_newComment, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.comments(variables.workspaceId, variables.assetId),
      });
    },
  });
}
