import { test, expect, type Page } from '@playwright/test'
import { E2E_USER } from './global-setup'

async function logIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /log in/i }).click()
}

test('valid credentials land on the dashboard greeting the user (AC1, AC2)', async ({ page }) => {
  await logIn(page, E2E_USER.email, E2E_USER.password)

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText(E2E_USER.email)).toBeVisible()
})

test('the JWT cookie is HttpOnly and hidden from JavaScript (AC6)', async ({ page, context }) => {
  await logIn(page, E2E_USER.email, E2E_USER.password)
  await expect(page).toHaveURL(/\/dashboard$/)

  const token = (await context.cookies()).find((c) => c.name === 'token')
  expect(token).toBeDefined()
  expect(token!.httpOnly).toBe(true)
  expect(token!.sameSite).toBe('Lax')

  const documentCookie = await page.evaluate(() => document.cookie)
  expect(documentCookie).not.toContain('token')
})

test('invalid credentials show an error and set no cookie (AC3)', async ({ page, context }) => {
  await logIn(page, E2E_USER.email, 'wrong-guess')

  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
  await expect(page).toHaveURL(/\/login$/)
  expect((await context.cookies()).find((c) => c.name === 'token')).toBeUndefined()
})

test('logout clears the cookie and locks authenticated routes (AC4, AC5)', async ({
  page,
  context,
}) => {
  await logIn(page, E2E_USER.email, E2E_USER.password)
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.getByRole('button', { name: /log out/i }).click()

  await expect(page).toHaveURL(/\/login$/)
  expect((await context.cookies()).find((c) => c.name === 'token')).toBeUndefined()

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('a never-authenticated visitor is redirected from /dashboard to /login (AC5)', async ({
  page,
}) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/login$/)
})
