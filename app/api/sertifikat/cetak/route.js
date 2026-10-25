import { tangani } from '../../../../src/server/api'
import { catatCetak } from '../../../../src/server/sertifikat'

/* Dipanggil tepat sebelum dialog cetak dibuka, oleh mahasiswa pemilik atau Kemahasiswaan: dicatat, dan ditolak bila
   akses cetaknya sudah dicabut atau syaratnya gugur. */
export const POST = (request) => tangani(request, ['student', 'admin'], catatCetak)
