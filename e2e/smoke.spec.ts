import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 시작 안내 제목이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Comic Zip Viewer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Comic Zip Viewer"
  );
});
