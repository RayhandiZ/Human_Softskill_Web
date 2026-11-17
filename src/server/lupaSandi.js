import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from './db.js'
import { GalatApi } from './api.js'
import { catatLog } from './log.js'
import { bolehCetakKonsol, kirimEmail, smtpSiap } from './email.js'

/* Lupa kata sandi lewat email untuk mahasiswa dan dosen (permintaan pemilik produk, 16 Nov 2026), selama VIBE belum memakai
   SSO kampus. Alurnya:
   1. mintaTautan: email akun MAHASISWA atau DOSEN yang aktif menerima tautan /atur-sandi?token=... yang berlaku 30 menit.
      Jawabannya selalu sama, terdaftar atau tidak, supaya halaman ini tidak bisa dipakai menebak email siapa yang punya
      akun. Akun admin dan Super Admin tidak dikirimi (mereka meminta Super Admin).
   2. aturSandi: token yang sah dan belum dipakai mengganti passwordHash, lalu semua tautan akun itu mati.
   Yang disimpan hanya hash SHA-256 token (tabel ResetSandi), jadi isi basis data saja tidak cukup untuk memakai tautannya.
   Batas: satu tautan per menit dan lima per jam per akun. Lihat README.md › Lupa kata sandi. */

const MENIT_BERLAKU = 30
const JEDA_MS = 60 * 1000
const BATAS_PER_JAM = 5
const PERAN_BOLEH = ['MAHASISWA', 'DOSEN']
export const SANDI_MIN = 8
// bcrypt hanya membaca 72 byte pertama; sandi yang lebih panjang ditolak, bukan dipotong diam-diam.
const SANDI_MAKS_BYTE = 72

const TAUTAN_MATI = 'Tautan ini sudah tidak berlaku. Minta tautan baru.'

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

/** Alamat dasar tautan di email. Di produksi wajib APP_URL: Host dari permintaan bisa dipalsukan pengirimnya. */
function alamatAplikasi(request) {
  const tetap = process.env.APP_URL?.trim().replace(/\/+$/, '')
  if (tetap) return tetap
  if (process.env.NODE_ENV !== 'production' && request) return new URL(request.url).origin
  return null
}

/** Permintaan tautan. Selalu selesai tanpa galat untuk email yang formatnya benar, terdaftar atau tidak. */
export async function mintaTautan({ email, bahasa } = {}, request) {
  const alamat = String(email ?? '').trim().toLowerCase()
  if (!alamat) throw new GalatApi('Email wajib diisi.', 400)
  if (alamat.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alamat)) throw new GalatApi('Format email tidak valid.', 400)

  // Diperiksa sebelum mencari akun, supaya jawabannya sama untuk semua email.
  const asal = alamatAplikasi(request)
  if (!asal || (!smtpSiap() && !bolehCetakKonsol())) {
    console.error('Lupa kata sandi: ' + (!asal ? 'APP_URL' : 'SMTP_HOST') + ' belum diatur di .env.')
    throw new GalatApi('Pengiriman email belum disiapkan. Hubungi Biro Kemahasiswaan.', 503)
  }

  const akun = await db.pengguna.findUnique({
    where: { email: alamat },
    select: { id: true, email: true, peran: true, aktif: true, mahasiswa: { select: { nama: true } }, dosen: { select: { nama: true } } },
  })
  if (!akun || !akun.aktif || !PERAN_BOLEH.includes(akun.peran)) return

  const sekarang = new Date()
  const terbaru = await db.resetSandi.findMany({
    where: { penggunaId: akun.id, dibuat: { gte: new Date(sekarang.getTime() - 60 * 60 * 1000) } },
    orderBy: { dibuat: 'desc' },
    select: { dibuat: true },
  })
  if (terbaru.length >= BATAS_PER_JAM) return
  if (terbaru[0] && sekarang.getTime() - terbaru[0].dibuat.getTime() < JEDA_MS) return

  const token = crypto.randomBytes(32).toString('base64url')
  await db.resetSandi.create({
    data: { penggunaId: akun.id, tokenHash: hashToken(token), kedaluwarsa: new Date(sekarang.getTime() + MENIT_BERLAKU * 60 * 1000) },
  })

  const isi = isiEmail({
    nama: akun.mahasiswa?.nama ?? akun.dosen?.nama ?? '',
    email: akun.email,
    tautan: asal + '/atur-sandi?token=' + token,
    inggris: bahasa === 'en',
  })
  // Tidak ditunggu: lama pengiriman SMTP tidak boleh membedakan jawaban untuk email terdaftar dan tidak terdaftar.
  kirimEmail({ ke: akun.email, ...isi }).catch((e) => console.error('Lupa kata sandi: email ke ' + akun.email + ' gagal dikirim.', e))
}

/** Token dari tautan: periksa saja (tanpa `sandi`), atau ganti kata sandinya. */
export async function aturSandi({ token, sandi } = {}) {
  const t = typeof token === 'string' ? token.trim() : ''
  const baris = t.length >= 20 && t.length <= 200
    ? await db.resetSandi.findUnique({
        where: { tokenHash: hashToken(t) },
        include: { pengguna: { select: { id: true, email: true, peran: true, aktif: true } } },
      })
    : null
  const sah = (b) => b && !b.dipakai && b.kedaluwarsa > new Date() && b.pengguna.aktif && PERAN_BOLEH.includes(b.pengguna.peran)
  if (!sah(baris)) throw new GalatApi(TAUTAN_MATI, 400)

  if (sandi === undefined) return { email: baris.pengguna.email }

  if (typeof sandi !== 'string' || sandi.length < SANDI_MIN) throw new GalatApi('Kata sandi baru minimal 8 karakter.', 400)
  if (Buffer.byteLength(sandi, 'utf8') > SANDI_MAKS_BYTE) throw new GalatApi('Kata sandi baru terlalu panjang (paling banyak 72 karakter).', 400)

  const passwordHash = await bcrypt.hash(sandi, 10)
  await db.$transaction(async (tx) => {
    // Diklaim di dalam transaksi: dari dua permintaan bersamaan dengan token yang sama, hanya satu yang lolos.
    const sekarang = new Date()
    const klaim = await tx.resetSandi.updateMany({
      where: { id: baris.id, dipakai: null, kedaluwarsa: { gt: sekarang } },
      data: { dipakai: sekarang },
    })
    if (klaim.count !== 1) throw new GalatApi(TAUTAN_MATI, 400)
    await tx.pengguna.update({ where: { id: baris.pengguna.id }, data: { passwordHash } })
    await tx.resetSandi.updateMany({ where: { penggunaId: baris.pengguna.id, dipakai: null }, data: { dipakai: sekarang } })
    await catatLog(tx, { aktorId: baris.pengguna.id, aksi: 'ATUR_ULANG_SANDI', target: 'akun ' + baris.pengguna.email })
  })
  return { ok: true }
}

const amankan = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Subjek, teks polos, dan HTML email tautan atur ulang, dalam bahasa yang dipilih di halaman. */
export function isiEmail({ nama, email, tautan, inggris = false }) {
  const k = inggris
    ? {
        subjek: 'Reset your VIBE password',
        sapa: nama ? `Hello ${nama},` : 'Hello,',
        buka: `We received a request to reset the password for your VIBE account (${email}).`,
        tombol: 'Set a new password',
        berlaku: `This link works once and expires in ${MENIT_BERLAKU} minutes.`,
        abai: 'If you did not ask for this, ignore this email. Your password stays the same.',
      }
    : {
        subjek: 'Atur ulang kata sandi VIBE',
        sapa: nama ? `Halo ${nama},` : 'Halo,',
        buka: `Kami menerima permintaan untuk mengatur ulang kata sandi akun VIBE Anda (${email}).`,
        tombol: 'Buat kata sandi baru',
        berlaku: `Tautan ini hanya bisa dipakai sekali dan berlaku ${MENIT_BERLAKU} menit.`,
        abai: 'Kalau Anda tidak memintanya, abaikan email ini. Kata sandi Anda tidak berubah.',
      }
  const teks = [k.sapa, '', k.buka, '', k.tombol + ':', tautan, '', k.berlaku, k.abai, '', 'VIBE, Universitas Multimedia Nusantara'].join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;color:#14162f">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f766e">VIBE</p>
<div style="background:#ffffff;border:1px solid #e5e6f1;border-radius:16px;padding:28px">
<p style="margin:0 0 12px;font-size:15px">${amankan(k.sapa)}</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.55">${amankan(k.buka)}</p>
<p style="margin:0 0 22px"><a href="${amankan(tautan)}" style="display:inline-block;background:#12508f;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:12px">${amankan(k.tombol)}</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#545879">${amankan(k.berlaku)}</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:#545879">${amankan(k.abai)}</p>
</div>
<p style="margin:18px 0 0;font-size:12px;color:#545879;word-break:break-all">${amankan(tautan)}</p>
<p style="margin:8px 0 0;font-size:12px;color:#545879">VIBE, Universitas Multimedia Nusantara</p>
</div></body></html>`
  return { subjek: k.subjek, teks, html }
}
