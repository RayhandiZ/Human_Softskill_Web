import { tangani } from '../../../../src/server/api'
import { batalkanPermintaan } from '../../../../src/server/persetujuan'

/* Admin menarik permintaannya sendiri selama belum diputuskan super admin. */
export const POST = (request) => tangani(request, ['admin'], batalkanPermintaan)
