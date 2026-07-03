import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { reviewKeys } from "./queries";

interface CreateReviewCommentParams {
  workspaceId: string;
  issueId: string;
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
      return await api.createReviewComment(params.workspaceId, params.issueId, {
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

export function useUpdateReviewAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { workspaceId: string; issueId: string; assetId: string; status: string }) => {
      return await api.updateReviewAssetStatus(params.workspaceId, params.issueId, params.assetId, params.status);
    },
    onSuccess: (_updatedAsset, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.all(variables.workspaceId),
      });
    },
  });
}

export function useBulkApproveReviewAssets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { workspaceId: string; issueId: string }) => {
      return await api.bulkApproveReviewAssets(params.workspaceId, params.issueId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.all(variables.workspaceId),
      });
    },
  });
}
