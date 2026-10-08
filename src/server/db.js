import { PrismaClient } from '@prisma/client'

// Simpan di globalThis supaya hot reload `next dev` tidak membuat koneksi baru terus-menerus.
const g = globalThis
export const db = g.__prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') g.__prisma = db
