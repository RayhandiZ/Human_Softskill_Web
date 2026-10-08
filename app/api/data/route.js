import { tangani } from '../../../src/server/api'
import { muatData } from '../../../src/server/muat'

/* Data halaman sesuai peran pemilik sesi. Isinya ada di src/server/muat.js. */
export const GET = (request) => tangani(request, null, (pengguna) => muatData(pengguna))
