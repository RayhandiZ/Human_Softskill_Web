import { tangani } from '../../../src/server/api'
import { daftarAkses } from '../../../src/server/akses'

/* Daftar akun dosen dan admin beserta status aksesnya. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], daftarAkses)
