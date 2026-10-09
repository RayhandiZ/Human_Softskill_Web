import { tangani } from '../../../src/server/api'
import { bacaLog } from '../../../src/server/log'

/* Satu halaman log aktivitas: perubahan nilai atau tindakan admin, dengan filter. Hanya Kemahasiswaan.
   Memakai POST karena `tangani` hanya membaca isi permintaan pada POST; log tidak diubah oleh pintu ini. */
export const POST = (request) => tangani(request, ['admin'], bacaLog)
