import { tangani } from '../../../../src/server/api'
import { denganPersetujuan } from '../../../../src/server/persetujuan'

/* Menyimpan bobot komponen per aspek dan cara membagi bobot bawaan. Hanya Kemahasiswaan; bila nilai mahasiswa
   yang sudah lewat Semester 3 ikut berubah, admin biasa harus menunggu persetujuan super admin. */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('UBAH_BOBOT'))
