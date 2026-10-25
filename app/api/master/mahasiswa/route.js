import { tangani } from '../../../../src/server/api'
import { kelolaMahasiswa } from '../../../../src/server/dataMaster'

/* Menambah akun mahasiswa atau mengubah datanya (bukan NIM). Hanya super admin: sejak rapat 24 Okt 2026 data master
   dipegang penuh super admin, dan admin yang diberi izin hanya bisa melihatnya. */
export const POST = (request) => tangani(request, ['superadmin'], kelolaMahasiswa)
