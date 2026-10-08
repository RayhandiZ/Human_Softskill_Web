import { tangani } from '../../../src/server/api'
import { simpanProfil } from '../../../src/server/profil'

/* Menyimpan isian profil milik pemilik sesi sendiri. */
export const PUT = (request) => tangani(request, null, simpanProfil)
