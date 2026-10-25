import { tangani } from '../../../../src/server/api'
import { unggahNilaiDosen } from '../../../../src/server/pengajuan'

/* Dosen mengunggah nilai kelasnya dari rekap Excel; langsung tersimpan sebagai satu batch atas namanya. Menggantikan
   /api/usulan sejak rapat 24 Okt 2026. */
export const POST = (request) => tangani(request, ['dosen'], unggahNilaiDosen)
