import { aturSandi } from '../../../src/server/lupaSandi'
import { jawabGalat } from '../../../src/server/api'

/* Lupa kata sandi, langkah 2: { token } memeriksa tautan (jawabannya email akunnya), { token, sandi } mengganti kata sandi.
   Tanpa sesi. POST, bukan GET, supaya token tidak tercatat di log alamat server. Isinya di src/server/lupaSandi.js. */
export async function POST(request) {
  try {
    return Response.json(await aturSandi(await request.json().catch(() => ({}))))
  } catch (e) {
    return jawabGalat(e)
  }
}
