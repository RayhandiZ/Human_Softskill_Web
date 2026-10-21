import { tangani } from '../../../../src/server/api'
import { hapusAkun } from '../../../../src/server/akses'

/* Menghapus permanen akun yang aksesnya sudah dicabut dan belum punya data. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], hapusAkun)
