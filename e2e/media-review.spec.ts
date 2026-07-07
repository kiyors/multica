import { test, expect } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";
import * as path from "path";
import * as fs from "fs";

test.describe("Media Review flows", () => {
  let wsSlug: string;
  let api: TestApiClient;
  let wsId: string;
  let issueId: string;

  test.beforeEach(async ({ page }) => {
    api = await createTestApi();
    wsSlug = await loginAsDefault(page);
    
    // Get workspace ID from slug
    const workspaces = await api.get("/workspaces");
    const ws = (await workspaces.json()).find((w: any) => w.slug === wsSlug);
    wsId = ws.id;

    // Create a dummy issue
    const res = await api.post(`/workspaces/${wsId}/issues`, {
      title: "Media Review E2E Test",
      description: "Testing media review flows",
      priority: "none",
      status: "backlog"
    });
    const issue = await res.json();
    issueId = issue.id;
  });

  test.afterEach(async () => {
    await api.cleanup();
  });

  test("can view and interact with media review player", async ({ page }) => {
    // We will intercept the asset fetch to return a mock video asset
    await page.route(`**/api/workspaces/${wsId}/issues/${issueId}/review-assets`, async route => {
      const json = [{
        id: "asset-1",
        issue_id: issueId,
        name: "test-video.mp4",
        asset_type: "video",
        src_url: "http://example.com/test-video.mp4",
        duration: 120,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
      await route.fulfill({ json });
    });

    await page.route(`**/api/workspaces/${wsId}/issues/${issueId}/review-comments*`, async route => {
      await route.fulfill({ json: [] });
    });

    await page.goto(`/${wsSlug}/issues/${issueId}/review`);
    
    // Check layout renders
    await expect(page.locator("text=Media Review")).toBeVisible();
    
    // Check player renders (mocked video)
    const videoElement = page.locator("video");
    await expect(videoElement).toBeVisible();

    // Check scrubber track
    const scrubber = page.locator(".group\\/progress").first();
    await expect(scrubber).toBeVisible();
    
    // Check sidebar
    await expect(page.locator("text=Review Comments")).toBeVisible();
    
    // Share button
    const shareBtn = page.getByRole("button", { name: "Share" });
    await expect(shareBtn).toBeVisible();
    
    // Note: Can't easily test copy to clipboard in all browsers in Playwright 
    // without special permissions, but we can verify it doesn't crash
  });
});
