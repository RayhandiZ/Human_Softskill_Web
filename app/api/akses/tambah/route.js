import { tangani } from '../../../../src/server/api'
import { tambahAkun } from '../../../../src/server/akses'

/* Menambah akun mahasiswa, dosen, atau admin baru. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], tambahAkun)
