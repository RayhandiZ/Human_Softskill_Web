import { db } from './db.js'
import { siapkanKurikulum } from './kurikulum.js'
import { penggunaIdDari } from './sesi.js'

const PERAN = { MAHASISWA: 'student', DOSEN: 'dosen', ADMIN: 'admin', SUPER_ADMIN: 'admin' }

// Galat yang boleh dibaca pengguna, lengkap dengan kode HTTP-nya.
export class GalatApi extends Error {
  constructor(pesan, status = 400) {
    super(pesan)
    this.status = status
  }
}

// Pemilik cookie dibaca ulang dari basis data di setiap permintaan: akun yang dinonaktifkan
// atau berganti peran langsung berlaku, tanpa menunggu cookie-nya habis.
export async function penggunaDari(request) {
  const id = await penggunaIdDari(request)
  return id ? penggunaDariId(id) : null
}

/** Akun `id` dalam bentuk yang diterima setiap `kerja`; null bila tidak ada atau nonaktif. */
export async function penggunaDariId(id) {
  const p = await db.pengguna.findUnique({ where: { id }, include: { mahasiswa: true, dosen: true } })
  if (!p || !p.aktif) return null
  return {
    id: p.id,
    peran: PERAN[p.peran],
    // Peran SUPER_ADMIN dibaca sebagai admin bertanda superAdmin, jadi semua pintu admin tetap
    // terbuka untuknya.
    superAdmin: p.peran === 'SUPER_ADMIN',
    email: p.email,
    mahasiswa: p.mahasiswa,
    dosen: p.dosen,
  }
}

/** Apakah `pengguna` memenuhi salah satu `peran`. 'superadmin' hanya dipenuhi akun berperan SUPER_ADMIN. */
export const bolehPeran = (pengguna, peran) =>
  !peran || peran.some((p) => (p === 'superadmin' ? pengguna.superAdmin : p === pengguna.peran))

export function jawabGalat(e) {
  if (e instanceof GalatApi || Number.isInteger(e?.status)) {
    return Response.json({ galat: e.message }, { status: e.status })
  }
  console.error(e)
  const pesan =
    e?.name === 'PrismaClientInitializationError'
      ? 'Basis data tidak bisa dihubungi. Pastikan MySQL sudah berjalan.'
      : 'Server sedang bermasalah. Coba lagi sebentar lagi.'
  return Response.json({ galat: pesan }, { status: 500 })
}

/**
 * Kerangka setiap pintu API yang butuh sesi: membaca pemilik cookie, memeriksa perannya,
 * lalu menjalankan `kerja(pengguna, isi)`. `peran` null berarti semua peran boleh; ['admin']
 * juga meloloskan super admin; ['superadmin'] hanya super admin.
 */
export async function tangani(request, peran, kerja) {
  try {
    const pengguna = await penggunaDari(request)
    if (!pengguna) throw new GalatApi('Sesi berakhir. Silakan masuk lagi.', 401)
    if (!bolehPeran(pengguna, peran)) {
      throw new GalatApi('Akun ini tidak berwenang melakukan tindakan tersebut.', 403)
    }
    await siapkanKurikulum()
    const isi = request.method === 'GET' ? {} : await request.json().catch(() => ({}))
    return Response.json((await kerja(pengguna, isi)) ?? { ok: true })
  } catch (e) {
    return jawabGalat(e)
  }
}
