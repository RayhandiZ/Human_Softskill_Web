import { tangani } from '../../../../src/server/api'
import { ubahAkses } from '../../../../src/server/akses'

/* Mencabut atau memulihkan akses satu akun dosen atau admin, dengan alasan. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], ubahAkses)
