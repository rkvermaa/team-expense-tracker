import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Deliberately fake credential for the throwaway e2e database - not a real secret.
const DUMMY_PASSWORD = 'dummy-e2e-credential'

export const E2E_USER = { email: 'e2e@example.com', password: DUMMY_PASSWORD, role: 'member' }

export const NEXT_DB_PATH = path.resolve(__dirname, '../data/e2e-next.db')

async function setUpNextDb() {
  fs.mkdirSync(path.dirname(NEXT_DB_PATH), { recursive: true })
  fs.rmSync(NEXT_DB_PATH, { force: true })

  const { createDb } = await import('../src/db/client.js')
  const { runMigrations } = await import('../src/db/migrate.js')
  const { seed } = await import('../src/db/seed.js')

  const db = createDb(NEXT_DB_PATH)
  try {
    runMigrations(db)
    seed(db)
  } finally {
    db.$client.close()
  }
}

async function setUpLegacyServerDb() {
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

export default async function globalSetup() {
  await setUpNextDb()
  await setUpLegacyServerDb()
}
