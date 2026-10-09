import { INDIKATOR_BAWAAN, KOMPONEN_BAWAAN, KUNCI_VERSI_KURIKULUM } from '../src/lib/curriculum.js'

/* --------------------------------------------------------------------------
   Menanam kurikulum bawaan dari curriculum.js (komponen dan indikator) lalu
   memasang penanda VERSI_KURIKULUM. Sejak penanda itu ada, basis datalah
   sumber kurikulum, jadi seed.js tidak memanggil ini lagi. Komponen yang
   sudah ada diperbarui supaya kolom barunya (ranah, urutan) ikut terisi.
   Dipakai seed.js dan seed-contoh.js.
   -------------------------------------------------------------------------- */

export async function tanamKurikulum(db) {
  await db.$transaction(
    async (tx) => {
      for (const [i, k] of KOMPONEN_BAWAAN.entries()) {
        const isi = {
          aspekId: k.aspekId,
          sumber: k.sumber,
          label: k.label,
          jenis: k.jenis,
          ranah: k.ranah,
          resmi: k.status === 'resmi',
          bobot: k.bobot,
          urutan: i,
          aktif: true,
        }
        await tx.komponen.upsert({ where: { id: k.id }, update: isi, create: { id: k.id, ...isi } })
      }
      for (const [i, x] of INDIKATOR_BAWAAN.entries()) {
        const isi = { aspekId: x.aspekId, label: x.label, ranah: x.ranah, sumber: x.sumber, urutan: i }
        await tx.indikator.upsert({ where: { id: x.id }, update: isi, create: { id: x.id, ...isi } })
      }
      await tx.konfigurasi.upsert({
        where: { kunci: KUNCI_VERSI_KURIKULUM },
        update: { nilai: 1 },
        create: { kunci: KUNCI_VERSI_KURIKULUM, nilai: 1 },
      })
    },
    { timeout: 30000, maxWait: 10000 },
  )
}
