import { tangani } from '../../../../src/server/api'
import { denganPersetujuan } from '../../../../src/server/persetujuan'

/* Menyimpan penilaian satu aspek (teks aspek, komponen, bobot) dari Input Manual. Super admin langsung;
   admin biasa selalu mengajukan dan menunggu persetujuan super admin (src/server/persetujuan.js). */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('UBAH_PENILAIAN'))
