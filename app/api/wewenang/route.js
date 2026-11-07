import { tangani } from '../../../src/server/api'
import { ubahWewenang } from '../../../src/server/wewenang'

/* Super admin menutup sementara, atau membuka lagi, satu sakelar wewenang (halaman Peran & Wewenang), dengan alasan. */
export const POST = (request) => tangani(request, ['superadmin'], ubahWewenang)
