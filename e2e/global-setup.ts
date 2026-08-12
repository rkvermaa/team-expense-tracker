import { execSync } from 'node:child_process'
import path from 'node:path'

// Deliberately fake credential for the throwaway e2e database - not a real secret.
const DUMMY_PASSWORD = 'dummy-e2e-credential'

export const E2E_USER = { email: 'e2e@example.com', password: DUMMY_PASSWORD, role: 'member' }

export default async function globalSetup() {
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
