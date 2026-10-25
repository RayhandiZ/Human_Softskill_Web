import { tangani } from '../../../../src/server/api'
import { kelolaProdi } from '../../../../src/server/dataMaster'

/* Menambah atau mengubah fakultas dan program studi. Hanya super admin: sejak rapat 24 Okt 2026 data master dipegang
   penuh super admin, dan admin yang diberi izin hanya bisa melihatnya. */
export const POST = (request) => tangani(request, ['superadmin'], kelolaProdi)
