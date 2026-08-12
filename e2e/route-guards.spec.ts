import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { BASE_URL } from "../tests/helpers/env";
import { mintSessionToken, tamperToken } from "../tests/helpers/jwt";

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

async function expectNoErrorPage(page: Page) {
  // innerText covers only rendered content, unlike textContent, which would
  // also pick up Next's inline flight-data scripts (they mention 404 in dev).
  const visibleText = await page.locator("body").innerText();
  expect(visibleText).not.toContain("404");
  expect(visibleText).not.toContain("500");
  expect(visibleText).not.toMatch(/application error|internal server error/i);
  await expect(
    page.getByRole("heading", { name: /404|500|error/i }),
  ).toHaveCount(0);
}

test.describe("AC1: unauthenticated requests redirect to login", () => {
  test("direct URL entry to /dashboard lands on /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("direct URL entry to /manager lands on /login", async ({ page }) => {
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("direct URL entry to the root path lands on /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("AC2: employee on a manager-only route", () => {
  test("is redirected to their own dashboard without an error page", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context, await mintSessionToken({ role: "employee" }));
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expectNoErrorPage(page);
  });
});

test.describe("AC3: manager access", () => {
  test("a manager reaches /manager without being redirected", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context, await mintSessionToken({ role: "manager" }));
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/manager$/);
    await expect(
      page.getByRole("heading", { name: "Manager area" }),
    ).toBeVisible();
  });
});

test.describe("AC4: role comes from the verified JWT, not the client", () => {
  test("an employee token with its role claim flipped client-side is rejected", async ({
    page,
    context,
  }) => {
    const employeeToken = await mintSessionToken({ role: "employee" });
    await setSessionCookie(context, tamperToken(employeeToken, { role: "manager" }));
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("after clearing the spoofed cookie, a genuine employee still cannot reach /manager", async ({
    page,
    context,
  }) => {
    const employeeToken = await mintSessionToken({ role: "employee" });
    await setSessionCookie(context, tamperToken(employeeToken, { role: "manager" }));
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/login$/);

    await context.clearCookies();
    await setSessionCookie(context, employeeToken);
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("AC5: behaviour is consistent across navigation modes", () => {
  test("link click: employee clicking the manager link stays on /dashboard", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context, await mintSessionToken({ role: "employee" }));
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Manager area" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expectNoErrorPage(page);
  });

  test("link click: manager clicking the manager link reaches /manager", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context, await mintSessionToken({ role: "manager" }));
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Manager area" }).click();
    await expect(page).toHaveURL(/\/manager$/);
    await expect(
      page.getByRole("heading", { name: "Manager area" }),
    ).toBeVisible();
  });

  test("link click: a visitor whose session disappeared clicking the manager link lands on /login", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context, await mintSessionToken({ role: "manager" }));
    await page.goto("/dashboard");
    await context.clearCookies();
    await page.getByRole("link", { name: "Manager area" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("refresh: removing the session then reloading a protected page lands on /login", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context, await mintSessionToken({ role: "employee" }));
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    await context.clearCookies();
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("refresh: an employee session downgraded mid-visit is bounced off /manager on reload", async ({
    page,
    context,
  }) => {
    await setSessionCookie(context, await mintSessionToken({ role: "manager" }));
    await page.goto("/manager");
    await expect(page).toHaveURL(/\/manager$/);

    await context.clearCookies();
    await setSessionCookie(context, await mintSessionToken({ role: "employee" }));
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectNoErrorPage(page);
  });
});
