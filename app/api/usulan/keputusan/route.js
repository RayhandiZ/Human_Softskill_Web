import { tangani } from '../../../../src/server/api'
import { denganPersetujuan } from '../../../../src/server/persetujuan'

/* Keputusan atas usulan nilai dosen. Hanya Kemahasiswaan; menyetujui usulan untuk mahasiswa yang sudah lewat
   Semester 3 menunggu persetujuan super admin bila dilakukan admin biasa. */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('PUTUSKAN_USULAN'))
