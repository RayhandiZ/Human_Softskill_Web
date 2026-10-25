import { tangani } from '../../../../src/server/api'
import { cabutSertifikat } from '../../../../src/server/sertifikat'

/* Admin biasa atau super admin mencabut akses cetak yang sudah disetujui, langsung, dengan alasan. */
export const POST = (request) => tangani(request, ['admin'], cabutSertifikat)
