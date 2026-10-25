import { tangani } from '../../../../src/server/api'
import { putuskanUsulan } from '../../../../src/server/pengajuan'

/* Keputusan atas usulan nilai dosen yang masih menunggu dari sebelum rapat 24 Okt 2026. Dosen kini mengunggah
   langsung, jadi tidak ada usulan baru; yang tersisa diputuskan super admin, karena admin hanya membaca nilai. */
export const POST = (request) => tangani(request, ['superadmin'], putuskanUsulan)
