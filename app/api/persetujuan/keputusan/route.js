import { tangani } from '../../../../src/server/api'
import { putuskanPermintaan } from '../../../../src/server/persetujuan'

/* Super admin menyetujui (menjalankan) atau menolak permintaan admin. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], putuskanPermintaan)
