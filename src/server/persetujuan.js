import { db } from './db.js'
import { GalatApi, penggunaDariId } from './api.js'
import { catatLog } from './log.js'
import { SERTA_MAHASISWA, angkaId, selesaiProgram, susunMahasiswa, waktuWib } from './muat.js'
import { ALASAN_MIN, petaMahasiswa, rollbackBatch, setPenguncian, simpanBatch } from './nilai.js'
import { putuskanUsulan } from './pengajuan.js'
import { kunci, pratinjau } from './angkatan.js'
import { simpanBobot } from './bobot.js'
import { rencanakanPenilaian, simpanPenilaian } from './penilaian.js'
import { kelolaAspek, rencanakanAspek } from './aspek.js'
import { validasiBatchImport } from '../lib/rules.js'
import { KURIKULUM_TERPASANG, getAspek } from '../lib/curriculum.js'
import { bedaBobot, dampakBobot, periksaBobot, susunanBobot } from '../lib/bobot.js'

// Super admin adalah wewenang tertinggi. Mahasiswa yang programnya sudah lewat Semester 3 diurus Kemahasiswaan
// (dosen tidak lagi menanganinya), dan admin biasa yang ingin mengubah datanya harus meminta persetujuan super
// admin. Polanya sama dengan usulan nilai dosen yang disetujui admin, satu tingkat ke atas:
//   admin mengirim         → tersimpan sebagai PermintaanAdmin MENUNGGU; datanya BELUM berubah
//   super admin menyetujui → tindakan aslinya dijalankan dengan isi yang sama, atas nama admin pengaju
//   super admin menolak, atau admin menarik permintaannya → tidak ada yang berubah
// Gerbangnya dipasang di pintu API (denganPersetujuan), jadi tidak bisa dilewati dengan memanggil API langsung.
// Super admin sendiri tidak pernah tertahan. Tindakan yang tidak menyentuh mahasiswa tersebut berjalan seperti biasa.

const BATAS_BARIS = 20
const BATAS_MAHASISWA = 50

const sebut = (m) => ({ nim: m.nim, nama: m.nama, angkatan: m.angkatan.label })
const kodeAspek = (id) => (getAspek(id)?.kode ?? id).replace(/\.$/, '')
const tanda = (s) => (s === 'FINAL' ? 'final' : s === 'SEMENTARA' ? 'sementara' : 'otomatis')

/** Mahasiswa (dari daftar NIM) yang programnya sudah lewat Semester 3. */
async function selesaiDariNim(nims) {
  const mhs = await db.mahasiswa.findMany({
    where: { nim: { in: [...new Set(nims.map((n) => String(n ?? '').trim()))] } },
    include: { angkatan: true },
  })
  return mhs.filter((m) => selesaiProgram(m.angkatan))
}

/* ------------------------- tindakan yang bisa digerbang ------------------------- */

// Setiap tindakan: `kerja` = fungsi aslinya; `telaah(isi)` = null bila tidak menyentuh mahasiswa yang programnya
// sudah selesai (berjalan biasa), atau { mahasiswa, ringkasan } untuk dibaca super admin. `telaah` juga menolak
// isi yang pasti gagal, supaya super admin tidak menerima permintaan yang tidak bisa dijalankan.
// `alasan(isi)` = isian alasan dari layar; `bilaTidakOk` = arti jawaban { ok: false } dari `kerja`.
const AKSI = {
  SIMPAN_NILAI: {
    kerja: simpanBatch,
    alasan: (isi) => isi.alasan,
    async telaah({ sumber, semester, cara, entri }) {
      const daftar = Array.isArray(entri) ? entri : []
      const selesai = await selesaiDariNim(daftar.map((e) => e.nim))
      if (!selesai.length) return null
      const peta = await petaMahasiswa(daftar.map((e) => e.nim))
      const periksa = validasiBatchImport(
        daftar.map((e) => ({ nim: e.nim, komponen: e.komponenId, nilai: e.nilai })),
        { cariMahasiswa: (nim) => peta.get(nim) ?? null, sumber, semester: Number(semester) },
      )
      if (periksa.ditolak.length) {
        const x = periksa.ditolak[0]
        throw new GalatApi('Baris ' + (x.nim || '(tanpa NIM)') + ' ditolak: ' + x.alasan.join('; '))
      }
      const lama = await db.nilai.findMany({
        where: { OR: periksa.diterima.map((x) => ({ mahasiswaId: peta.get(x.nim).id, komponenId: x.komponenId })) },
      })
      const nilaiLama = new Map(lama.map((n) => [n.mahasiswaId + '|' + n.komponenId, n.nilai]))
      return {
        mahasiswa: selesai.map(sebut),
        ringkasan: {
          judul: 'Simpan ' + periksa.diterima.length + ' nilai ' + sumber + ' Semester ' + semester + ' (' + (cara ?? 'manual') + ')',
          baris: periksa.diterima.slice(0, BATAS_BARIS).map((x) => {
            const m = peta.get(x.nim)
            const sebelum = nilaiLama.get(m.id + '|' + x.komponenId)
            return x.nim + ' ' + m.name + ' · ' + x.komponenId + ': ' + (sebelum ?? '–') + ' → ' + x.nilai
          }),
        },
      }
    },
  },

  ROLLBACK_NILAI: {
    kerja: rollbackBatch,
    alasan: (isi) => isi.alasan,
    bilaTidakOk: 'Batch ini sudah dibatalkan sebelumnya.',
    async telaah({ id }) {
      const batch = await db.batch.findUnique({ where: { id: String(id ?? '') } })
      if (!batch || batch.status !== 'DIPROSES') return null // rollbackBatch yang menjawabnya
      const sel = await db.auditLog.findMany({ where: { batchId: batch.id }, select: { mahasiswaId: true } })
      const mhs = await db.mahasiswa.findMany({
        where: { id: { in: [...new Set(sel.map((s) => s.mahasiswaId))] } },
        include: { angkatan: true },
      })
      const selesai = mhs.filter((m) => selesaiProgram(m.angkatan))
      if (!selesai.length) return null
      return {
        mahasiswa: selesai.map(sebut),
        ringkasan: {
          judul: 'Batalkan batch ' + batch.id,
          baris: [
            sel.length + ' nilai ' + batch.sumber + ' Semester ' + batch.semester + ', angkatan ' + batch.angkatanId +
              ', disimpan ' + waktuWib(batch.waktu),
          ],
        },
      }
    },
  },

  UBAH_PENGUNCIAN: {
    kerja: setPenguncian,
    alasan: (isi) => isi.alasan,
    async telaah({ daftar, status }) {
      const ke = status === 'final' ? 'FINAL' : status === 'sementara' ? 'SEMENTARA' : status == null ? null : undefined
      if (ke === undefined) return null // setPenguncian yang menolaknya
      const pasangan = (Array.isArray(daftar) ? daftar : []).filter((p) => p?.nim && p?.aspekId)
      const mhs = await db.mahasiswa.findMany({
        where: { nim: { in: [...new Set(pasangan.map((p) => String(p.nim)))] } },
        include: { angkatan: true, penguncian: true },
      })
      const dariNim = new Map(mhs.map((m) => [m.nim, m]))
      // Hanya tanda yang sungguh berubah yang dihitung: Input Nilai memanggil ini setelah setiap simpan.
      const berubah = []
      for (const p of pasangan) {
        const m = dariNim.get(String(p.nim))
        if (!m || !selesaiProgram(m.angkatan)) continue
        const dari = m.penguncian.find((x) => x.aspekId === p.aspekId)?.status ?? null
        if (dari !== ke) berubah.push({ m, aspekId: p.aspekId, dari })
      }
      if (!berubah.length) return null
      return {
        mahasiswa: [...new Map(berubah.map((b) => [b.m.nim, sebut(b.m)])).values()],
        ringkasan: {
          judul: 'Ubah tanda ' + berubah.length + ' aspek menjadi ' + tanda(ke),
          baris: berubah
            .slice(0, BATAS_BARIS)
            .map((b) => b.m.nim + ' ' + b.m.nama + ' · ' + kodeAspek(b.aspekId) + ': ' + tanda(b.dari) + ' → ' + tanda(ke)),
        },
      }
    },
  },

  PUTUSKAN_USULAN: {
    kerja: putuskanUsulan,
    alasan: (isi) => isi.catatan,
    bilaTidakOk: 'Usulan ini sudah diputuskan sebelumnya.',
    async telaah({ id, keputusan }) {
      if (keputusan !== 'disetujui') return null // menolak usulan tidak mengubah nilai
      const u = await db.usulan.findUnique({ where: { id: angkaId(id) }, include: { entri: true } })
      if (!u || u.status !== 'MENUNGGU') return null
      const selesai = await selesaiDariNim(u.entri.map((e) => e.nim))
      if (!selesai.length) return null
      const dosen = await db.dosen.findUnique({ where: { id: u.dosenId } })
      return {
        mahasiswa: selesai.map(sebut),
        ringkasan: {
          judul: 'Setujui usulan U-' + u.id + ' (' + u.entri.length + ' nilai) dari ' + (dosen?.nama ?? 'dosen'),
          baris: u.entri.slice(0, BATAS_BARIS).map((e) => e.nim + ' · ' + e.komponenId + ': ' + e.nilai),
        },
      }
    },
  },

  KUNCI_ANGKATAN: {
    kerja: kunci,
    alasan: (isi) => isi.alasan,
    bilaTidakOk: 'Angkatan ini sudah dikunci.',
    async telaah({ angkatanId, konfirmasi }) {
      const a = await db.angkatan.findUnique({ where: { id: String(angkatanId ?? '') } })
      if (!a || a.status === 'TERKUNCI' || !selesaiProgram(a)) return null // kunci() yang menjawabnya
      if (String(konfirmasi ?? '').trim() !== a.label) throw new GalatApi('Konfirmasi tidak cocok. Ketik persis: ' + a.label)
      const p = await pratinjau(null, { angkatanId: a.id })
      if (!p.bolehDikunci) throw new GalatApi(p.alasanTidakBoleh)
      const mhs = await db.mahasiswa.findMany({ where: { angkatanId: a.id }, include: { angkatan: true }, orderBy: { nim: 'asc' } })
      return {
        mahasiswa: mhs.map(sebut),
        ringkasan: {
          judul: 'Kunci angkatan ' + a.label,
          baris: [
            p.berhak + ' dari ' + p.total + ' mahasiswa berhak atas sertifikat',
            ...(p.tidakBerhak ? [p.tidakBerhak + ' belum berhak, ' + p.komponenKosong + ' di antaranya karena nilainya belum lengkap'] : []),
          ],
        },
      }
    },
  },

  UBAH_BOBOT: {
    kerja: simpanBobot,
    alasan: (isi) => isi.alasan,
    async telaah({ versi = null, pengaturan, aspek }) {
      const susunan = { pengaturan, aspek }
      const masalah = periksaBobot(susunan)
      if (masalah.length) throw new GalatApi(masalah.map((m) => m.pesan).join(' '))
      if ((versi == null ? null : Number(versi)) !== (KURIKULUM_TERPASANG.versi ?? null)) {
        throw new GalatApi('Kurikulum sudah diubah orang lain sejak halaman ini dibuka. Muat ulang halaman, lalu ulangi perubahan Anda.', 409)
      }
      const beda = bedaBobot(susunanBobot(), susunan)
      if (!beda.pengaturan.length && !beda.aspek.length) throw new GalatApi('Tidak ada perubahan bobot untuk disimpan.')
      const mhs = await db.mahasiswa.findMany({ include: SERTA_MAHASISWA, orderBy: { nim: 'asc' } })
      const dampak = dampakBobot(mhs.map((m) => susunMahasiswa(m)), susunan, mhs.length)
      const selesai = new Map(mhs.filter((m) => selesaiProgram(m.angkatan)).map((m) => [m.nim, m]))
      const kena = dampak.daftar.filter((x) => selesai.has(x.nim))
      if (!kena.length) return null
      const bagian = [
        ...(beda.aspek.length ? ['bobot ' + beda.aspek.map(kodeAspek).join(', ')] : []),
        ...(beda.pengaturan.length ? ['cara membagi bobot otomatis'] : []),
      ]
      return {
        mahasiswa: kena.map((x) => sebut(selesai.get(x.nim))),
        ringkasan: {
          judul: 'Ubah ' + bagian.join(' dan '),
          baris: [
            'Nilai ' + dampak.berubah + ' dari ' + dampak.total + ' mahasiswa berubah, ' + kena.length + ' di antaranya sudah lewat Semester 3',
            ...kena.slice(0, BATAS_BARIS).map((x) => x.nim + ' ' + x.nama + ': nilai akhir ' + (x.nilaiSebelum ?? '–') + ' → ' + (x.nilaiSesudah ?? '–')),
          ],
        },
      }
    },
  },
}

/* Mengubah penilaian satu aspek (teks aspek, komponen, bobot) dari Input Manual. Berbeda dengan tindakan di atas,
   admin biasa SELALU meminta persetujuan untuk ini, apa pun mahasiswanya (keputusan pengguna 13 Oktober). */
AKSI.UBAH_PENILAIAN = {
  kerja: simpanPenilaian,
  alasan: (isi) => isi.alasan,
  pesanAlasan:
    'Perubahan penilaian oleh admin perlu persetujuan Super Admin. Isi alasan minimal ' + ALASAN_MIN +
    ' karakter supaya Super Admin bisa menimbangnya.',
  async telaah(isi) {
    const r = await rencanakanPenilaian(isi)
    const kode = kodeAspek(r.aspekId)
    const dariId = new Map(r.lama.komponen.map((k) => [k.id, k]))
    const baris = [
      ...r.beda.aspek.map((b) => 'Aspek, ' + b + ': ' + (r.lama.aspek[b] ?? '–') + ' → ' + (r.baru.aspek[b] ?? '–')),
      ...r.baru.komponen.filter((k) => k.id == null).map((k) => '+ komponen baru: ' + k.label + ' (' + k.sumber + (k.jenis ? ', ' + k.jenis : '') + ')'),
      ...r.beda.diubah.map((id) => {
        const k = r.baru.komponen.find((x) => x.id === id)
        return '~ ' + id + ': ' + dariId.get(id).label + ' → ' + k.label + ' (' + k.sumber + (k.jenis ? ', ' + k.jenis : '') + ', ' + k.ranah + ', ' + k.status + ')'
      }),
      ...r.beda.diarsipkan.map((id) => '− ' + id + ' ' + dariId.get(id).label + ' → arsip'),
      ...r.beda.dipulihkan.map((id) => '↺ ' + id + ' ' + dariId.get(id).label + ' dipulihkan dari arsip'),
      ...(r.beda.bobot
        ? ['Bobot: ' + r.baru.komponen.filter((k) => k.aktif).map((k) => (k.id ?? 'baru') + ' ' + (k.bobot ?? 'otomatis')).join(', ')]
        : []),
      'Dampak: nilai ' + r.dampak.berubah + ' dari ' + r.dampak.total + ' mahasiswa berubah, ' + r.dampak.jadiBelumLengkap +
        ' menjadi belum lengkap, ' + r.dampak.tidakLagiLayak + ' tidak lagi berhak sertifikat',
    ]
    const bagian = [
      ...(r.beda.aspek.length ? ['teks aspek'] : []),
      ...(r.baru.komponen.some((k) => k.id == null) ? ['tambah komponen'] : []),
      ...(r.beda.diubah.length ? ['ubah komponen'] : []),
      ...(r.beda.diarsipkan.length ? ['hapus ke arsip'] : []),
      ...(r.beda.dipulihkan.length ? ['pulihkan'] : []),
      ...(r.beda.bobot ? ['bobot'] : []),
    ]
    return {
      mahasiswa: r.dampak.daftar.map((x) => ({ nim: x.nim, nama: x.nama, angkatan: x.angkatan })),
      jumlahMahasiswa: r.dampak.berubah,
      ringkasan: { judul: 'Ubah penilaian ' + kode + ': ' + (bagian.join(', ') || 'urutan komponen'), baris: baris.slice(0, BATAS_BARIS) },
    }
  },
}

const JUDUL_ASPEK = { tambah: 'Tambah aspek', ubah: 'Ubah struktur aspek', arsipkan: 'Arsipkan aspek', pulihkan: 'Pulihkan aspek' }
const NAMA_BIDANG = { kode: 'kode', cluster: 'cluster', semester: 'semester' }

// Mengelola aspek CPMK (src/server/aspek.js): oleh admin biasa SELALU digerbang, apa pun mahasiswanya, karena
// mengubah perhitungan semua angkatan yang belum terkunci.
AKSI.KELOLA_ASPEK = {
  kerja: kelolaAspek,
  alasan: (isi) => isi.alasan,
  pesanAlasan:
    'Mengelola aspek CPMK oleh admin perlu persetujuan Super Admin. Isi alasan minimal ' + ALASAN_MIN +
    ' karakter supaya Super Admin bisa menimbangnya.',
  async telaah(isiMentah) {
    const { isi, perubahan, sebelum, dampak } = await rencanakanAspek(isiMentah)
    const kode = isi.aksi === 'tambah' ? isi.kode : kodeAspek(perubahan.id)
    const nama = isi.aksi === 'tambah' ? isi.nama : sebelum.nama
    const baris =
      isi.aksi === 'tambah'
        ? [
            'Aspek baru ' + perubahan.id + ' (' + isi.kode + ' ' + isi.nama + '), cluster ' + isi.cluster + ', semester ' + isi.semester,
            ...isi.komponen.map((k) => '+ komponen: ' + k.label + ' (' + k.sumber + (k.jenis ? ', ' + k.jenis : '') + ')'),
          ]
        : isi.aksi === 'ubah'
          ? Object.entries(perubahan.timpa).map(([b, v]) => 'Ubah ' + NAMA_BIDANG[b] + ': ' + (sebelum[b] ?? '–') + ' → ' + v)
          : [isi.aksi === 'arsipkan' ? 'Aspek tidak tampil dan tidak dihitung lagi; nilainya tetap tersimpan.' : 'Aspek kembali tampil dan dihitung.']
    baris.push(
      'Dampak: nilai ' + dampak.berubah + ' dari ' + dampak.total + ' mahasiswa berubah, ' + dampak.jadiBelumLengkap +
        ' menjadi belum lengkap, ' + dampak.tidakLagiLayak + ' tidak lagi berhak sertifikat (angkatan terkunci tidak ikut)',
    )
    return {
      mahasiswa: dampak.daftar.map((x) => ({ nim: x.nim, nama: x.nama, angkatan: x.angkatan })),
      jumlahMahasiswa: dampak.berubah,
      ringkasan: { judul: JUDUL_ASPEK[isi.aksi] + ' ' + kode.replace(/\.$/, '') + ' ' + nama, baris: baris.slice(0, BATAS_BARIS) },
    }
  },
}

export const AKSI_PERSETUJUAN = Object.keys(AKSI)

/* ----------------------------------- gerbang ----------------------------------- */

/**
 * Membungkus pintu API admin: `tangani(request, ['admin'], denganPersetujuan('SIMPAN_NILAI'))`. Super admin,
 * dan tindakan yang tidak menyentuh mahasiswa yang programnya sudah selesai, langsung dijalankan.
 */
export function denganPersetujuan(aksi) {
  const def = AKSI[aksi]
  if (!def) throw new Error('Tindakan ' + aksi + ' tidak terdaftar di persetujuan.js')
  return async (pengguna, isi = {}) => {
    if (pengguna.superAdmin || pengguna.peran !== 'admin') return def.kerja(pengguna, isi)
    const telaah = await def.telaah(isi)
    if (!telaah) return def.kerja(pengguna, isi)
    return ajukan(pengguna, aksi, isi, telaah)
  }
}

async function ajukan(pengguna, aksi, isi, telaah) {
  const alasan = String(AKSI[aksi].alasan(isi) ?? '').trim()
  if (alasan.length < ALASAN_MIN) {
    throw new GalatApi(
      AKSI[aksi].pesanAlasan ??
        'Perubahan ini menyentuh ' + telaah.mahasiswa.length + ' mahasiswa yang programnya sudah lewat Semester 3, ' +
          'jadi perlu persetujuan Super Admin. Isi alasan minimal ' + ALASAN_MIN + ' karakter supaya Super Admin bisa menimbangnya.',
    )
  }
  const ringkasan = {
    ...telaah.ringkasan,
    jumlahMahasiswa: telaah.jumlahMahasiswa ?? telaah.mahasiswa.length,
    mahasiswa: telaah.mahasiswa.slice(0, BATAS_MAHASISWA),
  }
  const p = await db.$transaction(async (tx) => {
    const baru = await tx.permintaanAdmin.create({ data: { aksi, isi, ringkasan, alasan, diajukanOleh: pengguna.id } })
    await catatLog(tx, {
      aktorId: pengguna.id,
      aksi: 'AJUKAN_PERSETUJUAN',
      target: 'permintaan P-' + baru.id,
      rincian: { aksi, judul: ringkasan.judul, alasan, jumlahMahasiswa: ringkasan.jumlahMahasiswa },
    })
    return baru
  })
  return { menunggu: true, permintaan: { id: 'P-' + p.id, aksi, judul: ringkasan.judul } }
}

/* ---------------------------------- keputusan ---------------------------------- */

const ringkasHasil = (h) =>
  Object.fromEntries(
    Object.entries({ batchId: h?.id ?? null, jumlah: h?.jumlah ?? null, versi: h?.versi ?? null }).filter(([, v]) => v != null),
  )

/**
 * Super admin memutuskan satu permintaan. 'disetujui' menjalankan tindakan aslinya dengan isi yang tersimpan, atas
 * nama admin pengaju, dan memeriksa ulang semuanya (versi kurikulum, alasan data terkunci, validasi nilai). Bila
 * datanya sudah berubah sehingga tidak bisa dijalankan, statusnya GAGAL beserta pesannya; admin mengajukan ulang.
 */
export async function putuskanPermintaan(pengguna, { id, keputusan, catatan }) {
  if (!['disetujui', 'ditolak'].includes(keputusan)) throw new GalatApi('Keputusan harus "disetujui" atau "ditolak".')
  const teks = String(catatan ?? '').trim()
  if (keputusan === 'ditolak' && !teks) throw new GalatApi('Catatan penolakan wajib diisi. Admin perlu tahu alasannya.')

  const p = await db.permintaanAdmin.findUnique({ where: { id: angkaId(id) } })
  if (!p) throw new GalatApi('Permintaan tidak ditemukan.', 404)
  // Hanya yang masih menunggu yang berubah: dua jendela yang memutuskan bersamaan tidak saling timpa.
  const klaim = await db.permintaanAdmin.updateMany({
    where: { id: p.id, status: 'MENUNGGU' },
    data: {
      status: keputusan === 'ditolak' ? 'DITOLAK' : 'DISETUJUI',
      diputuskanOleh: pengguna.id,
      diputuskanPada: new Date(),
      catatanKeputusan: teks || null,
    },
  })
  if (klaim.count !== 1) return { ok: false }

  let galat = null
  let kurikulum // dibawa pulang bila yang dijalankan perubahan bobot, supaya layar langsung memakainya
  if (keputusan === 'disetujui') {
    try {
      const def = AKSI[p.aksi]
      if (!def) throw new GalatApi('Jenis permintaan tidak dikenal.')
      const pengaju = await penggunaDariId(p.diajukanOleh)
      if (!pengaju) throw new GalatApi('Akun admin pengaju sudah tidak aktif.')
      const hasil = await def.kerja(pengaju, p.isi)
      if (hasil?.ok === false) throw new GalatApi(def.bilaTidakOk ?? 'Datanya sudah berubah sejak permintaan diajukan.')
      kurikulum = hasil?.kurikulum
      await db.permintaanAdmin.update({ where: { id: p.id }, data: { hasil: ringkasHasil(hasil) } })
    } catch (e) {
      if (!(e instanceof GalatApi) && !Number.isInteger(e?.status)) console.error(e)
      galat = e instanceof GalatApi || Number.isInteger(e?.status) ? e.message : 'Server gagal menjalankan permintaan ini.'
      await db.permintaanAdmin.update({ where: { id: p.id }, data: { status: 'GAGAL', hasil: { galat } } })
    }
  }

  await catatLog(db, {
    aktorId: pengguna.id,
    aksi: 'PUTUSKAN_PERSETUJUAN',
    target: 'permintaan P-' + p.id,
    rincian: { aksi: p.aksi, keputusan: galat ? 'gagal' : keputusan, catatan: teks || null, galat, pengaju: p.diajukanOleh },
  })
  return { ok: !galat, status: galat ? 'gagal' : keputusan, galat, kurikulum }
}

/** Admin menarik permintaannya sendiri selama belum diputuskan. false bila sudah diputuskan atau bukan miliknya. */
export async function batalkanPermintaan(pengguna, { id }) {
  const p = await db.permintaanAdmin.updateMany({
    where: { id: angkaId(id), diajukanOleh: pengguna.id, status: 'MENUNGGU' },
    data: { status: 'DIBATALKAN', diputuskanOleh: pengguna.id, diputuskanPada: new Date() },
  })
  if (p.count !== 1) return { ok: false }
  await catatLog(db, { aktorId: pengguna.id, aksi: 'TARIK_PERMINTAAN', target: 'permintaan P-' + angkaId(id) })
  return { ok: true }
}
