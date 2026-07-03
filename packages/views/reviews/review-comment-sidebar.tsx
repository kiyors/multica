import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listReviewCommentsOptions, useCreateReviewComment } from "@multica/core/reviews";
import type { ReviewAsset } from "@multica/core/types";

interface ReviewCommentSidebarProps {
  workspaceId: string;
  asset: ReviewAsset;
  currentTime: number;
  onSeek: (time: number) => void;
  onDrawStart: () => void;
  getCanvasShapes: () => any;
  clearCanvasShapes: () => void;
}

export function ReviewCommentSidebar({
  workspaceId,
  asset,
  currentTime,
  onSeek,
  onDrawStart,
  getCanvasShapes,
  clearCanvasShapes,
}: ReviewCommentSidebarProps) {
  const { data: comments, isLoading } = useQuery(listReviewCommentsOptions(workspaceId, asset.id));
  const { mutate: createComment, isPending: isCreating } = useCreateReviewComment();
  const [draftContent, setDraftContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) return;

    createComment(
      {
        workspaceId,
        assetId: asset.id,
        content: draftContent,
        timestamp: asset.asset_type === "video" ? currentTime : undefined,
        shapes: getCanvasShapes(),
      },
      {
        onSuccess: () => {
          setDraftContent("");
          clearCanvasShapes();
        },
      }
    );
  };

  return (
    <div className="flex flex-col w-80 border-l border-gray-200 bg-white h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 font-semibold text-gray-900">
        Review Comments
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-gray-500 text-sm">Loading comments...</div>
        ) : comments?.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No comments yet. Leave feedback below!
          </div>
        ) : (
          comments?.map((comment) => (
            <div 
              key={comment.id} 
              className="bg-gray-50 p-3 rounded border border-gray-100 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => {
                if (comment.timestamp !== undefined && comment.timestamp !== null) {
                  onSeek(comment.timestamp);
                }
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm text-gray-800">
                  User {comment.author_id.slice(0, 4)} {/* Mock user name */}
                </span>
                {comment.timestamp !== undefined && comment.timestamp !== null && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">
                    {new Date(comment.timestamp * 1000).toISOString().substr(14, 5)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px]"
            placeholder="Add a review comment..."
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            onFocus={onDrawStart}
          />
          <div className="flex justify-between items-center">
            {asset.asset_type === "video" && (
              <span className="text-xs text-gray-500">
                At {new Date(currentTime * 1000).toISOString().substr(14, 5)}
              </span>
            )}
            <button
              type="submit"
              disabled={isCreating || !draftContent.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 ml-auto"
            >
              Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
