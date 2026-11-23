// Run against the dedicated fixture configuration, not the production environment.
import { test, expect } from "@playwright/test";
import { authenticatedFixture } from "./fixtures";
test.beforeEach(async () =>
  test.skip(
    process.env.UI_FIXTURES !== "1",
    "Requires test-only Supabase URL configuration",
  ),
);
test("submitted student profile is read-only and has no admin controls", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: null });
  await page.goto("/student/profile");
  await expect(
    page.getByRole("heading", { name: "Test Student" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your submitted student information is locked", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator("main input:not([readonly])")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Student directory" }),
  ).toHaveCount(0);
});
test("six-step registration goes back, reviews and submits", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: null, registered: false });
  await page.goto("/student/register");
  await page.getByLabel("Full name").fill("Test Student");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Registration number").fill("ME/TEST/001");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Test Student");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Phone number", { exact: true }).fill("+254700000001");
  await page.getByLabel("County", { exact: true }).fill("Nairobi");
  await page.getByLabel("Town / residence area").fill("Town");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("I declare that").check();
  await page.getByLabel("I consent to").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("ME/TEST/001", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Submit registration", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Registration submitted successfully" }),
  ).toBeVisible();
});
test("active card exports and has both sides", async ({ page }) => {
  await authenticatedFixture(page, { role: null });
  await page.goto("/student/card");
  await expect(page.getByTestId("card-front")).toBeVisible();
  await expect(page.getByTestId("card-back")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});
test("inactive card cannot be downloaded", async ({ page }) => {
  await authenticatedFixture(page, { role: null, status: "inactive" });
  await page.goto("/student/card");
  await expect(
    page.getByText("Card unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PDF" })).toHaveCount(
    0,
  );
});
test("admin analytics uses fixture rows and developer identity is trusted", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: "super_admin" });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Population overview" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Registered population" })
      .locator("b"),
  ).toHaveText("1");
  await page.goto("/admin/developer");
  await expect(
    page
      .locator(".developer-card")
      .getByText("Verified Developer", { exact: true }),
  ).toBeVisible();
});
test("data officer does not see approval or access-management controls", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: "data_officer" });
  await page.goto("/admin/students");
  await expect(
    page.getByRole("heading", { name: "Student directory" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Administrator access" }),
  ).toHaveCount(0);
  await page.goto("/admin/control");
  await expect(page).toHaveURL(/\/student$/);
});
