import express from 'express'
import cookieParser from 'cookie-parser'
import type { PrismaClient } from '@prisma/client'

export function createApp(prisma: PrismaClient) {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  return app
}
