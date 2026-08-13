import { expect, test, type BrowserContext } from "@playwright/test";

import { BASE_URL } from "../tests/helpers/env";
import { mintSessionToken } from "../tests/helpers/jwt";
import { employeeUserId } from "../tests/helpers/next-db";
import { SEED_EXPENSES } from "../src/lib/seed-data";

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

async function loginAsEmployee(context: BrowserContext) {
  const token = await mintSessionToken({
    sub: String(employeeUserId()),
    role: "employee",
  });
  await setSessionCookie(context, token);
}

test.describe("EXP-STORY-005: expense list view", () => {
  test("AC5: /expenses is reachable directly by URL and shows the list heading", async ({
    page,
    context,
  }) => {
    await loginAsEmployee(context);
    await page.goto("/expenses");
    await expect(page).toHaveURL(/\/expenses$/);
    await expect(
      page.getByRole("heading", { name: "Expenses" }),
    ).toBeVisible();
  });

  test("AC5: the dashboard links to the expense list", async ({
    page,
    context,
  }) => {
    await loginAsEmployee(context);
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /expenses/i }).click();
    await expect(page).toHaveURL(/\/expenses$/);
    await expect(
      page.getByRole("heading", { name: "Expenses" }),
    ).toBeVisible();
  });

  test("AC1: each row shows its date, amount (USD), category and status", async ({
    page,
    context,
  }) => {
    await loginAsEmployee(context);
    await page.goto("/expenses");

    // "Client lunch" is a known seed expense: $42.50, Meals, submitted.
    const row = page.getByRole("link").filter({ hasText: "$42.50" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Meals");
    await expect(row).toContainText("submitted");
    // Date is rendered as the stored YYYY-MM-DD expense_date.
    await expect(row).toContainText(/\d{4}-\d{2}-\d{2}/);
  });

  test("AC2: the employee sees exactly their own seeded expenses", async ({
    page,
    context,
  }) => {
    await loginAsEmployee(context);
    await page.goto("/expenses");

    const rows = page.getByRole("link");
    await expect(rows).toHaveCount(SEED_EXPENSES.length);
  });

  test("AC3: clicking a row opens its detail view showing the record", async ({
    page,
    context,
  }) => {
    await loginAsEmployee(context);
    await page.goto("/expenses");

    // "Client lunch" is a known seed expense: $42.50, Meals, submitted.
    const row = page.getByRole("link").filter({ hasText: "$42.50" });
    await expect(row).toHaveAttribute("href", /^\/expenses\/\d+$/);
    await row.click();

    // The destination is a real detail view, not Next's 404 page: it renders a
    // detail heading and the record's own fields (amount / category / status /
    // description), proving navigation reached content, not just a URL change.
    await page.waitForURL(/\/expenses\/\d+$/);
    await expect(
      page.getByRole("heading", { name: "Expense detail" }),
    ).toBeVisible();
    await expect(page.getByText("$42.50")).toBeVisible();
    await expect(page.getByText("Meals")).toBeVisible();
    await expect(page.getByText("submitted")).toBeVisible();
    await expect(page.getByText("Client lunch")).toBeVisible();
  });

  test("AC3: an expense the employee does not own is not viewable", async ({
    page,
    context,
  }) => {
    await loginAsEmployee(context);
    // A valid session, but an id that does not belong to this employee: the
    // owner-scoped query returns nothing and the route renders not-found, so
    // the detail view never appears.
    await page.goto("/expenses/999999");
    await expect(
      page.getByRole("heading", { name: "Expense detail" }),
    ).toHaveCount(0);
  });

  test("AC4: an employee with no expenses sees the empty state and no rows", async ({
    page,
    context,
  }) => {
    // A valid session for a user id that owns no expenses. Middleware only
    // checks the signature; the query returns [] for this owner.
    const token = await mintSessionToken({ sub: "99999", role: "employee" });
    await setSessionCookie(context, token);
    await page.goto("/expenses");

    await expect(
      page.getByText("You haven't added any expenses yet."),
    ).toBeVisible();
    await expect(page.getByRole("link")).toHaveCount(0);
  });
});
