import { tangani } from '../../../../src/server/api'
import { rollbackBatch } from '../../../../src/server/nilai'

/* Membatalkan seluruh nilai satu batch. Hanya Kemahasiswaan. */
export const POST = (request) => tangani(request, ['admin'], rollbackBatch)
