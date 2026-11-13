import { tangani } from '../../../../src/server/api'
import { kelolaKelas } from '../../../../src/server/dataMaster'

/* Menambah atau mengubah nama kelas di dalam satu program studi (sejak 12 Nov 2026). Hanya super admin, sama dengan
   data master lain: admin yang diberi izin hanya melihatnya. */
export const POST = (request) => tangani(request, ['superadmin'], kelolaKelas)
