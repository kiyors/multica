import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MediaReviewPlayer } from "./media-review-player";
import type { ReviewAsset } from "@multica/core/types";

describe("MediaReviewPlayer", () => {
  it("renders a video element for video assets", () => {
    const asset: ReviewAsset = {
      id: "1",
      name: "test.mp4",
      src_url: "http://example.com/test.mp4",
      asset_type: "video",
      issue_id: "1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: 10,
    } as ReviewAsset;

    const { container } = render(<MediaReviewPlayer asset={asset} />);
    expect(container.querySelector("video")).toBeInTheDocument();
  });

  it("renders an audio element for audio assets", () => {
    const asset: ReviewAsset = {
      id: "2",
      name: "test.mp3",
      src_url: "http://example.com/test.mp3",
      asset_type: "audio",
      issue_id: "1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      duration: 10,
    } as ReviewAsset;

    const { container } = render(<MediaReviewPlayer asset={asset} />);
    expect(container.querySelector("audio")).toBeInTheDocument();
  });

  it("renders an image element for image assets", () => {
    const asset: ReviewAsset = {
      id: "3",
      name: "test.jpg",
      src_url: "http://example.com/test.jpg",
      asset_type: "image",
      issue_id: "1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ReviewAsset;

    const { container } = render(<MediaReviewPlayer asset={asset} />);
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});
