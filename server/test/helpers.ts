import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const serverRoot = path.resolve(__dirname, '..')

// Deliberately fake, shared across tests - not a real credential.
export const TEST_PASSWORD = 'dummy-test-credential'

/** Creates a fresh SQLite database with the current schema and returns a client bound to it. */
export function createTestDb(): PrismaClient {
  const dir = mkdtempSync(path.join(tmpdir(), 'expense-tracker-test-'))
  const url = `file:${path.join(dir, 'test.db')}`
  execSync('npx prisma db push --skip-generate', {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  })
  return new PrismaClient({ datasourceUrl: url })
}

export async function createUser(
  prisma: PrismaClient,
  { email, password, role = 'member' }: { email: string; password: string; role?: string },
) {
  return prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(password, 10), role },
  })
}
