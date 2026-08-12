import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import type { PrismaClient, User } from '@prisma/client'
import { createApp } from '../src/app'
import { createTestDb, createUser, TEST_PASSWORD } from './helpers'

describe('GET /api/auth/me', () => {
  let prisma: PrismaClient
  let app: ReturnType<typeof createApp>
  let user: User

  beforeAll(async () => {
    prisma = createTestDb()
    app = createApp(prisma)
    user = await createUser(prisma, { email: 'carol@example.com', password: TEST_PASSWORD })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns the user for a valid token cookie', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: TEST_PASSWORD })
    const cookie = ([] as string[]).concat(login.headers['set-cookie']!)[0].split(';')[0]

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.user).toEqual({ id: user.id, email: 'carol@example.com', role: 'member' })
  })

  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
  })

  it('returns 401 for a garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=not-a-jwt')

    expect(res.status).toBe(401)
  })

  it('returns 401 for an expired token', async () => {
    const expired = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      'test-secret',
      { expiresIn: '-1s' },
    )

    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${expired}`)

    expect(res.status).toBe(401)
  })
})
