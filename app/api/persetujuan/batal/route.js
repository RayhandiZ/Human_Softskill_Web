import { tangani } from '../../../../src/server/api'
import { batalkanPermintaan } from '../../../../src/server/persetujuan'

/* Admin, atau dosen (perbaikan nilai angkatan yang sudah selesai atau disahkan), menarik permintaannya sendiri selama
   belum diputuskan super admin. */
export const POST = (request) => tangani(request, ['admin', 'dosen'], batalkanPermintaan)
