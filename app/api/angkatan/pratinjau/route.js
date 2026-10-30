import { tangani } from '../../../../src/server/api'
import { pratinjauLayar } from '../../../../src/server/angkatan'

/* Ringkasan sebelum mengunci angkatan: berapa yang berhak sertifikat. Hanya Kemahasiswaan; admin biasa hanya untuk
   angkatan yang terlihat olehnya (angkatanTersembunyi di src/server/muat.js). */
export const POST = (request) => tangani(request, ['admin'], pratinjauLayar)
