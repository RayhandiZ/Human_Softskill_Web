import { tangani } from '../../../../src/server/api'
import { kelolaProdi } from '../../../../src/server/dataMaster'

/* Menambah atau mengubah fakultas dan program studi. Super admin, dan admin yang diberi izin kelola data master. */
export const POST = (request) => tangani(request, ['master'], kelolaProdi)
