import { tangani } from '../../../../src/server/api'
import { kelolaMahasiswa } from '../../../../src/server/dataMaster'

/* Menambah akun mahasiswa atau mengubah datanya (bukan NIM). Super admin, dan admin yang diberi izin kelola data master. */
export const POST = (request) => tangani(request, ['master'], kelolaMahasiswa)
