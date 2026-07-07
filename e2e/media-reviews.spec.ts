import { test, expect } from "@playwright/test";
import { createTestApi, loginAsDefault, waitForPageText } from "./helpers";
import type { TestApiClient } from "./fixtures";
import path from "path";
import fs from "fs";

test.describe("Media Reviews", () => {
  let api: TestApiClient;
  let issueId: string;
  let issueTitle: string;
  let workspaceSlug: string;

  test.beforeEach(async ({ page }) => {
    api = await createTestApi();
    issueTitle = "E2E Media Review " + Date.now();
    const issue = await api.createIssue(issueTitle);
    issueId = issue.id;
    workspaceSlug = await loginAsDefault(page);
    
    // Create a dummy image file for upload testing
    fs.writeFileSync('dummy.jpg', 'fake image content');
  });

  test.afterEach(async () => {
    if (fs.existsSync('dummy.jpg')) fs.unlinkSync('dummy.jpg');
    if (api) await api.cleanup();
  });

  test("can upload a review asset and add a review comment", async ({ page }) => {
    await page.goto(`/${workspaceSlug}/issues/${issueId}?tab=review`, { waitUntil: "domcontentloaded" });
    await waitForPageText(page, issueTitle);

    // Wait for the drag and drop area or upload button to be visible
    // Depending on the UI, we may need to find the specific locator
    const uploadInput = page.locator('input[type="file"]').first();
    await expect(uploadInput).toBeAttached();

    // Upload the file
    await uploadInput.setInputFiles('dummy.jpg');

    // It should show the upload showcase and then complete
    await expect(page.locator("text=Uploading")).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(page.locator("text=Uploaded")).toBeVisible({ timeout: 10000 });

    // The asset should appear in the asset list
    await expect(page.locator("text=dummy.jpg")).toBeVisible();

    // Select the asset to view it in the player
    await page.locator("text=dummy.jpg").first().click();

    // The media player overlay and review sidebar should be visible
    await expect(page.locator("text=Review Comments")).toBeVisible();

    // Create a review comment
    const editor = page
      .locator('.ProseMirror[data-placeholder="Add a review comment... (type @ to tag)"], .ProseMirror:has([data-placeholder="Add a review comment... (type @ to tag)"])')
      .first();
    await expect(editor).toBeVisible();
    await editor.click({ force: true });
    
    const commentText = "Looks good! " + Date.now();
    await editor.fill(commentText);

    // Hit the comment button
    await page.locator("button:has-text('Comment')").click();

    // The comment should be visible in the sidebar
    await expect(page.locator(`text=${commentText}`)).toBeVisible({ timeout: 5000 });
  });

  test("guest review page shows access required screen", async ({ page }) => {
    // Navigate to a random asset ID guest review page
    const testAssetId = "123e4567-e89b-12d3-a456-426614174000";
    await page.goto(`/guest/review/${testAssetId}`);

    // Verify the lock icon or the title
    await expect(page.locator("text=Guest Access Required")).toBeVisible();
    await expect(page.locator("text=Guest share mode is currently disabled")).toBeVisible();
    
    // Verify login link works
    await page.locator("text=Go to Login").click();
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});
