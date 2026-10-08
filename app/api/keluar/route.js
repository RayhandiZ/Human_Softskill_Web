import { cookieHapus } from '../../../src/server/sesi'

/* Keluar: menghapus cookie sesi. */
export function POST() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookieHapus() } })
}
