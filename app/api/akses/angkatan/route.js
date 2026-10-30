import { tangani } from '../../../../src/server/api'
import { aturAksesAngkatan } from '../../../../src/server/akses'

/* Super admin mengatur angkatan yang terlihat oleh seorang admin biasa, dengan alasan: membuka angkatan yang sudah
   lewat Semester 3 (bawaannya tersembunyi) atau menonaktifkan angkatan Semester 1–3 (bawaannya terlihat). */
export const POST = (request) => tangani(request, ['superadmin'], aturAksesAngkatan)
