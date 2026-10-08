import { akunDariId } from '../../../src/server/masuk'
import { cookieHapus, cookieSesi, penggunaIdDari } from '../../../src/server/sesi'
import { jawabGalat } from '../../../src/server/api'

/* Akun pemilik cookie, dibaca ulang dari basis data setiap halaman dimuat. Cookie-nya
   sekalian diperpanjang, jadi pengguna yang aktif tidak terlempar keluar di tengah kerja. */
export async function GET(request) {
  const id = await penggunaIdDari(request)
  if (!id) return Response.json({ akun: null }, { status: 401 })
  try {
    const akun = await akunDariId(id)
    return Response.json({ akun }, { headers: { 'Set-Cookie': await cookieSesi(id) } })
  } catch (e) {
    const jawab = jawabGalat(e)
    // Akun yang hilang atau dinonaktifkan: cookie-nya dibuang. Basis data yang mati tidak.
    if (jawab.status !== 401 && jawab.status !== 403) return jawab
    return Response.json(await jawab.json(), { status: jawab.status, headers: { 'Set-Cookie': cookieHapus() } })
  }
}
