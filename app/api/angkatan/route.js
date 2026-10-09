import { tangani } from '../../../src/server/api'
import { ringkasan } from '../../../src/server/angkatan'

/* Daftar angkatan beserta kelengkapan nilai, kesiapan dikunci, dan siapa yang mengunci. Hanya Kemahasiswaan. */
export const GET = (request) => tangani(request, ['admin'], ringkasan)
