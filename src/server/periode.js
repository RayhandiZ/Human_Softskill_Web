import { db } from './db.js'
import { GalatApi } from './api.js'
import { catatLog } from './log.js'
import {
  KUNCI_PERIODE,
  PERIODE_AKTIF,
  labelPeriode,
  pasangPeriode,
  periodeSah,
  periodeSetelah,
  samaPeriode,
} from '../lib/data.js'

// Super admin memindahkan periode akademik yang sedang berjalan (Konfigurasi PERIODE_AKTIF). Semester mahasiswa,
// "sudah lewat Semester 3", dan boleh-tidaknya angkatan dikunci semuanya dihitung dari periode ini, jadi hanya
// super admin yang boleh, wajib beralasan, dan tercatat. Membacanya ada di src/server/kurikulum.js
// (ambilPeriode, siapkanPeriode). Lihat README.md › Periode akademik.

const ALASAN_MIN = 10

/** Periode yang boleh dituju dari `p`: satu semester maju atau mundur. */
const periodeTetangga = (p) => [periodeSetelah(p, 1), periodeSetelah(p, -1)]

export async function ubahPeriode(pengguna, { tahun, semester, alasan }) {
  const baru = periodeSah({ tahun, semester })
  if (!baru) throw new GalatApi('Periode tidak valid. Contoh: tahun "2026/2027", semester "Genap".')
  const teksAlasan = String(alasan ?? '').trim()
  if (teksAlasan.length < ALASAN_MIN) throw new GalatApi('Alasan wajib diisi, minimal 10 karakter.')

  const lama = { ...PERIODE_AKTIF } // sudah dibaca ulang dari basis data oleh tangani()
  if (samaPeriode(baru, lama)) return { periode: lama }
  // Satu langkah saja: salah ketik tidak bisa melompat jauh, dan mundur satu tetap bisa untuk membatalkan.
  if (!periodeTetangga(lama).some((p) => samaPeriode(p, baru))) {
    throw new GalatApi('Periode hanya bisa dipindah satu semester maju atau mundur dari ' + labelPeriode(lama) + '.')
  }

  // Perubahan dan catatan lognya dalam satu transaksi: berhasil bersama atau gagal bersama.
  await db.$transaction(async (tx) => {
    await tx.konfigurasi.upsert({
      where: { kunci: KUNCI_PERIODE },
      update: { nilai: baru },
      create: { kunci: KUNCI_PERIODE, nilai: baru },
    })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'UBAH_PERIODE',
      target: 'periode ' + labelPeriode(baru),
      rincian: { sebelum: lama, sesudah: baru, alasan: teksAlasan },
    })
  })
  pasangPeriode(baru)
  return { periode: baru }
}
