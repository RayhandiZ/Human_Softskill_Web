import { tangani } from '../../../../src/server/api'
import { denganPersetujuan } from '../../../../src/server/persetujuan'

/* Admin biasa meminta akses baca data master; selalu diajukan ke super admin, dan disetujui berarti izin lihatnya
   dinyalakan (AKSES_DATA_MASTER di src/server/persetujuan.js). */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('AKSES_DATA_MASTER'))
