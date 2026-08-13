import { execSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { seed } from '../src/db/seed'
import { NEXT_E2E_DB_PATH } from '../tests/helpers/env'

// ES module scope ("type": "module"): __dirname is not a global here.
const dirname = path.dirname(fileURLToPath(import.meta.url))

// Deliberately fake credential for the throwaway e2e database - not a real secret.
const DUMMY_PASSWORD = 'dummy-e2e-credential'

export const E2E_USER = { email: 'e2e@example.com', password: DUMMY_PASSWORD, role: 'member' }

/**
 * Builds the Next.js app's E2E SQLite database from scratch: drop any stale
 * file, migrate, and seed the demo dataset so the expense list view (and its
 * owning employee) has real data to render. Mirrors the DATABASE_PATH the
 * Next dev webServer is launched with in playwright.config.ts.
 */
function seedNextDb() {
  const dbPath = path.resolve(dirname, '..', NEXT_E2E_DB_PATH)
  rmSync(dbPath, { force: true })
  mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = createDb(dbPath)
  try {
    runMigrations(db)
    seed(db)
  } finally {
    db.$client.close()
  }
}

export default async function globalSetup() {
  seedNextDb()

  const serverRoot = path.resolve(dirname, '../server')
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
