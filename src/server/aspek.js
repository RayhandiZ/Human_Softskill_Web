import { db } from './db.js'
import { GalatApi } from './api.js'
import { ambilKurikulum, kunciVersiKurikulum, siapkanKurikulum } from './kurikulum.js'
import { catatLog } from './log.js'
import { SERTA_MAHASISWA, susunMahasiswa } from './muat.js'
import { idBaru } from './penilaian.js'
import { BIDANG_ASPEK, KUNCI_VERSI_KURIKULUM, KURIKULUM_TERPASANG, getAspek } from '../lib/curriculum.js'
import { dampakAspek, periksaAspek, rapikanIsiAspek, susunPerubahan } from '../lib/aspek.js'

// Mengelola aspek CPMK itu sendiri (src/lib/aspek.js): tambah aspek baru beserta komponen pertamanya, ubah kode
// tampilan/cluster/semester, arsipkan, dan pulihkan. Super admin menyimpan langsung; admin biasa SELALU mengajukan
// lewat src/server/persetujuan.js (aksi KELOLA_ASPEK). Aturannya:
// - ID aspek tidak pernah diganti dan tidak dipakai ulang; aspek baru diberi huruf area + nomor berikutnya ('C3');
// - "hapus" = arsip (Aspek.aktif false): komponen dan nilainya tidak disentuh, dan bisa dipulihkan;
// - angkatan terkunci memakai susunan aspek saat ia dikunci (Angkatan.aspekSaatKunci), jadi aspek baru dan arsip
//   tidak mengubah transkripnya; perubahan kode, cluster, dan semester berlaku untuk semua angkatan;
// - alasan selalu wajib; semua ditulis dalam satu transaksi bersama versi kurikulum baru dan catatan lognya.

const TRANSAKSI = { timeout: 30000, maxWait: 10000 }
const AKSI_LOG = { tambah: 'TAMBAH_ASPEK', ubah: 'UBAH_ASPEK', arsipkan: 'ARSIPKAN_ASPEK', pulihkan: 'PULIHKAN_ASPEK' }
const STRUKTUR = (a) => (a ? { kode: a.kode, cluster: a.cluster, semester: a.semester, aktif: a.aktif } : null)

const ringkasDampak = (d) => ({
  total: d.total,
  berubah: d.berubah,
  naik: d.naik,
  turun: d.turun,
  jadiLayak: d.jadiLayak,
  tidakLagiLayak: d.tidakLagiLayak,
  jadiBelumLengkap: d.jadiBelumLengkap,
  terkunci: d.terkunci,
})

function cekVersi(versi) {
  if (KURIKULUM_TERPASANG.versi == null) throw new GalatApi('Kurikulum belum tersimpan di basis data. Jalankan npm run db:seed lebih dulu.')
  if ((versi == null ? null : Number(versi)) !== KURIKULUM_TERPASANG.versi) {
    throw new GalatApi('Kurikulum sudah diubah orang lain sejak halaman ini dibuka. Muat ulang halaman, lalu ulangi perubahan Anda.', 409)
  }
}

/**
 * Memeriksa permintaan dan menghitung dampaknya tanpa menulis apa pun. Dipakai kelolaAspek dan gerbang persetujuan
 * (supaya super admin tidak menerima permintaan yang pasti gagal).
 */
export async function rencanakanAspek(isiMentah = {}) {
  cekVersi(isiMentah.versi)
  const isi = rapikanIsiAspek(isiMentah)
  const masalah = periksaAspek(isi)
  if (masalah.length) throw new GalatApi(masalah.map((m) => m.pesan).join(' '))
  const perubahan = susunPerubahan(isi)
  const mhs = await db.mahasiswa.findMany({ include: SERTA_MAHASISWA, orderBy: { nim: 'asc' } })
  const dampak = dampakAspek(
    mhs.map((m) => susunMahasiswa(m)),
    perubahan,
  )
  return { isi, perubahan, sebelum: getAspek(perubahan.id), dampak }
}

/**
 * Menjalankan satu aksi aspek. `versi` = versi kurikulum saat halaman dibuka. Mengembalikan kurikulum yang baru
 * supaya layar langsung memakainya.
 */
export async function kelolaAspek(pengguna, isiMentah = {}) {
  const r = await rencanakanAspek(isiMentah)
  const { isi, perubahan, sebelum } = r
  const id = perubahan.id
  const dampak = ringkasDampak(r.dampak)

  const tersimpan = await db.$transaction(async (tx) => {
    const sekarang = await kunciVersiKurikulum(tx)
    if (sekarang !== Number(isiMentah.versi)) {
      throw new GalatApi('Kurikulum sudah diubah orang lain sejak halaman ini dibuka. Muat ulang halaman, lalu ulangi perubahan Anda.', 409)
    }
    const oleh = { diubahOleh: pengguna.id, diubahPada: new Date() }
    const ditambah = []

    if (isi.aksi === 'tambah') {
      // ID dibentuk dari kurikulum yang terpasang; diperiksa lagi di sini supaya dua penambahan bersamaan tidak bentrok.
      if ((await tx.aspek.findUnique({ where: { id } })) || (await tx.komponen.findFirst({ where: { aspekId: id } }))) {
        throw new GalatApi('ID aspek ' + id + ' sudah dipakai. Muat ulang halaman, lalu ulangi.', 409)
      }
      await tx.aspek.create({
        data: {
          id,
          ...Object.fromEntries(BIDANG_ASPEK.map((b) => [b, isi[b] ?? null])),
          kode: isi.kode,
          cluster: isi.cluster,
          semester: isi.semester,
          aktif: true,
          ...oleh,
        },
      })
      const terpakai = new Set((await tx.komponen.findMany({ select: { id: true } })).map((k) => k.id))
      const awal = ((await tx.komponen.aggregate({ _max: { urutan: true } }))._max.urutan ?? 0) + 1
      for (const [i, k] of isi.komponen.entries()) {
        const idKomponen = idBaru(id, k.sumber, terpakai)
        terpakai.add(idKomponen)
        await tx.komponen.create({
          data: {
            id: idKomponen,
            aspekId: id,
            label: k.label,
            sumber: k.sumber,
            jenis: k.jenis,
            ranah: k.ranah,
            resmi: k.status === 'resmi',
            aktif: true,
            urutan: awal + i,
            ...oleh,
          },
        })
        ditambah.push({ id: idKomponen, label: k.label, sumber: k.sumber })
      }
    } else {
      // Aspek bawaan belum tentu punya baris; teksnya yang sekarang ikut ditulis karena kolom teks wajib di tabel.
      const data = isi.aksi === 'ubah' ? perubahan.timpa : { aktif: isi.aksi === 'pulihkan' }
      await tx.aspek.upsert({
        where: { id },
        update: { ...data, ...oleh },
        create: {
          id,
          ...Object.fromEntries(BIDANG_ASPEK.map((b) => [b, sebelum[b] ?? null])),
          ...data,
          ...oleh,
        },
      })
    }

    const v = sekarang + 1
    await tx.konfigurasi.upsert({
      where: { kunci: KUNCI_VERSI_KURIKULUM },
      update: { nilai: v },
      create: { kunci: KUNCI_VERSI_KURIKULUM, nilai: v },
    })
    const sesudah =
      isi.aksi === 'tambah'
        ? { kode: isi.kode, cluster: isi.cluster, semester: isi.semester, aktif: true }
        : { ...STRUKTUR(sebelum), ...perubahan.timpa }
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: AKSI_LOG[isi.aksi],
      target: 'aspek ' + id + ' (kurikulum versi ' + v + ')',
      rincian: {
        alasan: isi.alasan,
        aspekId: id,
        kode: sesudah.kode,
        nama: isi.aksi === 'tambah' ? isi.nama : sebelum.nama,
        sebelum: STRUKTUR(sebelum),
        sesudah,
        ditambah,
        dampak: { ...dampak, angkatanTerkunci: r.dampak.angkatanTerkunci },
      },
    })
    return { versi: v, ditambah }
  }, TRANSAKSI)

  await siapkanKurikulum()
  return {
    ok: true,
    versi: tersimpan.versi,
    aspek: { id, kode: getAspek(id)?.kode ?? null },
    ditambah: tersimpan.ditambah,
    dampak,
    kurikulum: await ambilKurikulum(),
  }
}
