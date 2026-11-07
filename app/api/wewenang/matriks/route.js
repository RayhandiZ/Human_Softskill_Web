import { tangani } from '../../../../src/server/api'
import { ubahMatriks } from '../../../../src/server/wewenang'

/* Super admin memberi keterangan pada sel matriks Peran & Wewenang, atau menambah, mengubah, mengarsipkan, dan
   memulihkan baris kebijakan tertulis; selalu dengan alasan. Hanya tulisan: tidak ada pintu yang menjalankannya. */
export const POST = (request) => tangani(request, ['superadmin'], ubahMatriks)
