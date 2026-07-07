/**
 * Mobile-owned mirror of packages/core/reviews/mutations.ts
 * useCreateReviewComment. Web does not patch optimistically here either —
 * the annotated comment needs server-assigned id/author fields, so both
 * clients invalidate the asset's comment list on success.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AnnotationShape } from "@multica/core/types";
import { api } from "@/data/api";
import { reviewKeys } from "@/data/queries/reviews";

export interface CreateReviewCommentParams {
  wsId: string;
  issueId: string;
  assetId: string;
  content: string;
  start_time?: number;
  end_time?: number;
  shapes?: AnnotationShape[];
  parentId?: string;
}

export function useCreateReviewComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateReviewCommentParams) =>
      api.createReviewComment(params.issueId, {
        asset_id: params.assetId,
        content: params.content,
        start_time: params.start_time,
        end_time: params.end_time,
        shapes: params.shapes,
        parent_id: params.parentId,
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: reviewKeys.comments(variables.wsId, variables.assetId),
      });
    },
  });
}
