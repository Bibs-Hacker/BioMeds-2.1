import { test, expect } from "@playwright/test";
import { authenticatedFixture, publicFixture, uid, student } from "./fixtures";
test.beforeEach(async () =>
  test.skip(
    process.env.UI_FIXTURES !== "1",
    "Test-only Supabase configuration required",
  ),
);
const scrollPolicies = async (page: import("@playwright/test").Page) => {
  for (const reader of await page.getByRole("region").all()) {
    await reader.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
  }
  await page.getByLabel("I have reviewed and agree").check();
};
test("signup requires recognition photo plus both end-of-document scrolls", async ({
  page,
}) => {
  await publicFixture(page);
  await page.goto("/signup");
  const action = page.getByRole("button", {
    name: "Create account",
    exact: true,
  });
  await expect(action).toBeDisabled();
  await page
    .getByLabel("Recognition photograph")
    .setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO/aO1sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  const consent = page.getByLabel("I have reviewed and agree");
  await expect(consent).toBeDisabled();
  const first = page.getByRole("region", { name: "Privacy Policy reader" });
  await first.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(consent).toBeDisabled();
  await scrollPolicies(page);
  await expect(action).toBeEnabled();
  await consent.uncheck();
  await expect(action).toBeDisabled();
});
test("inactive profile cannot bypass activation by opening registration", async ({
  page,
}) => {
  await authenticatedFixture(page, {
    role: null,
    registered: false,
    activated: false,
  });
  await page.goto("/student/register");
  await expect(
    page.getByRole("heading", { name: "Activate your student account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Activate account and continue" }),
  ).toBeDisabled();
  await scrollPolicies(page);
  await expect(
    page.getByRole("button", { name: "Activate account and continue" }),
  ).toBeDisabled();
});
test("students see lecturers and assigned units without edit controls", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: null });
  await page.goto("/student/academics");
  await expect(
    page.getByRole("heading", { name: "Medical Electronics" }),
  ).toBeVisible();
  await expect(
    page.getByText("Test Lecturer", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save lecturer" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Delete unit" })).toHaveCount(
    0,
  );
  await page.getByLabel("Search units or lecturers").fill("no-match");
  await expect(
    page.getByText("No matching teaching units published yet."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("class representative can manage lecturer/unit assignment", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: "class_representative" });
  let posted = false;
  await page.route("**/rest/v1/rpc/save_lecturer", (route) => {
    posted =
      route.request().postDataJSON().payload.full_name === "New Lecturer";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '"lecturer-new"',
    });
  });
  await page.goto("/admin/academics");
  await page.getByLabel("Lecturer full name").fill("New Lecturer");
  await page
    .getByRole("button", { name: "Save lecturer", exact: true })
    .click();
  await expect(page.locator(".toast")).toContainText(
    "Academic directory updated.",
  );
  expect(posted).toBe(true);
  await expect(
    page.getByRole("button", { name: "Assign lecturer to unit" }),
  ).toBeVisible();
});
test("theme/font preferences persist and account deletion requires exact confirmation", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: null });
  await page.goto("/student/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.getByLabel("Font choice").selectOption("serif");
  await page.getByLabel("Text size").selectOption("large");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByLabel("Font choice")).toHaveValue("serif");
  await expect(page.locator("html")).toHaveAttribute("data-size", "large");
  await page
    .getByRole("button", { name: "Request account deletion", exact: true })
    .click();
  const submit = page.getByRole("button", { name: "Submit deletion request" });
  await expect(submit).toBeDisabled();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("secure-current-password");
  await page
    .getByLabel("Reason", { exact: true })
    .fill("I no longer need the portal.");
  await page
    .getByLabel("Type DELETE MY ACCOUNT exactly")
    .fill("delete my account");
  await page.getByLabel("I understand the consequences").check();
  await expect(submit).toBeDisabled();
  await page
    .getByLabel("Type DELETE MY ACCOUNT exactly")
    .fill("DELETE MY ACCOUNT");
  await expect(submit).toBeEnabled();
  let requested = false;
  await page.route("**/functions/v1/account-lifecycle", (route) => {
    const body = route.request().postDataJSON();
    requested =
      body.confirmation === "DELETE MY ACCOUNT" && body.acknowledged === true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, request_id: "request-test" }),
    });
  });
  await submit.click();
  await expect(page.locator(".toast")).toContainText(
    "Deletion request submitted for administrator review.",
  );
  expect(requested).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("protected developer cannot request account deletion", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: "super_admin" });
  await page.goto("/admin/settings");
  await expect(
    page.getByText(
      "Dev Brian’s developer account is protected and cannot be deleted through the portal.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request account deletion" }),
  ).toHaveCount(0);
});
test("feedback requires rating and submits selected star/category privately", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: null });
  let posted = false;
  await page.route("**/rest/v1/rpc/send_feedback", (route) => {
    const body = route.request().postDataJSON();
    posted = body.rating === 4 && body.category === "Suggestion";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '"feedback-test"',
    });
  });
  await page.goto("/student/feedback");
  await expect(
    page.getByRole("button", { name: "Submit feedback" }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.getByLabel("Category", { exact: true }).selectOption("Suggestion");
  await page
    .getByLabel("Your feedback")
    .fill("Please keep the readable dark theme.");
  await page.getByRole("button", { name: "Submit feedback" }).click();
  await expect(page.locator(".toast")).toContainText(
    "Thank you — your feedback has been submitted.",
  );
  expect(posted).toBe(true);
});
test("administrator closure execution requires separate destructive phrase", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: "super_admin" });
  await page.route("**/rest/v1/account_deletion_requests*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          user_id: "other-test",
          status: "approved",
          reason: "Confirmed user request",
          review_note: "Reviewed by developer",
          created_at: student.created_at,
        },
      ]),
    }),
  );
  await page.goto("/admin/closures");
  await page.getByRole("button", { name: "Execute approved deletion" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByText("Type DELETE APPROVED ACCOUNT exactly.", { exact: true }),
  ).toBeVisible();
  let executed = false;
  await page.route("**/functions/v1/account-lifecycle", (route) => {
    executed =
      route.request().postDataJSON().confirmation === "DELETE APPROVED ACCOUNT";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"success":true}',
    });
  });
  await page
    .getByLabel("Type DELETE APPROVED ACCOUNT", { exact: true })
    .fill("DELETE APPROVED ACCOUNT");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".toast")).toContainText(
    "Account closure action completed.",
  );
  expect(executed).toBe(true);
});
test("logout is confirmed and responsive footer legal links remain available", async ({
  page,
}) => {
  await authenticatedFixture(page, { role: null });
  await page.goto("/student/settings");
  await expect(
    page.locator("footer").getByRole("link", { name: "Terms and Conditions" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Log out of this gadget", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/settings/);
  await page
    .getByRole("button", { name: "Log out of this gadget", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("public legal navigation switches the actual policy document", async ({
  page,
}) => {
  await publicFixture(page);
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy", exact: true }),
  ).toBeVisible();
  await page
    .locator("footer")
    .getByRole("link", { name: "Terms and Conditions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Terms and Conditions", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".legal-body")).toContainText(
    "This is a class coordination service.",
  );
});
