import { tangani } from '../../../../src/server/api'
import { aturIzinMaster } from '../../../../src/server/akses'

/* Memberi atau mencabut izin kelola data master satu akun admin. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], aturIzinMaster)
