import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import type { PrismaClient, User } from '@prisma/client'
import { createApp } from '../src/app'
import { createTestDb, createUser } from './helpers'

describe('POST /api/auth/login', () => {
  let prisma: PrismaClient
  let app: ReturnType<typeof createApp>
  let user: User

  beforeAll(async () => {
    prisma = createTestDb()
    app = createApp(prisma)
    user = await createUser(prisma, { email: 'alice@example.com', password: 's3cret-pw' })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns 200 and sets an HttpOnly JWT cookie on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 's3cret-pw' })

    expect(res.status).toBe(200)

    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    const tokenCookie = ([] as string[]).concat(setCookie!).find((c) => c.startsWith('token='))
    expect(tokenCookie).toBeDefined()
    expect(tokenCookie).toMatch(/HttpOnly/i)
    expect(tokenCookie).toMatch(/SameSite=Lax/i)
    expect(tokenCookie).toMatch(/Path=\//i)
    expect(tokenCookie).toMatch(/Max-Age=/i)

    const tokenValue = decodeURIComponent(tokenCookie!.split(';')[0].slice('token='.length))
    const payload = jwt.verify(tokenValue, 'test-secret') as jwt.JwtPayload
    expect(payload.sub).toBe(user.id)
    expect(payload.email).toBe('alice@example.com')
    expect(payload.role).toBe('member')
  })

  it('returns the user without the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 's3cret-pw' })

    expect(res.status).toBe(200)
    expect(res.body.user).toEqual({ id: user.id, email: 'alice@example.com', role: 'member' })
    expect(JSON.stringify(res.body)).not.toContain(user.passwordHash)
  })
})
