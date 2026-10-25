import { tangani } from '../../../../src/server/api'
import { kelolaAngkatan } from '../../../../src/server/dataMaster'

/* Menambah angkatan baru atau mengubah labelnya. Hanya super admin: sejak rapat 24 Okt 2026 data master dipegang
   penuh super admin, dan admin yang diberi izin hanya bisa melihatnya. */
export const POST = (request) => tangani(request, ['superadmin'], kelolaAngkatan)
