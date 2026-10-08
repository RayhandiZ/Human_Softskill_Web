import { tangani } from '../../../../src/server/api'
import { pratinjau } from '../../../../src/server/angkatan'

/* Ringkasan sebelum mengunci angkatan: berapa yang berhak sertifikat. Hanya Kemahasiswaan. */
export const POST = (request) => tangani(request, ['admin'], pratinjau)
