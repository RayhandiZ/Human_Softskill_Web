/* Pengirim email lewat SMTP (nodemailer). Dipakai tautan lupa kata sandi (src/server/lupaSandi.js). Pengaturannya di .env,
   tidak pernah di kode, karena repo ini publik:
     SMTP_HOST, SMTP_PORT (bawaan 587; 465 memakai TLS langsung), SMTP_USER, SMTP_PASS, EMAIL_PENGIRIM (misalnya
     "VIBE UMN <no-reply@umn.ac.id>"; bawaan SMTP_USER).
   Selama SMTP_HOST kosong di `next dev`, email tidak dikirim tetapi dicetak di konsol server, jadi alurnya tetap bisa
   dicoba tanpa akun SMTP. Di produksi tanpa SMTP_HOST pengiriman ditolak (smtpSiap() bernilai false). */

let pengangkut = null

/** Apakah email benar-benar bisa dikirim (SMTP diatur), atau cukup dicetak di konsol (`next dev` tanpa SMTP). */
export const smtpSiap = () => Boolean(process.env.SMTP_HOST)
export const bolehCetakKonsol = () => !smtpSiap() && process.env.NODE_ENV !== 'production'

async function angkut() {
  if (!pengangkut) {
    // Dimuat saat dipakai saja dan tidak dibundel: impor statis membuat `next dev` (Turbopack) menolak SELURUH aplikasi
    // dengan 500 bila paketnya belum terpasang (terjadi 16 Nov 2026, saat registri npm tidak bisa diunduh). Mode konsol di
    // atas tidak membutuhkan paket ini.
    const { default: nodemailer } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'nodemailer')
    const port = Number(process.env.SMTP_PORT) || 587
    pengangkut = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
    })
  }
  return pengangkut
}

/** Kirim satu email. `teks` wajib (versi polos); `html` opsional. */
export async function kirimEmail({ ke, subjek, teks, html }) {
  if (bolehCetakKonsol()) {
    console.info(`\n[email belum dikirim: SMTP_HOST kosong, hanya next dev]\nKepada: ${ke}\nSubjek: ${subjek}\n\n${teks}\n`)
    return
  }
  if (!smtpSiap()) throw new Error('SMTP_HOST belum diatur di .env.')
  await (await angkut()).sendMail({ from: process.env.EMAIL_PENGIRIM || process.env.SMTP_USER, to: ke, subject: subjek, text: teks, html })
}
