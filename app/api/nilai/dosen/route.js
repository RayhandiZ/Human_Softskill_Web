import { tangani } from '../../../../src/server/api'
import { unggahNilaiDosen } from '../../../../src/server/pengajuan'
import { denganWewenang } from '../../../../src/server/wewenang'

/* Dosen mengunggah nilai kelasnya dari rekap Excel; langsung tersimpan sebagai satu batch atas namanya. Menggantikan
   /api/usulan sejak rapat 24 Okt 2026. Bisa ditutup Super Admin (sakelar UNGGAH_NILAI_DOSEN), termasuk perbaikan untuk
   angkatan yang sudah disahkan; perbaikan yang sudah diajukan tetap diputuskan lewat /api/persetujuan/keputusan. */
export const POST = (request) => tangani(request, ['dosen'], denganWewenang('UNGGAH_NILAI_DOSEN', unggahNilaiDosen))
