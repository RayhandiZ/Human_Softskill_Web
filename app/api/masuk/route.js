import { periksaMasuk } from '../../../src/server/masuk'
import { cookieSesi } from '../../../src/server/sesi'
import { jawabGalat } from '../../../src/server/api'

/* Pintu masuk: memeriksa email dan kata sandi ke basis data, lalu memasang cookie sesi.
   Isinya ada di src/server/masuk.js. */
export async function POST(request) {
  try {
    const akun = await periksaMasuk(await request.json().catch(() => ({})))
    return Response.json({ akun }, { headers: { 'Set-Cookie': await cookieSesi(akun.penggunaId) } })
  } catch (e) {
    return jawabGalat(e)
  }
}
