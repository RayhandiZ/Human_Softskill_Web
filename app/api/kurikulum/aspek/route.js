import { tangani } from '../../../../src/server/api'
import { denganPersetujuan } from '../../../../src/server/persetujuan'

/* Menambah, mengubah struktur, mengarsipkan, atau memulihkan aspek CPMK (src/server/aspek.js). Super admin langsung;
   admin biasa selalu mengajukan ke super admin (aksi KELOLA_ASPEK). */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('KELOLA_ASPEK'))
