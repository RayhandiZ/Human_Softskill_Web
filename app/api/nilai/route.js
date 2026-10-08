import { tangani } from '../../../src/server/api'
import { simpanBatch } from '../../../src/server/nilai'

/* Menyimpan sekumpulan nilai sebagai satu batch. Hanya Kemahasiswaan. */
export const POST = (request) => tangani(request, ['admin'], simpanBatch)
