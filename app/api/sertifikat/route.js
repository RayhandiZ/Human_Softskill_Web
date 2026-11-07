import { tangani } from '../../../src/server/api'
import { mintaSertifikat } from '../../../src/server/sertifikat'
import { denganWewenang } from '../../../src/server/wewenang'

/* Mahasiswa yang memenuhi seluruh syarat meminta akses cetak sertifikat (rapat 24 Okt 2026), kecuali sedang ditutup
   Super Admin (sakelar MINTA_SERTIFIKAT). Keputusan, pencabutan, dan pencetakan di pintu lain tidak ikut tertutup. */
export const POST = (request) => tangani(request, ['student'], denganWewenang('MINTA_SERTIFIKAT', mintaSertifikat))
