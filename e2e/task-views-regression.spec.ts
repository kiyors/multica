import { expect, test, type Page } from "@playwright/test";
import { createTestApi, loginAsDefault, waitForPageText } from "./helpers";
import type { TestApiClient } from "./fixtures";

function dateOnly(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function selectView(page: Page, view: "Gantt" | "Calendar") {
  const currentView = page.getByRole("button", {
    name: /^(Board|List|Table|Swimlane|Gantt|Calendar)$/,
  }).first();
  await expect(currentView).toBeVisible({ timeout: 15_000 });
  await currentView.click();
  await page.getByRole("menuitemradio", { name: view, exact: true }).click();
  await expect(page.getByRole("button", { name: view, exact: true })).toBeVisible();
}

test.describe("task surface regressions", () => {
  let api: TestApiClient;
  let slug: string;

  test.beforeEach(async ({ page }) => {
    api = await createTestApi();
    slug = await loginAsDefault(page);
  });

  test.afterEach(async () => {
    await api?.cleanup();
  });

  test("All Tasks separates actor scope, activity date, and schedule period", async ({ page }) => {
    const overlappingTitle = `E2E Schedule Overlap ${Date.now()}`;
    await api.createIssue(overlappingTitle, {
      start_date: dateOnly(-1),
      due_date: dateOnly(1),
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForPageText(page, overlappingTitle);

    // Regression: workspace scope and assignee quick-filter controls used to
    // render side-by-side. Exactly one desktop “All” control is visible.
    await expect(page.getByRole("button", { name: "All", exact: true })).toHaveCount(1);
    await expect(page.getByText("Schedule period", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /filter/i }).click();
    await expect(page.getByRole("menuitem", { name: /^Activity date\b/ })).toBeVisible();
    await page.keyboard.press("Escape");

    // Today uses interval overlap, so a task spanning yesterday through
    // tomorrow remains visible even though neither endpoint equals today.
    await page.getByRole("tab", { name: "Today", exact: true }).click();
    await expect(page.getByText(overlappingTitle)).toBeVisible();

    await selectView(page, "Gantt");
    await expect(page.getByText(overlappingTitle)).toBeVisible();
    await selectView(page, "Calendar");
    await expect(page.getByText(overlappingTitle)).toBeVisible();
  });

  test("My Tasks and Project Tasks expose Calendar and Gantt without duplicate scope controls", async ({ page }) => {
    const project = await api.createProject(`E2E Planning ${Date.now()}`);
    const title = `E2E Project Schedule ${Date.now()}`;
    await api.createIssue(title, {
      project_id: project.id,
      start_date: dateOnly(0),
      due_date: dateOnly(2),
    });

    await page.goto(`/${slug}/my-issues`, { waitUntil: "domcontentloaded" });
    await waitForPageText(page, "My Issues");
    await expect(page.getByRole("tab", { name: "All", exact: true })).toHaveCount(1);
    await selectView(page, "Calendar");
    await selectView(page, "Gantt");

    await page.goto(`/${slug}/projects/${project.id}/board`, { waitUntil: "domcontentloaded" });
    await waitForPageText(page, project.title);
    await expect(page.getByRole("tab", { name: "All", exact: true })).toHaveCount(1);
    await selectView(page, "Calendar");
    await expect(page.getByText(title)).toBeVisible();
    await selectView(page, "Gantt");
    await expect(page.getByText(title)).toBeVisible();
  });

  test("Calendar remains usable in light and dark themes", async ({ page }) => {
    await api.createIssue(`E2E Theme Calendar ${Date.now()}`, {
      start_date: dateOnly(0),
      due_date: dateOnly(0),
    });

    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((value) => localStorage.setItem("theme", value), theme);
      await page.reload({ waitUntil: "domcontentloaded" });
      await selectView(page, "Calendar");
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      await expect(page.locator(".rbc-month-view")).toBeVisible();
    }
  });

  test("approval UI and media-review deep links load from issue details", async ({ page }) => {
    const issue = await api.createIssue(`E2E Review Deep Link ${Date.now()}`);
    const assetId = "11111111-1111-4111-8111-111111111111";
    await page.route(`**/api/issues/${issue.id}/reviews/assets`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: assetId,
            issue_id: issue.id,
            workspace_id: "workspace",
            asset_group_id: assetId,
            name: "review.png",
            asset_type: "image",
            src_url: "https://example.test/review.png",
            version: 1,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      }),
    );
    await page.route(`**/api/issues/${issue.id}/reviews/comments**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );

    await page.goto(`/${slug}/issues/${issue.id}?review=${assetId}&reviewPage=0`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageText(page, issue.title);
    await expect(page.getByText(/Approval/i).first()).toBeVisible();
    await expect(page.locator('img[src="https://example.test/review.png"]')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`review=${assetId}`));
  });
});
