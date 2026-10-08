import { tangani } from '../../../src/server/api'
import { setPenguncian } from '../../../src/server/nilai'

/* Menandai aspek final atau sementara. Hanya Kemahasiswaan. */
export const POST = (request) => tangani(request, ['admin'], setPenguncian)
