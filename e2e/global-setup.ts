import { execSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { E2E_APP_DB_PATH } from '../playwright.config'
import { createDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Deliberately fake credential for the throwaway e2e database - not a real secret.
const DUMMY_PASSWORD = 'dummy-e2e-credential'

export const E2E_USER = { email: 'e2e@example.com', password: DUMMY_PASSWORD, role: 'member' }

/** Migrates the throwaway root-app e2e database used by delete-expense.spec.ts. */
function setUpRootAppDb() {
  rmSync(E2E_APP_DB_PATH, { force: true })
  mkdirSync(path.dirname(E2E_APP_DB_PATH), { recursive: true })
  const db = createDb(E2E_APP_DB_PATH)
  try {
    runMigrations(db)
  } finally {
    db.$client.close()
  }
}

export default async function globalSetup() {
  setUpRootAppDb()

  const serverRoot = path.resolve(__dirname, '../server')
  const dbUrl = `file:${path.join(serverRoot, 'prisma/e2e.db')}`
  execSync('npx prisma db push --skip-generate --force-reset', {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'ignore',
  })

  const { PrismaClient } = await import('@prisma/client')
  const bcrypt = (await import('bcryptjs')).default
  const prisma = new PrismaClient({ datasourceUrl: dbUrl })
  try {
    await prisma.user.create({
      data: {
        email: E2E_USER.email,
        passwordHash: await bcrypt.hash(E2E_USER.password, 10),
        role: E2E_USER.role,
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}
