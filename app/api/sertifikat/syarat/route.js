import { tangani } from '../../../../src/server/api'
import { ubahSyaratSertifikat } from '../../../../src/server/syaratSertifikat'

/* Mengubah syarat kelayakan cetak sertifikat dari Aturan Sistem. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], ubahSyaratSertifikat)
