import { mintaTautan } from '../../../src/server/lupaSandi'
import { jawabGalat } from '../../../src/server/api'

/* Lupa kata sandi, langkah 1: kirim tautan atur ulang ke email mahasiswa atau dosen. Tanpa sesi. Jawabannya sama untuk email
   terdaftar dan tidak terdaftar; isinya di src/server/lupaSandi.js. */
export async function POST(request) {
  try {
    await mintaTautan(await request.json().catch(() => ({})), request)
    return Response.json({ ok: true })
  } catch (e) {
    return jawabGalat(e)
  }
}
