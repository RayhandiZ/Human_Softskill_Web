import { tangani } from '../../../../src/server/api'
import { ubahKelasDosen } from '../../../../src/server/akses'

/* Super admin mengubah kelas seorang dosen: prodi, sumber, semester, dan angkatan yang diampu. */
export const POST = (request) => tangani(request, ['superadmin'], ubahKelasDosen)
