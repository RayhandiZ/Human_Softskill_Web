import { tangani } from '../../../src/server/api'
import { denganPersetujuan } from '../../../src/server/persetujuan'

/* Menyimpan sekumpulan nilai sebagai satu batch. Hanya Kemahasiswaan; nilai mahasiswa yang sudah lewat
   Semester 3 menunggu persetujuan super admin bila disimpan admin biasa (src/server/persetujuan.js). */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('SIMPAN_NILAI'))
