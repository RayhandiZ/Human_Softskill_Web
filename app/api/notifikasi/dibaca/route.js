import { tangani } from '../../../../src/server/api'
import { tandaiNotifikasi } from '../../../../src/server/notifikasi'

/* Menandai pembaruan dari Super Admin sudah dibaca sampai id log tertentu, untuk akun pemilik sesi saja. */
export const POST = (request) => tangani(request, ['admin'], tandaiNotifikasi)
