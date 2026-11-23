import { test, expect } from "@playwright/test";
import { publicFixture } from "./fixtures";
test.beforeEach(async ({ page }) => {
  await publicFixture(page);
});
test("landing branding, attribution and working navigation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "One Class. One Identity. One Community.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Register as a student" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your student account" }),
  ).toBeVisible();
  await page.getByLabel("Full name").fill("Test Student");
  await page.getByLabel("Email address").fill("student@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-secure-test-password");
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeDisabled();
});
test("private student and admin routes require login", async ({ page }) => {
  for (const route of [
    "/student/profile",
    "/admin/students",
    "/admin/control",
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  }
});
test("privacy notice distinguishes class card from official ID", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByText(
      "Class membership cards are not official KMTC student identification cards.",
      { exact: false },
    ),
  ).toBeVisible();
});
test("developer identity is not falsely verified without provisioning", async ({
  page,
}) => {
  await page.goto("/developer");
  await expect(page.getByRole("heading", { name: "Dev Brian" })).toBeVisible();
  await expect(
    page.getByText("Verified Developer", { exact: true }),
  ).toHaveCount(0);
});
test("invalid public verification is safe", async ({ page }) => {
  await page.goto("/verify/invalid");
  await expect(
    page.getByRole("heading", { name: "Verify class membership" }),
  ).toBeVisible();
  await expect(
    page.getByText("Invalid Verification Code", { exact: true }),
  ).toBeVisible();
});
test("public landing fits the viewport", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(550);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
