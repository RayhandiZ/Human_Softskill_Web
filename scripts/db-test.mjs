/* Uji sambungan basis data: setiap pintu API dijalankan sungguhan terhadap MySQL.

   Membuat satu akun mahasiswa sementara (NIM berawalan UJI) dan menghapus seluruh jejaknya di
   akhir, berhasil maupun gagal. Butuh MySQL menyala dan `npm run db:seed` sudah pernah dijalankan
   (memakai akun admin@umn.ac.id dan simon.petrus@lecturer.umn.ac.id dengan sandi umn12345).
   Bagian kurikulum menambah satu indikator dan menimpa dua pengaturan sebentar, lalu mengembalikannya;
   penanda VERSI_KURIKULUM ikut naik dan tidak diturunkan lagi. */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from '../src/server/db.js'
import * as masuk from '../app/api/masuk/route.js'
import * as keluar from '../app/api/keluar/route.js'
import * as sesi from '../app/api/sesi/route.js'
import * as data from '../app/api/data/route.js'
import * as nilai from '../app/api/nilai/route.js'
import * as rollback from '../app/api/nilai/rollback/route.js'
import * as penguncian from '../app/api/penguncian/route.js'
import * as koreksi from '../app/api/koreksi/route.js'
import * as keputusanKoreksi from '../app/api/koreksi/keputusan/route.js'
import * as usulan from '../app/api/usulan/route.js'
import * as keputusanUsulan from '../app/api/usulan/keputusan/route.js'
import * as profil from '../app/api/profil/route.js'
import * as angkatanPratinjau from '../app/api/angkatan/pratinjau/route.js'
import * as angkatanKunci from '../app/api/angkatan/kunci/route.js'
import * as log from '../app/api/log/route.js'
import * as angkatanRingkasan from '../app/api/angkatan/route.js'
import { KOMPONEN, KOMPONEN_BAWAAN, KUNCI_VERSI_KURIKULUM, getAspekList, getIndikator, isiKurikulum } from '../src/lib/curriculum.js'
import { CONFIG } from '../src/lib/config.js'
import { ambilKurikulum } from '../src/server/kurikulum.js'
import { ambilMaster } from '../src/server/master.js'

const PINTU = {
  '/api/masuk': masuk,
  '/api/keluar': keluar,
  '/api/sesi': sesi,
  '/api/data': data,
  '/api/nilai': nilai,
  '/api/nilai/rollback': rollback,
  '/api/penguncian': penguncian,
  '/api/koreksi': koreksi,
  '/api/koreksi/keputusan': keputusanKoreksi,
  '/api/usulan': usulan,
  '/api/usulan/keputusan': keputusanUsulan,
  '/api/profil': profil,
  '/api/angkatan/pratinjau': angkatanPratinjau,
  '/api/angkatan/kunci': angkatanKunci,
  '/api/log': log,
  '/api/angkatan': angkatanRingkasan,
}

let gagal = 0
const cek = (nama, ok, rinci = '') => {
  if (!ok) gagal++
  console.log((ok ? 'LULUS ' : 'GAGAL ') + nama + (ok || rinci === '' ? '' : '  → ' + rinci))
}
const garis = (t) => console.log('\n' + '─'.repeat(74) + '\n' + t + '\n' + '─'.repeat(74))

/** Satu "peramban" dengan cookie-nya sendiri. */
function peramban() {
  let cookie = ''
  return async (alamat, { metode = 'GET', isi } = {}) => {
    const r = await PINTU[alamat][metode](
      new Request('http://localhost' + alamat, {
        method: metode,
        headers: { cookie, 'content-type': 'application/json' },
        body: metode === 'GET' ? undefined : JSON.stringify(isi ?? {}),
      }),
    )
    const pasang = r.headers.get('set-cookie')
    if (pasang) cookie = pasang.split(';')[0].endsWith('=') ? '' : pasang.split(';')[0]
    return { status: r.status, isi: await r.json().catch(() => ({})) }
  }
}

const NIM = 'UJI' + Date.now().toString().slice(-7)
const EMAIL = 'uji.' + NIM.toLowerCase() + '@student.umn.ac.id'
let mahasiswaId = null

/* Bagian "kunci angkatan" memakai dua angkatan sementara dan satu mahasiswa sementara tambahan, supaya
   angkatan asli di basis data tidak ikut terkunci. Semuanya dihapus di bersihkan(). */
const SUF = Date.now().toString().slice(-6)
const NIM2 = NIM + 'K'
const EMAIL2 = 'uji.' + NIM2.toLowerCase() + '@student.umn.ac.id'
const ANG_A = 'UJIA' + SUF
const ANG_B = 'UJIB' + SUF
const ANG_C = 'UJIC' + SUF
const NIM3 = NIM + 'L'
const EMAIL3 = 'uji.' + NIM3.toLowerCase() + '@student.umn.ac.id'
/* Bagian "kurikulum" memakai satu indikator sementara dan menimpa dua baris Konfigurasi. */
const IND_UJI = 'UJI-IND-' + SUF
const KONFIGURASI_UJI = ['AMBANG_SERTIFIKAT', 'TOTAL_SEMESTER_PROGRAM']
/** Baris Konfigurasi sebelum disentuh uji ({ kunci: baris | null }); undefined = belum disentuh. */
let konfigurasiAsli
/** Target baris LogAktivitas yang dibuat uji ini; ditambah id batch begitu diketahui. */
const targetLog = ['angkatan ' + ANG_A, 'angkatan ' + ANG_B, 'mahasiswa ' + NIM, 'mahasiswa ' + NIM2]

async function bersihkanMahasiswa(email) {
  const p = await db.pengguna.findUnique({ where: { email }, include: { mahasiswa: true } })
  const m = p?.mahasiswa
  if (m) {
    const batch = (await db.auditLog.findMany({ where: { mahasiswaId: m.id }, select: { batchId: true } }))
      .map((a) => a.batchId)
      .filter(Boolean)
    const usulanId = (await db.usulanEntri.findMany({ where: { nim: m.nim }, select: { usulanId: true } })).map((e) => e.usulanId)
    await db.nilai.deleteMany({ where: { mahasiswaId: m.id } })
    await db.auditLog.deleteMany({ where: { mahasiswaId: m.id } })
    await db.batch.deleteMany({ where: { id: { in: [...new Set(batch)] } } })
    await db.penguncian.deleteMany({ where: { mahasiswaId: m.id } })
    await db.pengajuanKoreksi.deleteMany({ where: { mahasiswaId: m.id } })
    await db.usulan.deleteMany({ where: { id: { in: [...new Set(usulanId)] } } })
    await db.mahasiswa.delete({ where: { id: m.id } })
  }
  if (p) {
    await db.profil.deleteMany({ where: { penggunaId: p.id } })
    await db.pengguna.delete({ where: { id: p.id } })
  }
}

/** Menaikkan penanda versi kurikulum supaya pemuat membaca ulang. Versi tidak pernah diturunkan. */
async function naikkanVersi() {
  const v = await db.konfigurasi.findUnique({ where: { kunci: KUNCI_VERSI_KURIKULUM } })
  if (v) await db.konfigurasi.update({ where: { kunci: KUNCI_VERSI_KURIKULUM }, data: { nilai: (Number(v.nilai) || 0) + 1 } })
}

async function pulihkanKurikulum() {
  let berubah = (await db.indikator.deleteMany({ where: { id: IND_UJI } })).count > 0
  if (konfigurasiAsli) {
    for (const kunci of KONFIGURASI_UJI) {
      const baris = konfigurasiAsli[kunci]
      if (baris) await db.konfigurasi.upsert({ where: { kunci }, update: { nilai: baris.nilai }, create: baris })
      else await db.konfigurasi.deleteMany({ where: { kunci } })
    }
    konfigurasiAsli = undefined
    berubah = true
  }
  if (berubah) await naikkanVersi()
}

async function bersihkan() {
  await pulihkanKurikulum()
  await bersihkanMahasiswa(EMAIL)
  await bersihkanMahasiswa(EMAIL2)
  await bersihkanMahasiswa(EMAIL3)
  await db.logAktivitas.deleteMany({ where: { target: { in: targetLog } } })
  await db.angkatan.deleteMany({ where: { id: { in: [ANG_A, ANG_B, ANG_C] } } })
}

try {
  /* ----------------------------- persiapan ----------------------------- */
  garis('PERSIAPAN: akun mahasiswa sementara ' + NIM + ' (Sistem Informasi, semester 2)')
  const prodi = await db.programStudi.findUnique({ where: { nama: 'Sistem Informasi' } })
  const angkatan = (await db.angkatan.findMany()).find((a) => a.periodeSemester === 'GENAP' && a.periodeTahun === '2025/2026')
  if (!prodi || !angkatan) throw new Error('Butuh prodi Sistem Informasi dan angkatan Genap 2025/2026 di basis data.')
  const akunUji = await db.pengguna.create({
    data: {
      email: EMAIL,
      passwordHash: await bcrypt.hash('umn12345', 10),
      peran: 'MAHASISWA',
      mahasiswa: { create: { nim: NIM, nama: 'Mahasiswa Uji', prodiId: prodi.id, angkatanId: angkatan.id } },
    },
    include: { mahasiswa: true },
  })
  mahasiswaId = akunUji.mahasiswa.id
  console.log('angkatan', angkatan.id, '· prodi', prodi.nama)

  const admin = peramban()
  const mhs = peramban()
  const dosen = peramban()
  const tamu = peramban()

  /* ------------------------------ sesi ------------------------------ */
  garis('1. MASUK, SESI, DAN WEWENANG')
  cek('tanpa cookie: /api/data ditolak 401', (await tamu('/api/data')).status === 401)
  cek('sandi salah ditolak', (await tamu('/api/masuk', { metode: 'POST', isi: { email: EMAIL, password: 'salah' } })).status === 401)
  cek('admin masuk', (await admin('/api/masuk', { metode: 'POST', isi: { email: 'admin@umn.ac.id', password: 'umn12345' } })).status === 200)
  cek('mahasiswa uji masuk', (await mhs('/api/masuk', { metode: 'POST', isi: { email: EMAIL, password: 'umn12345' } })).status === 200)
  cek('dosen masuk', (await dosen('/api/masuk', { metode: 'POST', isi: { email: 'simon.petrus@lecturer.umn.ac.id', password: 'umn12345' } })).status === 200)
  const s = await mhs('/api/sesi')
  cek('/api/sesi mengembalikan akun dari basis data', s.status === 200 && s.isi.akun?.mahasiswa?.nim === NIM, JSON.stringify(s.isi))
  cek('mahasiswa tidak boleh menyimpan nilai (403)', (await mhs('/api/nilai', { metode: 'POST', isi: {} })).status === 403)
  cek('dosen tidak boleh memutuskan usulan (403)', (await dosen('/api/usulan/keputusan', { metode: 'POST', isi: {} })).status === 403)

  /* ------------------------------ data per peran ------------------------------ */
  garis('2. DATA PER PERAN')
  const dAdmin = (await admin('/api/data')).isi
  cek('admin melihat mahasiswa uji', dAdmin.mahasiswa.some((m) => m.nim === NIM))
  const dMhs = (await mhs('/api/data')).isi
  cek('mahasiswa hanya melihat dirinya', dMhs.mahasiswa.length === 1 && dMhs.mahasiswa[0].nim === NIM)
  cek('semester berjalan diturunkan dari angkatan', dMhs.mahasiswa[0].semesterAktif === 2, String(dMhs.mahasiswa[0].semesterAktif))
  const dDosen = (await dosen('/api/data')).isi
  cek('dosen melihat mahasiswa kelasnya', dDosen.mahasiswa.some((m) => m.nim === NIM))
  cek('dosen tidak menerima email mahasiswa', dDosen.mahasiswa.every((m) => m.email === ''))

  /* ------------------------------ simpan & rollback ------------------------------ */
  garis('3. SIMPAN NILAI, BATCH, AUDIT, ROLLBACK')
  const kirimNilai = (n) =>
    admin('/api/nilai', {
      metode: 'POST',
      isi: { sumber: 'MK', semester: 1, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: n }] },
    })
  const sel = () => db.nilai.findUnique({ where: { mahasiswaId_komponenId: { mahasiswaId, komponenId: 'A1-MK-T1' } } })

  const b1 = await kirimNilai(80)
  cek('batch pertama tersimpan', b1.status === 200 && b1.isi.jumlah === 1 && b1.isi.jejak?.[0]?.nilaiBaru === 80, JSON.stringify(b1.isi))
  cek('nilai 80 ada di tabel Nilai', (await sel())?.nilai === 80)
  const b2 = await kirimNilai(90)
  cek('batch kedua menimpa menjadi 90', (await sel())?.nilai === 90)
  cek('audit mencatat nilai lama 80', b2.isi.jejak?.[0]?.nilaiLama === 80)
  const ditolak = await admin('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 3, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'B3-MK-T1', nilai: 70 }] },
  })
  cek('R1: aspek semester 3 ditolak untuk mahasiswa semester 2', ditolak.status === 400, JSON.stringify(ditolak.isi))
  const semSalah = await admin('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 2, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: 70 }] },
  })
  cek('komponen semester 1 ditolak bila batch berlabel semester 2', semSalah.status === 400, JSON.stringify(semSalah.isi))
  const semLuar = await admin('/api/nilai', {
    metode: 'POST',
    isi: { sumber: 'MK', semester: 99, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A1-MK-T1', nilai: 70 }] },
  })
  cek('semester di luar program ditolak', semLuar.status === 400, JSON.stringify(semLuar.isi))

  await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: b1.isi.id } })
  cek('rollback batch lama tidak menghapus nilai batch sesudahnya', (await sel())?.nilai === 90)
  cek('rollback kedua kalinya ditolak', (await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: b1.isi.id } })).isi.ok === false)
  await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: b2.isi.id } })
  cek('rollback batch terakhir mengosongkan sel', (await sel()) === null)
  const dBatch = (await admin('/api/data')).isi.batch
  cek('riwayat batch menandai keduanya dibatalkan', [b1.isi.id, b2.isi.id].every((id) => dBatch.find((b) => b.id === id)?.status === 'dibatalkan'))

  /* ------------------------------ penguncian ------------------------------ */
  garis('4. PENGUNCIAN ASPEK')
  await kirimNilai(85)
  const kunciTolak = await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'final' } })
  cek('aspek yang komponennya belum lengkap tidak bisa final', kunciTolak.status === 400, JSON.stringify(kunciTolak.isi))
  const tahan = await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: 'sementara' } })
  cek('tahan sementara tersimpan', tahan.status === 200 && (await db.penguncian.count({ where: { mahasiswaId } })) === 1)
  const mUji = (await mhs('/api/data')).isi.mahasiswa[0]
  cek('mahasiswa melihat penandaan dan penilainya', mUji.penguncian.A1?.status === 'sementara' && mUji.nilai.A1?.komponen['A1-MK-T1']?.penilai === 'Biro Kemahasiswaan', JSON.stringify(mUji.penguncian))
  await admin('/api/penguncian', { metode: 'POST', isi: { daftar: [{ nim: NIM, aspekId: 'A1' }], status: null } })
  cek('penandaan bisa dilepas', (await db.penguncian.count({ where: { mahasiswaId } })) === 0)

  /* ------------------------------ koreksi ------------------------------ */
  garis('5. PENGAJUAN KOREKSI')
  const k = await mhs('/api/koreksi', { metode: 'POST', isi: { komponenId: 'A1-MK-T1', alasan: 'Uji: nilai tugas belum lengkap.' } })
  cek('mahasiswa mengajukan koreksi', k.status === 200 && /^K-\d+$/.test(k.isi.id), JSON.stringify(k.isi))
  cek('alasan kosong ditolak', (await mhs('/api/koreksi', { metode: 'POST', isi: { komponenId: 'A1-MK-T1', alasan: ' ' } })).status === 400)
  cek('admin melihat pengajuannya', (await admin('/api/data')).isi.koreksi.some((x) => x.id === k.isi.id && x.status === 'menunggu'))
  const putus = await admin('/api/koreksi/keputusan', { metode: 'POST', isi: { id: k.isi.id, keputusan: 'disetujui', catatan: 'Uji disetujui.' } })
  cek('admin memutuskan', putus.isi.ok === true)
  const kMhs = (await mhs('/api/data')).isi.koreksi.find((x) => x.id === k.isi.id)
  cek('mahasiswa melihat keputusan beserta catatannya', kMhs?.status === 'disetujui' && kMhs.keputusan?.catatan === 'Uji disetujui.', JSON.stringify(kMhs))
  cek('tidak bisa diputuskan dua kali', (await admin('/api/koreksi/keputusan', { metode: 'POST', isi: { id: k.isi.id, keputusan: 'ditolak' } })).isi.ok === false)

  /* ------------------------------ usulan dosen ------------------------------ */
  garis('6. USULAN NILAI DOSEN')
  const u1 = await dosen('/api/usulan', { metode: 'POST', isi: { cara: 'manual', catatan: 'Uji usulan.', entri: [{ nim: NIM, komponenId: 'A1-MK-UAS', nilai: 88 }] } })
  cek('dosen mengirim usulan', u1.status === 200 && /^U-\d+$/.test(u1.isi.id), JSON.stringify(u1.isi))
  cek('komponen di luar kelasnya ditolak', (await dosen('/api/usulan', { metode: 'POST', isi: { entri: [{ nim: NIM, komponenId: 'A4-MK-UTS', nilai: 70 }] } })).status === 400)
  const selUas = () => db.nilai.findUnique({ where: { mahasiswaId_komponenId: { mahasiswaId, komponenId: 'A1-MK-UAS' } } })
  cek('usulan belum menyentuh transkrip', (await selUas()) === null)
  const setuju = await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: u1.isi.id, keputusan: 'disetujui' } })
  cek('admin menyetujui', setuju.isi.ok === true, JSON.stringify(setuju.isi))
  const uas = await selUas()
  cek('nilai masuk atas nama dosen pengusul', uas?.nilai === 88 && uas.penilaiId !== (await db.pengguna.findUnique({ where: { email: 'admin@umn.ac.id' } })).id)
  const uDosen = (await dosen('/api/data')).isi.usulan.find((x) => x.id === u1.isi.id)
  cek('dosen melihat usulannya disetujui beserta batch-nya', uDosen?.status === 'disetujui' && uDosen.batchId && uDosen.keputusan?.oleh === 'Biro Kemahasiswaan', JSON.stringify(uDosen))
  const u2 = await dosen('/api/usulan', { metode: 'POST', isi: { entri: [{ nim: NIM, komponenId: 'A2-MK-UTS', nilai: 75 }] } })
  cek('tolak tanpa alasan tidak diterima', (await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: u2.isi.id, keputusan: 'ditolak' } })).status === 400)
  cek('tolak dengan alasan diterima', (await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: u2.isi.id, keputusan: 'ditolak', catatan: 'Uji ditolak.' } })).isi.ok === true)
  cek('penolakan tidak menulis nilai', (await db.nilai.count({ where: { mahasiswaId, komponenId: 'A2-MK-UTS' } })) === 0)

  /* ------------------------------ profil ------------------------------ */
  garis('7. PROFIL')
  cek('telepon tidak sah ditolak', (await mhs('/api/profil', { metode: 'PUT', isi: { telepon: 'abc' } })).status === 400)
  await mhs('/api/profil', { metode: 'PUT', isi: { telepon: '021 5422 0808', ponsel: '', alamat: 'Gading Serpong', foto: null, fotoSumber: null } })
  const pr = (await mhs('/api/data')).isi.profil
  cek('profil tersimpan di basis data', pr?.telepon === '021 5422 0808' && pr.alamat === 'Gading Serpong', JSON.stringify(pr))
  const panjang = 'a'.repeat(400)
  const simpanPanjang = await mhs('/api/profil', { metode: 'PUT', isi: { alamat: panjang } })
  cek('alamat 400 karakter tersimpan', simpanPanjang.status === 200, JSON.stringify(simpanPanjang.isi))
  cek('alamat panjang terbaca utuh', (await mhs('/api/data')).isi.profil?.alamat?.length === 400)

  /* ------------------------- kunci angkatan & data terkunci ------------------------- */
  garis('8. KUNCI ANGKATAN DAN PERUBAHAN DATA TERKUNCI')
  // A masuk Ganjil 2024/2025: semester kalendernya sudah lewat 3, jadi boleh dikunci.
  // B masuk Ganjil 2025/2026: masih di semester 3, belum boleh.
  await db.angkatan.createMany({
    data: [
      { id: ANG_A, tahun: 2024, label: 'Uji A ' + SUF, periodeTahun: '2024/2025', periodeSemester: 'GANJIL' },
      { id: ANG_B, tahun: 2025, label: 'Uji B ' + SUF, periodeTahun: '2025/2026', periodeSemester: 'GANJIL' },
    ],
  })
  const akunUji2 = await db.pengguna.create({
    data: {
      email: EMAIL2,
      passwordHash: 'tidak-dipakai',
      peran: 'MAHASISWA',
      mahasiswa: { create: { nim: NIM2, nama: 'Mahasiswa Uji Terkunci', prodiId: prodi.id, angkatanId: ANG_A } },
    },
    include: { mahasiswa: true },
  })
  const mahasiswaId2 = akunUji2.mahasiswa.id
  const adminId = (await db.pengguna.findUnique({ where: { email: 'admin@umn.ac.id' } })).id
  const nilaiMhs2 = () => db.nilai.count({ where: { mahasiswaId: mahasiswaId2 } })
  const logAda = (aksi, target) => db.logAktivitas.findFirst({ where: { aksi, target } })

  // --- pratinjau dan kunci ---
  const pratA = await admin('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: ANG_A } })
  cek(
    'pratinjau: ringkasan benar, nilai bolong tidak menghalangi',
    pratA.status === 200 && pratA.isi.total === 1 && pratA.isi.tidakBerhak === 1 && pratA.isi.komponenKosong === 1 && pratA.isi.bolehDikunci === true,
    JSON.stringify(pratA.isi),
  )
  cek('mahasiswa tidak boleh pratinjau (403)', (await mhs('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: ANG_A } })).status === 403)
  cek('dosen tidak boleh mengunci (403)', (await dosen('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A } })).status === 403)
  const pratB = await admin('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: ANG_B } })
  cek('angkatan yang masih semester 3 belum boleh dikunci', pratB.status === 200 && pratB.isi.bolehDikunci === false, JSON.stringify(pratB.isi))
  cek(
    'kunci ditolak bila semester 3 belum berakhir',
    (await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_B, konfirmasi: 'Uji B ' + SUF } })).status === 400,
  )
  cek(
    'kunci ditolak bila konfirmasi ketik salah',
    (await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'salah' } })).status === 400,
  )
  cek('angkatan tidak dikenal 404', (await admin('/api/angkatan/pratinjau', { metode: 'POST', isi: { angkatanId: 'TIDAK-ADA' } })).status === 404)

  const kunciA = await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'Uji A ' + SUF } })
  const barisA = await db.angkatan.findUnique({ where: { id: ANG_A } })
  cek(
    'angkatan terkunci beserta pencatat dan waktunya',
    kunciA.status === 200 && kunciA.isi.ok === true && barisA.status === 'TERKUNCI' && barisA.dikunciOleh === adminId && barisA.dikunciPada != null,
    JSON.stringify(kunciA.isi),
  )
  cek('penguncian angkatan tercatat di log', Boolean(await logAda('KUNCI_ANGKATAN', 'angkatan ' + ANG_A)))
  cek('mengunci dua kali ditolak (ok false)', (await admin('/api/angkatan/kunci', { metode: 'POST', isi: { angkatanId: ANG_A, konfirmasi: 'Uji A ' + SUF } })).isi.ok === false)
  const dataAdmin = (await admin('/api/data')).isi
  cek('data admin menunjukkan status angkatan terkunci', dataAdmin.mahasiswa.find((m) => m.nim === NIM2)?.statusAngkatan === 'terkunci')

  // --- admin mengubah / melengkapi data terkunci, wajib beralasan ---
  const isiTerkunci = (komponenId, nilaiBaru, alasan) =>
    admin('/api/nilai', {
      metode: 'POST',
      isi: { sumber: 'MK', semester: 1, angkatanId: ANG_A, cara: 'manual', entri: [{ nim: NIM2, komponenId, nilai: nilaiBaru }], alasan },
    })
  const tanpaAlasan = await isiTerkunci('A1-MK-T1', 80)
  cek('angkatan terkunci: isi sel bolong tanpa alasan ditolak', tanpaAlasan.status === 400 && /alasan/i.test(tanpaAlasan.isi.galat ?? ''), JSON.stringify(tanpaAlasan.isi))
  cek('alasan terlalu pendek ditolak', (await isiTerkunci('A1-MK-T1', 80, 'singkat')).status === 400)
  cek('penolakan tidak menulis nilai', (await nilaiMhs2()) === 0)
  const denganAlasan = await isiTerkunci('A1-MK-T1', 80, 'Melengkapi nilai susulan sesudah semester 3.')
  cek('dengan alasan diterima (admin boleh mengisi sel bolong sesudah semester 3)', denganAlasan.status === 200 && (await nilaiMhs2()) === 1, JSON.stringify(denganAlasan.isi))
  targetLog.push('batch ' + denganAlasan.isi.id)
  const logUbah = await logAda('UBAH_DATA_TERKUNCI', 'batch ' + denganAlasan.isi.id)
  cek('perubahan data terkunci tercatat beserta alasannya', logUbah?.rincian?.alasan === 'Melengkapi nilai susulan sesudah semester 3.', JSON.stringify(logUbah?.rincian))

  cek('rollback data terkunci tanpa alasan ditolak', (await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: denganAlasan.isi.id } })).status === 400 && (await nilaiMhs2()) === 1)
  const rbTerkunci = await admin('/api/nilai/rollback', { metode: 'POST', isi: { id: denganAlasan.isi.id, alasan: 'Salah memasukkan nilai, dibatalkan.' } })
  cek('rollback dengan alasan berhasil dan tercatat', rbTerkunci.isi.ok === true && (await nilaiMhs2()) === 0 && Boolean(await logAda('ROLLBACK_DATA_TERKUNCI', 'batch ' + denganAlasan.isi.id)), JSON.stringify(rbTerkunci.isi))

  // --- dosen tetap boleh mengusulkan; admin yang memutuskan, dengan catatan ---
  const usulTerkunci = await dosen('/api/usulan', { metode: 'POST', isi: { cara: 'manual', entri: [{ nim: NIM2, komponenId: 'A1-MK-UAS', nilai: 70 }] } })
  cek('dosen tetap boleh mengusulkan untuk angkatan terkunci', usulTerkunci.status === 200, JSON.stringify(usulTerkunci.isi))
  cek('menyetujui usulan data terkunci tanpa catatan ditolak', (await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: usulTerkunci.isi.id, keputusan: 'disetujui' } })).status === 400)
  const setujuTerkunci = await admin('/api/usulan/keputusan', { metode: 'POST', isi: { id: usulTerkunci.isi.id, keputusan: 'disetujui', catatan: 'Disetujui setelah memeriksa berkas dosen.' } })
  cek('menyetujui dengan catatan berhasil dan nilai masuk', setujuTerkunci.isi.ok === true && (await nilaiMhs2()) === 1, JSON.stringify(setujuTerkunci.isi))
  const usulSetuju = (await admin('/api/data')).isi.usulan.find((x) => x.id === usulTerkunci.isi.id)
  if (usulSetuju?.batchId) targetLog.push('batch ' + usulSetuju.batchId)
  cek('persetujuan usulan data terkunci tercatat di log', Boolean(usulSetuju?.batchId && (await logAda('UBAH_DATA_TERKUNCI', 'batch ' + usulSetuju.batchId))))

  // --- aspek final MANUAL pada angkatan yang belum terkunci ---
  await db.penguncian.create({ data: { mahasiswaId, aspekId: 'A2', status: 'FINAL', olehId: adminId } })
  const ubahA2 = (alasan) =>
    admin('/api/nilai', {
      metode: 'POST',
      isi: { sumber: 'MK', semester: 1, angkatanId: angkatan.id, cara: 'manual', entri: [{ nim: NIM, komponenId: 'A2-MK-UTS', nilai: 77 }], alasan },
    })
  cek('aspek final manual: ubah tanpa alasan ditolak', (await ubahA2()).status === 400)
  const a2 = await ubahA2('Koreksi nilai UTS atas permintaan dosen.')
  cek('aspek final manual: dengan alasan diterima', a2.status === 200, JSON.stringify(a2.isi))
  targetLog.push('batch ' + a2.isi.id)
  cek('aspek tanpa tanda final manual tidak butuh alasan', (await kirimNilai(86)).status === 200)

  // --- penguncian aspek tercatat ---
  const logPenguncian = await db.logAktivitas.count({ where: { aksi: 'UBAH_PENGUNCIAN', target: 'mahasiswa ' + NIM } })
  cek('perubahan tanda penguncian aspek tercatat di log', logPenguncian >= 2, String(logPenguncian))

  /* ------------------------------ log aktivitas ------------------------------ */
  garis('9. LOG AKTIVITAS (BACA, FILTER, PAGINASI)')
  const bacaLog = (isi) => admin('/api/log', { metode: 'POST', isi })
  const tanggalWib = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(d)
  const hariIni = tanggalWib(new Date())
  const besok = tanggalWib(new Date(Date.now() + 24 * 60 * 60 * 1000))

  // --- wewenang ---
  cek('tanpa sesi: log ditolak 401', (await tamu('/api/log', { metode: 'POST', isi: {} })).status === 401)
  cek('mahasiswa tidak boleh membaca log (403)', (await mhs('/api/log', { metode: 'POST', isi: {} })).status === 403)
  cek('dosen tidak boleh membaca log (403)', (await dosen('/api/log', { metode: 'POST', isi: {} })).status === 403)

  // --- masukan yang salah ditolak ---
  cek('jenis log tidak dikenal ditolak', (await bacaLog({ jenis: 'lain' })).status === 400)
  cek('aksi tidak dikenal ditolak', (await bacaLog({ jenis: 'aktivitas', aksi: 'HAPUS_SEMUA' })).status === 400)
  cek('tanggal berbentuk salah ditolak', (await bacaLog({ dari: '09-10-2026' })).status === 400)
  cek('tanggal yang tidak ada di kalender ditolak', (await bacaLog({ dari: '2026-02-31' })).status === 400)
  cek('tanggal awal sesudah tanggal akhir ditolak', (await bacaLog({ dari: '2026-10-10', sampai: '2026-10-01' })).status === 400)
  cek('halaman bukan bilangan bulat ditolak', (await bacaLog({ halaman: 'dua' })).status === 400)

  // --- perubahan nilai (AuditLog) ---
  const totalDb = await db.auditLog.count({ where: { mahasiswaId } })
  const semua = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 100 })
  cek('jenis nilai: total sama dengan isi tabel AuditLog', semua.status === 200 && semua.isi.total === totalDb && semua.isi.baris.length === totalDb, JSON.stringify([totalDb, semua.isi.total]))
  cek('baris nilai memuat nama, aspek, nilai lama dan baru', semua.isi.baris.every((b) => b.nim === NIM && b.nama === 'Mahasiswa Uji' && b.aspek && b.komponen && 'nilaiLama' in b && 'nilaiBaru' in b))
  cek('urutan dari yang terbaru', semua.isi.baris.every((b, i, a) => i === 0 || a[i - 1].waktu >= b.waktu))
  cek('NIM tidak dikenal memberi hasil kosong, bukan semua', (await bacaLog({ jenis: 'nilai', nim: 'TIDAKADA' })).isi.total === 0)

  const jejakB1 = semua.isi.baris.find((b) => b.batchId === b1.isi.id)
  cek('jejak batch yang dibatalkan tetap tampil dan bertanda dibatalkan', jejakB1?.dibatalkan === true, JSON.stringify(jejakB1))
  cek('jejak batch yang masih berlaku tidak bertanda dibatalkan', semua.isi.baris.some((b) => b.dibatalkan === false))

  // --- paginasi ---
  const hal1 = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 2, halaman: 1 })
  const hal2 = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 2, halaman: 2 })
  cek('paginasi: ukuran 2 memberi 2 baris dan jumlah halaman benar', hal1.isi.baris.length === 2 && hal1.isi.jumlahHalaman === Math.ceil(totalDb / 2), JSON.stringify([hal1.isi.baris.length, hal1.isi.jumlahHalaman]))
  cek('paginasi: halaman 2 berisi baris lain dan total tetap', hal2.isi.total === totalDb && hal2.isi.baris.every((b) => !hal1.isi.baris.some((x) => x.id === b.id)))
  const lewat = await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 2, halaman: 999 })
  cek('halaman di luar jangkauan kosong tanpa galat', lewat.status === 200 && lewat.isi.baris.length === 0 && lewat.isi.total === totalDb)
  cek('ukuran halaman dibatasi 100', (await bacaLog({ jenis: 'nilai', nim: NIM, ukuran: 5000 })).isi.ukuran === 100)

  // --- filter pelaku dan tanggal ---
  const totalAdmin = await db.auditLog.count({ where: { mahasiswaId, aktorId: adminId } })
  const olehAdmin = await bacaLog({ jenis: 'nilai', nim: NIM, aktorId: adminId, ukuran: 100 })
  cek('filter pelaku: hanya perubahan oleh admin', olehAdmin.isi.total === totalAdmin && olehAdmin.isi.total < totalDb && olehAdmin.isi.baris.every((b) => b.aktor === 'Biro Kemahasiswaan'), JSON.stringify([totalAdmin, totalDb]))
  cek('pilihan pelaku memuat admin', semua.isi.pilihanAktor.some((a) => a.id === adminId))
  cek('filter tanggal hari ini (WIB) menemukan perubahan yang baru dibuat', (await bacaLog({ jenis: 'nilai', nim: NIM, dari: hariIni, sampai: hariIni })).isi.total === totalDb)
  cek('filter tanggal besok kosong', (await bacaLog({ jenis: 'nilai', nim: NIM, dari: besok })).isi.total === 0)
  cek('filter tanggal lampau kosong', (await bacaLog({ jenis: 'nilai', nim: NIM, dari: '2000-01-01', sampai: '2000-01-02' })).isi.total === 0)

  // --- tindakan admin (LogAktivitas) ---
  const akt = await bacaLog({ jenis: 'aktivitas', dari: hariIni, ukuran: 100 })
  const barisKunci = akt.isi.baris.find((b) => b.aksi === 'KUNCI_ANGKATAN' && b.target === 'angkatan ' + ANG_A)
  cek('aktivitas: penguncian angkatan terbaca beserta pelakunya', akt.status === 200 && barisKunci?.aktor === 'Biro Kemahasiswaan' && barisKunci.rincian?.label === 'Uji A ' + SUF, JSON.stringify(barisKunci))
  const barisUbah = akt.isi.baris.find((b) => b.aksi === 'UBAH_DATA_TERKUNCI' && b.target === 'batch ' + denganAlasan.isi.id)
  cek('aktivitas: alasan perubahan data terkunci terbaca', barisUbah?.rincian?.alasan === 'Melengkapi nilai susulan sesudah semester 3.', JSON.stringify(barisUbah))
  const hanyaKunci = await bacaLog({ jenis: 'aktivitas', aksi: 'KUNCI_ANGKATAN', ukuran: 100 })
  cek('filter aksi hanya mengembalikan aksi itu', hanyaKunci.isi.baris.length > 0 && hanyaKunci.isi.baris.every((b) => b.aksi === 'KUNCI_ANGKATAN'))
  cek('daftar pilihan aksi tersedia untuk layar', akt.isi.pilihanAksi?.includes('UBAH_PENGUNCIAN'))
  cek('membaca log tidak mengubah isi tabel', (await db.auditLog.count({ where: { mahasiswaId } })) === totalDb)

  /* ------------------------------ ringkasan angkatan ------------------------------ */
  garis('10. RINGKASAN ANGKATAN')
  const ringkasan = async () => (await admin('/api/angkatan')).isi.angkatan ?? []
  const dari = (daftar, id) => daftar.find((a) => a.angkatanId === id)

  cek('tanpa sesi: ringkasan angkatan ditolak 401', (await tamu('/api/angkatan')).status === 401)
  cek('mahasiswa tidak boleh melihat ringkasan (403)', (await mhs('/api/angkatan')).status === 403)
  cek('dosen tidak boleh melihat ringkasan (403)', (await dosen('/api/angkatan')).status === 403)

  // Angkatan C: lama (boleh dikunci) dan SELURUH komponennya terisi, jadi lengkap.
  await db.angkatan.create({ data: { id: ANG_C, tahun: 2024, label: 'Uji C ' + SUF, periodeTahun: '2024/2025', periodeSemester: 'GANJIL' } })
  const akunUji3 = await db.pengguna.create({
    data: {
      email: EMAIL3,
      passwordHash: 'tidak-dipakai',
      peran: 'MAHASISWA',
      mahasiswa: { create: { nim: NIM3, nama: 'Mahasiswa Uji Lengkap', prodiId: prodi.id, angkatanId: ANG_C } },
    },
    include: { mahasiswa: true },
  })
  await db.nilai.createMany({
    data: KOMPONEN.map((k) => ({ mahasiswaId: akunUji3.mahasiswa.id, komponenId: k.id, nilai: 80, penilaiId: adminId })),
  })

  const rg = await ringkasan()
  const gA = dari(rg, ANG_A)
  const gB = dari(rg, ANG_B)
  const gC = dari(rg, ANG_C)
  cek('ringkasan memuat semua angkatan uji', Boolean(gA && gB && gC), JSON.stringify(rg.map((a) => a.angkatanId)))
  cek('angkatan yang sudah ada di basis data ikut tampil', rg.some((a) => a.angkatanId === angkatan.id))
  cek('urutan: periode masuk terbaru lebih dulu', rg.findIndex((a) => a.angkatanId === ANG_B) < rg.findIndex((a) => a.angkatanId === ANG_A))

  cek(
    'angkatan terkunci: pencatat dan waktu kunci terbaca',
    gA?.status === 'terkunci' && gA.dikunciOleh === 'Biro Kemahasiswaan' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(gA.dikunciPada ?? ''),
    JSON.stringify(gA),
  )
  cek('angkatan aktif: belum ada pencatat kunci', gB?.status === 'aktif' && gB.dikunciOleh === null && gB.dikunciPada === null)
  cek('angkatan masih semester 3: belum boleh dikunci beserta alasannya', gB?.bolehDikunci === false && /semester/i.test(gB.alasanTidakBoleh ?? ''), JSON.stringify(gB))
  cek('angkatan kosong: tanpa persentase dan tidak dianggap lengkap', gB?.jumlahMahasiswa === 0 && gB.kelengkapan.persen === null && gB.semuaLengkap === false)

  cek('jumlah mahasiswa benar', gA?.jumlahMahasiswa === 1 && gC?.jumlahMahasiswa === 1)
  const terisiA = await db.nilai.count({ where: { mahasiswaId: mahasiswaId2 } })
  cek(
    'angkatan dengan sel bolong: tidak lengkap, hitungan komponen sesuai tabel Nilai',
    gA?.semuaLengkap === false &&
      gA.kelengkapan.mahasiswaBolong === 1 &&
      gA.kelengkapan.komponenTerisi === terisiA &&
      gA.kelengkapan.persen === Math.round((terisiA / gA.kelengkapan.komponenTotal) * 1000) / 10,
    JSON.stringify(gA?.kelengkapan),
  )
  cek('angkatan bolong tidak ditandai siap kunci otomatis', gA?.siapKunciOtomatis === false)
  cek('persentase tidak pernah 100 selama masih ada yang bolong', gA?.kelengkapan.persen < 100)
  cek(
    'angkatan lengkap dan boleh dikunci: ditandai siap kunci otomatis',
    gC?.semuaLengkap === true && gC.kelengkapan.persen === 100 && gC.bolehDikunci === true && gC.siapKunciOtomatis === true,
    JSON.stringify(gC),
  )
  cek('ringkasan hanya membaca: angkatan lengkap tetap AKTIF', (await db.angkatan.findUnique({ where: { id: ANG_C } })).status === 'AKTIF')
  cek('dibaca ulang hasilnya sama', JSON.stringify(dari(await ringkasan(), ANG_C)) === JSON.stringify(gC))

  /* ------------------------------ kurikulum ------------------------------ */
  garis('11. KURIKULUM DARI BASIS DATA')
  const kur = await ambilKurikulum()
  cek('basis data sudah di-seed: penanda versi ada', kur?.versi >= 1, JSON.stringify(kur?.versi ?? null))
  cek('setiap aspek punya minimal satu komponen aktif', getAspekList().every((a) => kur?.komponen.some((k) => k.aspekId === a.id)))
  cek(
    'bentuk tiap komponen sesuai yang dibaca kode',
    Boolean(
      kur?.komponen.every(
        (k) =>
          ['PDP', 'MK', 'ENGAGEMENT'].includes(k.sumber) &&
          ['kognitif', 'afektif'].includes(k.ranah) &&
          ['resmi', 'draft'].includes(k.status) &&
          (k.sumber !== 'MK' || Boolean(k.jenis)),
      ),
    ),
  )
  cek(
    'kurikulum yang terpasang di proses ini sama dengan isi basis data',
    JSON.stringify(KOMPONEN.map((k) => k.id)) === JSON.stringify(kur?.komponen.map((k) => k.id)),
  )

  // Indikator sementara dan dua timpaan pengaturan; begitu versi naik, pintu API berikutnya harus memakainya.
  const ambangAwal = CONFIG.AMBANG_SERTIFIKAT
  konfigurasiAsli = Object.fromEntries(
    await Promise.all(KONFIGURASI_UJI.map(async (kunci) => [kunci, await db.konfigurasi.findUnique({ where: { kunci } })])),
  )
  await db.indikator.create({
    data: { id: IND_UJI, aspekId: 'A1', label: 'Indikator uji ' + SUF, ranah: 'afektif', sumber: ['bukti uji'], urutan: 999 },
  })
  for (const [kunci, nilai] of [['AMBANG_SERTIFIKAT', 75], ['TOTAL_SEMESTER_PROGRAM', 9]]) {
    await db.konfigurasi.upsert({ where: { kunci }, update: { nilai }, create: { kunci, nilai } })
  }
  await naikkanVersi()
  await admin('/api/data')
  cek('pintu API memuat ulang kurikulum begitu versinya naik', getIndikator('A1').some((x) => x.id === IND_UJI && x.sumber[0] === 'bukti uji'))
  cek('pengaturan dari tabel Konfigurasi menimpa CONFIG', CONFIG.AMBANG_SERTIFIKAT === 75, String(CONFIG.AMBANG_SERTIFIKAT))
  cek('kunci di luar daftar yang boleh diubah diabaikan', CONFIG.TOTAL_SEMESTER_PROGRAM === 3, String(CONFIG.TOTAL_SEMESTER_PROGRAM))
  const master = await ambilMaster()
  cek(
    'data master untuk halaman membawa kurikulum yang sama',
    Boolean(master.kurikulum?.indikator.some((x) => x.id === IND_UJI)) && master.kurikulum.konfigurasi.AMBANG_SERTIFIKAT === 75,
  )

  await pulihkanKurikulum()
  await admin('/api/data')
  cek(
    'setelah dikembalikan: indikator uji hilang, ambang kembali seperti semula',
    !getIndikator('A1').some((x) => x.id === IND_UJI) && CONFIG.AMBANG_SERTIFIKAT === ambangAwal,
    String(CONFIG.AMBANG_SERTIFIKAT),
  )

  // Tanpa isi (basis data belum di-seed atau gagal dibaca), kurikulum dan CONFIG kembali ke bawaan kode.
  isiKurikulum({})
  cek(
    'tanpa isi dari basis data, bawaan kode yang dipakai',
    JSON.stringify(KOMPONEN) === JSON.stringify(KOMPONEN_BAWAAN) && CONFIG.AMBANG_SERTIFIKAT === 70,
  )
  isiKurikulum(kur)

  /* ------------------------------ keluar ------------------------------ */
  garis('12. KELUAR')
  await mhs('/api/keluar', { metode: 'POST' })
  cek('setelah keluar, sesi tidak berlaku', (await mhs('/api/sesi')).status === 401)
} catch (e) {
  gagal++
  console.log('GAGAL tak terduga: ' + (e?.stack ?? e))
} finally {
  await bersihkan()
  const sisa = await db.mahasiswa.count({ where: { nim: NIM } })
  console.log('\nData uji dibersihkan: ' + (sisa === 0 ? 'ya' : 'TIDAK — ' + sisa + ' sisa'))
  await db.$disconnect()
}

console.log(gagal ? '\n' + gagal + ' pemeriksaan gagal' : '\nSemua pemeriksaan lulus')
process.exitCode = gagal ? 1 : 0
