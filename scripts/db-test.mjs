/* Uji sambungan basis data: setiap pintu API dijalankan sungguhan terhadap MySQL.

   Membuat satu akun mahasiswa sementara (NIM berawalan UJI) dan menghapus seluruh jejaknya di
   akhir, berhasil maupun gagal. Butuh MySQL menyala dan `npm run db:seed` sudah pernah dijalankan
   (memakai akun admin@umn.ac.id dan simon.petrus@lecturer.umn.ac.id dengan sandi umn12345). */

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

async function bersihkan() {
  const p = await db.pengguna.findUnique({ where: { email: EMAIL }, include: { mahasiswa: true } })
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

  /* ------------------------------ keluar ------------------------------ */
  garis('8. KELUAR')
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
