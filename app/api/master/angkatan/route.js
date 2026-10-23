import { tangani } from '../../../../src/server/api'
import { kelolaAngkatan } from '../../../../src/server/dataMaster'

/* Menambah angkatan baru atau mengubah labelnya. Super admin, dan admin yang diberi izin kelola data master. */
export const POST = (request) => tangani(request, ['master'], kelolaAngkatan)
