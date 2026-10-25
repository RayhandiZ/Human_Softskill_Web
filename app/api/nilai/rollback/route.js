import { tangani } from '../../../../src/server/api'
import { rollbackBatch } from '../../../../src/server/nilai'

/* Membatalkan seluruh nilai satu batch, termasuk unggahan dosen. Hanya super admin: admin hanya membaca nilai sejak
   rapat 24 Okt 2026. */
export const POST = (request) => tangani(request, ['superadmin'], rollbackBatch)
