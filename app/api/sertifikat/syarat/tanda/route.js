import { tangani } from '../../../../../src/server/api'
import { tandaiSyaratSertifikat } from '../../../../../src/server/syaratSertifikat'

/* Menandai mahasiswa sudah memenuhi syarat sertifikat tambahan yang berjenis manual, atau membatalkannya. Hanya super admin. */
export const POST = (request) => tangani(request, ['superadmin'], tandaiSyaratSertifikat)
