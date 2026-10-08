import { tangani } from '../../../src/server/api'
import { ajukanKoreksi } from '../../../src/server/pengajuan'

/* Mahasiswa mengajukan koreksi atas satu komponen nilainya. */
export const POST = (request) => tangani(request, ['student'], ajukanKoreksi)
