import { tangani } from '../../../../src/server/api'
import { putuskanKoreksi } from '../../../../src/server/pengajuan'

/* Keputusan dua lapis atas pengajuan koreksi (rapat 24 Okt 2026): admin biasa meneruskan atau menolak, super admin
   menyetujui dan menerapkan nilainya atau menolak. */
export const POST = (request) => tangani(request, ['admin'], putuskanKoreksi)
