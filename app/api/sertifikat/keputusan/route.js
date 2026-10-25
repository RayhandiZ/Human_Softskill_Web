import { tangani } from '../../../../src/server/api'
import { putuskanSertifikat } from '../../../../src/server/sertifikat'

/* Keputusan dua lapis atas permintaan akses cetak sertifikat: admin biasa lapis pertama, super admin lapis kedua. */
export const POST = (request) => tangani(request, ['admin'], putuskanSertifikat)
