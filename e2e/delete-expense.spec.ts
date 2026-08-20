import { expect, test, type BrowserContext } from "@playwright/test";
import { BASE_URL } from "../tests/helpers/env";
import { mintSessionToken } from "../tests/helpers/jwt";
import { expenseExists, insertExpense, insertUser, resetExpenseData } from "./helpers/expenses";

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

test.beforeEach(async () => {
  await resetExpenseData();
});

test.describe("AC2: delete action visibility depends on status", () => {
  test("delete button is shown only for draft and rejected rows", async ({ page, context }) => {
    const userId = await insertUser("employee-ac2@example.com");
    await insertExpense({ userId, description: "Draft lunch", status: "draft" });
    await insertExpense({ userId, description: "Submitted taxi", status: "submitted" });
    await insertExpense({ userId, description: "Approved hotel", status: "approved" });
    await insertExpense({ userId, description: "Rejected dinner", status: "rejected" });

    await setSessionCookie(context, await mintSessionToken({ sub: String(userId) }));
    await page.goto("/dashboard");

    await expect(
      page.getByRole("row", { name: /Draft lunch/ }).getByRole("button", { name: /delete/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("row", { name: /Rejected dinner/ }).getByRole("button", { name: /delete/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("row", { name: /Submitted taxi/ }).getByRole("button", { name: /delete/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("row", { name: /Approved hotel/ }).getByRole("button", { name: /delete/i }),
    ).toHaveCount(0);
  });
});

test.describe("AC3: direct API delete of a submitted expense is rejected", () => {
  test("a direct API request to delete a submitted expense is rejected", async ({ request }) => {
    const userId = await insertUser("employee-ac3@example.com");
    const expenseId = await insertExpense({
      userId,
      description: "Submitted flight",
      status: "submitted",
    });
    const token = await mintSessionToken({ sub: String(userId) });

    const response = await request.delete(`${BASE_URL}/api/expenses/${expenseId}`, {
      headers: { cookie: `session=${token}` },
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Only draft or rejected expenses can be deleted");
    expect(await expenseExists(expenseId)).toBe(true);
  });
});

test.describe("AC4: deletion requires confirmation", () => {
  test("dismissing the confirmation keeps the expense", async ({ page, context }) => {
    const userId = await insertUser("employee-ac4a@example.com");
    const expenseId = await insertExpense({
      userId,
      description: "Draft snack",
      status: "draft",
    });
    await setSessionCookie(context, await mintSessionToken({ sub: String(userId) }));
    await page.goto("/dashboard");

    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("row", { name: /Draft snack/ })
      .getByRole("button", { name: /delete/i })
      .click();

    await expect(page.getByRole("row", { name: /Draft snack/ })).toBeVisible();
    expect(await expenseExists(expenseId)).toBe(true);
  });

  test("accepting the confirmation deletes the expense", async ({ page, context }) => {
    const userId = await insertUser("employee-ac4b@example.com");
    const expenseId = await insertExpense({
      userId,
      description: "Draft coffee",
      status: "draft",
    });
    await setSessionCookie(context, await mintSessionToken({ sub: String(userId) }));
    await page.goto("/dashboard");

    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("row", { name: /Draft coffee/ })
      .getByRole("button", { name: /delete/i })
      .click();

    await expect(page.getByRole("row", { name: /Draft coffee/ })).toHaveCount(0);
    expect(await expenseExists(expenseId)).toBe(false);
  });
});

test.describe("AC5: successful deletion removes the expense permanently", () => {
  test("deleting a draft expense removes it from the list and survives a reload", async ({
    page,
    context,
  }) => {
    const userId = await insertUser("employee-ac5@example.com");
    await insertExpense({ userId, description: "Draft parking", status: "draft" });
    await setSessionCookie(context, await mintSessionToken({ sub: String(userId) }));
    await page.goto("/dashboard");

    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("row", { name: /Draft parking/ })
      .getByRole("button", { name: /delete/i })
      .click();

    await expect(page.getByRole("row", { name: /Draft parking/ })).toHaveCount(0);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("row", { name: /Draft parking/ })).toHaveCount(0);
  });
});
