import { tangani } from '../../../src/server/api'
import { ajukanKoreksi } from '../../../src/server/pengajuan'
import { denganWewenang } from '../../../src/server/wewenang'

/* Mahasiswa mengajukan koreksi atas satu komponen nilainya, kecuali sedang ditutup Super Admin (sakelar AJUKAN_KOREKSI
   di halaman Peran & Wewenang). */
export const POST = (request) => tangani(request, ['student'], denganWewenang('AJUKAN_KOREKSI', ajukanKoreksi))
