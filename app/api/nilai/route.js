import { tangani } from '../../../src/server/api'
import { simpanBatch } from '../../../src/server/nilai'

/* Menyimpan sekumpulan nilai sebagai satu batch (input dan import Kemahasiswaan). Hanya super admin: sejak rapat
   24 Okt 2026 admin hanya membaca nilai, dan dosen mengunggah lewat /api/nilai/dosen. */
export const POST = (request) => tangani(request, ['superadmin'], simpanBatch)
