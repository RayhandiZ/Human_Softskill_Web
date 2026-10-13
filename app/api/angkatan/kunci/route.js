import { tangani } from '../../../../src/server/api'
import { denganPersetujuan } from '../../../../src/server/persetujuan'

/* Mengunci angkatan dengan konfirmasi ketik. Hanya Kemahasiswaan; karena angkatan baru boleh dikunci sesudah
   Semester 3, kunci oleh admin biasa selalu menunggu persetujuan super admin. */
export const POST = (request) => tangani(request, ['admin'], denganPersetujuan('KUNCI_ANGKATAN'))
