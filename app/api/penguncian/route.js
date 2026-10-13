import { tangani } from '../../../src/server/api'
import { denganPersetujuan } from '../../../src/server/persetujuan'

/* Menandai aspek final atau sementara. Hanya Kemahasiswaan; tanda mahasiswa yang sudah lewat Semester 3
   menunggu persetujuan super admin bila diubah admin biasa. */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('UBAH_PENGUNCIAN'))
