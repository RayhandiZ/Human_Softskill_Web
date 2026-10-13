import { db } from './db.js'
import { KUNCI_VERSI_KURIKULUM, KURIKULUM_TERPASANG, isiKurikulum } from '../lib/curriculum.js'

// Kurikulum (komponen dan indikator) dan timpaan CONFIG dibaca dari basis data, dalam bentuk yang dipasang
// isiKurikulum() di src/lib/curriculum.js. Selama penanda VERSI_KURIKULUM belum ada (belum di-seed), isi dari
// kode yang dipakai. Lihat README.md › Kurikulum dari basis data.

const komponenKode = (k) => ({
  id: k.id,
  aspekId: k.aspekId,
  sumber: k.sumber,
  jenis: k.jenis,
  label: k.label,
  ranah: k.ranah,
  bobot: k.bobot,
  status: k.resmi ? 'resmi' : 'draft',
})

const indikatorKode = (x) => ({
  id: x.id,
  aspekId: x.aspekId,
  label: x.label,
  ranah: x.ranah,
  sumber: Array.isArray(x.sumber) ? x.sumber : [],
})

async function bacaVersi() {
  const baris = await db.konfigurasi.findUnique({ where: { kunci: KUNCI_VERSI_KURIKULUM } })
  return baris ? Number(baris.nilai) || 0 : null
}

/**
 * Versi kurikulum di basis data, dibaca sambil MENGUNCI barisnya di dalam transaksi `tx`: dua penyimpanan
 * kurikulum yang bersamaan tidak saling timpa. null bila belum di-seed.
 */
export async function kunciVersiKurikulum(tx) {
  const baris = await tx.$queryRaw`SELECT nilai FROM Konfigurasi WHERE kunci = ${KUNCI_VERSI_KURIKULUM} FOR UPDATE`
  return baris.length ? Number(baris[0].nilai) || 0 : null
}

/**
 * Kurikulum dan pengaturan dari basis data, atau null bila belum di-seed. `komponen` hanya yang aktif (yang dihitung);
 * `arsip` yang diarsipkan (bisa dipulihkan); `aspek` timpaan teks aspek dari tabel Aspek.
 */
export async function ambilKurikulum() {
  const versi = await bacaVersi()
  if (versi == null) return null
  const [komponen, indikator, pengaturan, aspek] = await Promise.all([
    db.komponen.findMany({ orderBy: [{ urutan: 'asc' }, { id: 'asc' }] }),
    db.indikator.findMany({ orderBy: [{ urutan: 'asc' }, { id: 'asc' }] }),
    db.konfigurasi.findMany({ where: { kunci: { not: KUNCI_VERSI_KURIKULUM } } }),
    // Prisma Client lama (server belum dinyalakan ulang sesudah migrasi aspek_dari_layar) belum punya db.aspek.
    db.aspek ? db.aspek.findMany() : [],
  ])
  return {
    versi,
    komponen: komponen.filter((k) => k.aktif).map(komponenKode),
    arsip: komponen.filter((k) => !k.aktif).map(komponenKode),
    aspek: Object.fromEntries(
      aspek.map((a) => [a.id, { nama: a.nama, deskripsi: a.deskripsi, pdp: a.pdp, mk: a.mk, engagement: a.engagement }]),
    ),
    indikator: indikator.map(indikatorKode),
    konfigurasi: Object.fromEntries(pengaturan.map((p) => [p.kunci, p.nilai])),
  }
}

/**
 * Dipanggil setiap pintu API sebelum bekerja: kurikulum di proses ini dibaca ulang hanya bila versinya berubah.
 * Versi yang terpasang dibaca dari KURIKULUM_TERPASANG, satu-satunya catatannya: kurikulum yang dipasang dari
 * jalan lain (data master halaman, skrip uji) ikut terdeteksi, jadi versi yang dikirim layar selalu sebanding.
 * Basis data yang gagal dibaca tidak menghentikan pintu; isi yang terakhir terpasang tetap dipakai.
 */
export async function siapkanKurikulum() {
  try {
    if ((await bacaVersi()) === KURIKULUM_TERPASANG.versi) return
    isiKurikulum((await ambilKurikulum()) ?? {})
  } catch (e) {
    console.warn('Kurikulum tidak bisa dibaca dari basis data; isi yang terpasang tetap dipakai:', e.message)
  }
}
