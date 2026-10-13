import { tangani } from '../../../../src/server/api'
import { denganPersetujuan } from '../../../../src/server/persetujuan'

/* Membatalkan seluruh nilai satu batch. Hanya Kemahasiswaan; batch yang menyentuh mahasiswa yang sudah lewat
   Semester 3 menunggu persetujuan super admin bila dibatalkan admin biasa. */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('ROLLBACK_NILAI'))
