import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { PrismaClient } from '@prisma/client'
import { createApp } from '../src/app'
import { createTestDb, createUser, TEST_PASSWORD } from './helpers'

describe('POST /api/auth/logout', () => {
  let prisma: PrismaClient
  let app: ReturnType<typeof createApp>

  beforeAll(async () => {
    prisma = createTestDb()
    app = createApp(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function expectExpiredTokenCookie(res: request.Response) {
    expect(res.status).toBe(204)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    const tokenCookie = ([] as string[]).concat(setCookie!).find((c) => c.startsWith('token='))
    expect(tokenCookie).toBeDefined()
    // Cookie is cleared: empty value and an expiry in the past (or Max-Age=0).
    expect(tokenCookie).toMatch(/^token=;/)
    expect(tokenCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i)
    // Flags must match the ones used to set it, or browsers will not remove it.
    expect(tokenCookie).toMatch(/HttpOnly/i)
    expect(tokenCookie).toMatch(/Path=\//i)
  }

  it('clears the token cookie for a logged-in user', async () => {
    await createUser(prisma, { email: 'bob@example.com', password: TEST_PASSWORD })
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: TEST_PASSWORD })
    const cookie = ([] as string[]).concat(login.headers['set-cookie']!)[0].split(';')[0]

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie)

    expectExpiredTokenCookie(res)
  })

  it('is idempotent: succeeds without any cookie', async () => {
    const res = await request(app).post('/api/auth/logout')

    expectExpiredTokenCookie(res)
  })
})
