export type ReviewAssetStatus = "pending" | "approved" | "changes_requested";
export type ReviewAssetType = "video" | "image" | "pdf";

export interface ReviewAsset {
  id: string;
  issue_id: string;
  workspace_id: string;
  asset_group_id: string;
  name: string;
  asset_type: ReviewAssetType;
  src_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration?: number;
  version: number;
  status: ReviewAssetStatus;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnotationShape {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  points?: { x: number; y: number }[];
}

export interface ReviewComment {
  id: string;
  asset_id: string;
  author_id?: string;
  guest_name?: string;
  content: string;
  start_time?: number;
  end_time?: number;
  page_index?: number;
  shapes: AnnotationShape[];
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GuestReview {
  asset: ReviewAsset;
  comments: ReviewComment[];
}
