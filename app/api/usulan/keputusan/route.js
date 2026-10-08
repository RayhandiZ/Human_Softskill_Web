import { tangani } from '../../../../src/server/api'
import { putuskanUsulan } from '../../../../src/server/pengajuan'

/* Keputusan atas usulan nilai dosen. Hanya Kemahasiswaan. */
export const POST = (request) => tangani(request, ['admin'], putuskanUsulan)
