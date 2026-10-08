import { tangani } from '../../../../src/server/api'
import { putuskanKoreksi } from '../../../../src/server/pengajuan'

/* Keputusan atas pengajuan koreksi. Hanya Kemahasiswaan. */
export const POST = (request) => tangani(request, ['admin'], putuskanKoreksi)
