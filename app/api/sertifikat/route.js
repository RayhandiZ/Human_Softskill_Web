import { tangani } from '../../../src/server/api'
import { mintaSertifikat } from '../../../src/server/sertifikat'

/* Mahasiswa yang memenuhi seluruh syarat meminta akses cetak sertifikat (rapat 24 Okt 2026). */
export const POST = (request) => tangani(request, ['student'], mintaSertifikat)
