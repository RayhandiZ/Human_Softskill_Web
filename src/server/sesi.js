import { SignJWT, jwtVerify } from 'jose'

// Sesi login disimpan sebagai cookie httpOnly bertanda tangan: JavaScript di peramban tidak bisa
// membacanya, dan isinya tidak bisa diubah tanpa AUTH_SECRET.
const NAMA = 'sk5c_sesi'
const UMUR_DETIK = 60 * 60 * 8

function kunci() {
  const rahasia = process.env.AUTH_SECRET
  if (!rahasia) throw new Error('AUTH_SECRET belum diatur di .env.')
  return new TextEncoder().encode(rahasia)
}

const atribut = (umur) =>
  ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + umur, process.env.NODE_ENV === 'production' && 'Secure']
    .filter(Boolean)
    .join('; ')

/** Nilai header Set-Cookie untuk sesi baru. */
export async function cookieSesi(penggunaId) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(penggunaId))
    .setIssuedAt()
    .setExpirationTime(UMUR_DETIK + 's')
    .sign(kunci())
  return NAMA + '=' + token + '; ' + atribut(UMUR_DETIK)
}

/** Nilai header Set-Cookie yang menghapus sesi. */
export const cookieHapus = () => NAMA + '=; ' + atribut(0)

/** id pengguna dari cookie sesi yang sah, atau null. */
export async function penggunaIdDari(request) {
  const cookie = request.headers.get('cookie') ?? ''
  const token = cookie
    .split(/;\s*/)
    .find((c) => c.startsWith(NAMA + '='))
    ?.slice(NAMA.length + 1)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, kunci(), { algorithms: ['HS256'] })
    return Number(payload.sub) || null
  } catch {
    return null
  }
}
