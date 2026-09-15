import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";

import { BASE_URL } from "../tests/helpers/env";
import { mintSessionToken } from "../tests/helpers/jwt";

// Seeded by e2e/global-setup.ts via src/db/seed.ts: employee is inserted
// first (id 1), manager second (id 2), into a freshly reset database.
const EMPLOYEE_USER_ID = "1";
const MANAGER_USER_ID = "2";
const USER_WITH_NO_NOTIFICATIONS_ID = "999999";

async function setSessionCookie(context: BrowserContext, token: string) {
  await context.addCookies([
    {
      name: "session",
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("AC1: notifications are listed most-recent-first", async ({
  page,
  context,
}) => {
  await setSessionCookie(
    context,
    await mintSessionToken({ sub: EMPLOYEE_USER_ID, role: "employee" }),
  );
  await page.goto("/notifications");

  const items = page.getByRole("listitem");
  await expect(items).toHaveCount(3);
  await expect(items.first()).toContainText(/Overdue/);
  await expect(items.last()).toContainText(/Due/);
});

test("AC2: a tenant with no notifications sees an empty-state message", async ({
  page,
  context,
}) => {
  await setSessionCookie(
    context,
    await mintSessionToken({
      sub: USER_WITH_NO_NOTIFICATIONS_ID,
      role: "employee",
    }),
  );
  await page.goto("/notifications");

  await expect(page.getByText(/no notifications yet/i)).toBeVisible();
  await expect(page.getByRole("list")).toHaveCount(0);
});

test("AC3: each entry shows its type, date sent, and channel(s)", async ({
  page,
  context,
}) => {
  await setSessionCookie(
    context,
    await mintSessionToken({ sub: EMPLOYEE_USER_ID, role: "employee" }),
  );
  await page.goto("/notifications");

  const items = page.getByRole("listitem");
  await expect(items.first()).toContainText(/Due|Confirmation|Overdue/);
  await expect(items.first()).toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(items.first()).toContainText(/Email|In-app/);
});

test("AC4: each entry has a correct accessible name and passes an axe scan", async ({
  page,
  context,
}) => {
  await setSessionCookie(
    context,
    await mintSessionToken({ sub: EMPLOYEE_USER_ID, role: "employee" }),
  );
  await page.goto("/notifications");

  await expect(page.getByRole("listitem").first()).toHaveAccessibleName(
    /Due|Confirmation|Overdue/,
  );

  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("AC5: entries meet WCAG AA contrast", async ({ page, context }) => {
  await setSessionCookie(
    context,
    await mintSessionToken({ sub: EMPLOYEE_USER_ID, role: "employee" }),
  );
  await page.goto("/notifications");

  const results = await new AxeBuilder({ page })
    .include("main")
    .withRules(["color-contrast"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("AC6: no delete or archive action is available", async ({
  page,
  context,
}) => {
  await setSessionCookie(
    context,
    await mintSessionToken({ sub: EMPLOYEE_USER_ID, role: "employee" }),
  );
  await page.goto("/notifications");

  await expect(
    page.getByRole("button", { name: /delete|archive/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /delete|archive/i }),
  ).toHaveCount(0);
});

test("AC7: an employee cannot see the manager's notifications", async ({
  page,
  context,
}) => {
  await setSessionCookie(
    context,
    await mintSessionToken({ sub: EMPLOYEE_USER_ID, role: "employee" }),
  );
  await page.goto("/notifications");

  const items = page.getByRole("listitem");
  await expect(items).toHaveCount(3);

  await setSessionCookie(
    context,
    await mintSessionToken({ sub: MANAGER_USER_ID, role: "manager" }),
  );
  await page.goto("/notifications");
  await expect(items).toHaveCount(1);
});
