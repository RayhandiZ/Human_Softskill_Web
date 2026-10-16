import { tangani } from '../../../src/server/api'
import { ubahPeriode } from '../../../src/server/periode'

/* Memindahkan periode akademik yang sedang berjalan, satu semester maju atau mundur. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], ubahPeriode)
