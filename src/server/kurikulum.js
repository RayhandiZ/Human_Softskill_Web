import { db } from './db.js'
import { KUNCI_VERSI_KURIKULUM, isiKurikulum } from '../lib/curriculum.js'

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

/** Kurikulum dan pengaturan dari basis data, atau null bila belum di-seed. Komponen yang diarsipkan tidak ikut. */
export async function ambilKurikulum() {
  const versi = await bacaVersi()
  if (versi == null) return null
  const [komponen, indikator, pengaturan] = await Promise.all([
    db.komponen.findMany({ where: { aktif: true }, orderBy: [{ urutan: 'asc' }, { id: 'asc' }] }),
    db.indikator.findMany({ orderBy: [{ urutan: 'asc' }, { id: 'asc' }] }),
    db.konfigurasi.findMany({ where: { kunci: { not: KUNCI_VERSI_KURIKULUM } } }),
  ])
  return {
    versi,
    komponen: komponen.map(komponenKode),
    indikator: indikator.map(indikatorKode),
    konfigurasi: Object.fromEntries(pengaturan.map((p) => [p.kunci, p.nilai])),
  }
}

let versiTerpasang = null

/**
 * Dipanggil setiap pintu API sebelum bekerja: kurikulum di proses ini dibaca ulang hanya bila versinya berubah.
 * Basis data yang gagal dibaca tidak menghentikan pintu; isi yang terakhir terpasang tetap dipakai.
 */
export async function siapkanKurikulum() {
  try {
    if ((await bacaVersi()) === versiTerpasang) return
    const data = await ambilKurikulum()
    isiKurikulum(data ?? {})
    versiTerpasang = data?.versi ?? null
  } catch (e) {
    console.warn('Kurikulum tidak bisa dibaca dari basis data; isi yang terpasang tetap dipakai:', e.message)
  }
}
