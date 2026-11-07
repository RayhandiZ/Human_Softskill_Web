import { tangani } from '../../../src/server/api'
import { bacaLog } from '../../../src/server/log'
import { denganWewenang } from '../../../src/server/wewenang'

/* Satu halaman log aktivitas: perubahan nilai atau tindakan admin, dengan filter. Hanya Kemahasiswaan.
   Memakai POST karena `tangani` hanya membaca isi permintaan pada POST; log tidak diubah oleh pintu ini.
   Super Admin bisa menutupnya untuk admin biasa (sakelar BACA_LOG_ADMIN); Super Admin sendiri tetap bisa membaca. */
export const POST = (request) => tangani(request, ['admin'], denganWewenang('BACA_LOG_ADMIN', bacaLog))
