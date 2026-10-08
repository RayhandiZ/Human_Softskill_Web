import { tangani } from '../../../../src/server/api'
import { kunci } from '../../../../src/server/angkatan'

/* Mengunci angkatan dengan konfirmasi ketik. Hanya Kemahasiswaan. */
export const POST = (request) => tangani(request, ['admin'], kunci)
