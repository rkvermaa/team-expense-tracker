import path from 'node:path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { createApp } from './app'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set; refusing to start')
  process.exit(1)
}

const port = Number(process.env.ARC_DEV_PORT ?? 8003)
const prisma = new PrismaClient()

createApp(prisma).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
