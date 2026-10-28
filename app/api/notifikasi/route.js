import { tangani } from '../../../src/server/api'
import { bacaNotifikasi } from '../../../src/server/notifikasi'

/* Pembaruan dari Super Admin untuk lonceng admin biasa, beserta jumlah yang belum dibaca akun ini. Hanya membaca. */
export const GET = (request) => tangani(request, ['admin'], bacaNotifikasi)
