import { Fragment, useEffect, useState } from 'react'
import { Badge, Card, EmptyState, GulirTabel, JUDUL_KOLOM, JudulHalaman, Paginasi, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconChevronDown, IconInfo, IconSearch } from '../../components/Icons'
import { bacaLog } from '../../lib/store'
import { getAspek, getKomponenById } from '../../lib/curriculum'
import { LABEL_SERTIFIKAT } from '../../lib/duaLapis'
import { useTeks } from '../../lib/bahasa'
import { LABEL_AKSI } from './PersetujuanAdmin'

/* Jejak setiap tindakan dan perubahan nilai dari /api/log (src/server/log.js), satu halaman per permintaan.
   Hanya dibaca; dipakai panel Kemahasiswaan dan panel Super Admin. Lihat README.md › Log Aktivitas.
   Susunannya mengikuti halaman daftar lain: kepala halaman, lalu satu kartu berisi jenis catatan, alat saring
   ringkas (label di dalam kotak), tabel, dan kaki bernomor halaman. Setiap baris menjawab siapa (nama, peran, dan
   email: semua akun admin bernama "Biro Kemahasiswaan"), apa (tindakan, sasaran, dan ringkasan perubahannya), dan
   kapan. Rinciannya dibuka per baris sebagai tabel sebelum dan sesudah, bukan JSON mentah. */

export const LABEL_LOG = {
  KUNCI_ANGKATAN: 'Sahkan nilai angkatan',
  UBAH_DATA_TERKUNCI: 'Ubah data yang sudah final',
  ROLLBACK_DATA_TERKUNCI: 'Batalkan perubahan data yang sudah final',
  UBAH_PENGUNCIAN: 'Ubah tanda final/sementara',
  UBAH_BOBOT: 'Ubah bobot',
  AJUKAN_PERSETUJUAN: 'Ajukan persetujuan',
  PUTUSKAN_PERSETUJUAN: 'Putuskan persetujuan',
  TARIK_PERMINTAAN: 'Tarik permintaan',
  UBAH_PENILAIAN: 'Ubah penilaian aspek',
  // Dicatat /api/akses/ubah setelah dibuat di back-end; lihat README.md › Panel Super Admin › Akses Pengguna.
  UBAH_AKSES: 'Ubah akses akun',
  UBAH_PERIODE: 'Ubah periode akademik',
  TAMBAH_AKUN: 'Tambah akun',
  UBAH_AKUN: 'Ubah akun',
  HAPUS_AKUN: 'Hapus akun',
  // Izin kelola data master (src/server/akses.js) dan perubahan data master (src/server/dataMaster.js).
  UBAH_IZIN: 'Ubah izin data master',
  TAMBAH_ANGKATAN: 'Tambah angkatan',
  UBAH_ANGKATAN: 'Ubah angkatan',
  TAMBAH_FAKULTAS: 'Tambah fakultas',
  UBAH_FAKULTAS: 'Ubah fakultas',
  TAMBAH_PRODI: 'Tambah program studi',
  UBAH_PRODI: 'Ubah program studi',
  // Aspek CPMK itu sendiri (src/server/aspek.js).
  TAMBAH_ASPEK: 'Tambah aspek',
  UBAH_ASPEK: 'Ubah struktur aspek',
  ARSIPKAN_ASPEK: 'Arsipkan aspek',
  PULIHKAN_ASPEK: 'Pulihkan aspek',
  // Persetujuan dua lapis (rapat 24 Okt 2026): admin meneruskan, super admin menyetujui.
  TERUSKAN_KOREKSI: 'Teruskan pengajuan ubah nilai',
  SETUJUI_KOREKSI: 'Setujui dan terapkan ubah nilai',
  TOLAK_KOREKSI: 'Tolak pengajuan ubah nilai',
  SETUJUI_SERTIFIKAT: 'Setujui akses cetak sertifikat',
  TOLAK_SERTIFIKAT: 'Tolak akses cetak sertifikat',
  CABUT_SERTIFIKAT: 'Cabut akses cetak sertifikat',
  UBAH_KELAS_DOSEN: 'Ubah kelas dosen',
  CETAK_SERTIFIKAT: 'Buka sertifikat untuk dicetak',
  // Batch nilai tanpa data terkunci (src/server/nilai.js), usulan dosen yang lama, dan tindakan mahasiswa atau
  // pemilik akun sendiri.
  SIMPAN_NILAI: 'Simpan nilai',
  BATALKAN_BATCH: 'Batalkan batch nilai',
  SETUJUI_USULAN: 'Setujui usulan nilai dosen',
  TOLAK_USULAN: 'Tolak usulan nilai dosen',
  AJUKAN_KOREKSI: 'Ajukan koreksi nilai',
  MINTA_SERTIFIKAT: 'Minta akses cetak sertifikat',
  UBAH_PROFIL: 'Ubah profil',
}

/* Sasaran log ditulis server sebagai teks Indonesia jadi ('akun x@umn.ac.id', 'penguncian (2 mahasiswa)'; lihat
   catatLog di src/server). Polanya sedikit dan tetap, jadi diterjemahkan di sini menurut awalannya; yang tidak
   dikenali tampil apa adanya. 'penguncian' ditampilkan sebagai tanda final, istilah yang dipakai layar sejak
   rapat 24 Okt 2026. */
const POLA_SASARAN = [
  [/^penguncian \((\d+) mahasiswa\)$/, (m, t) => t('tanda final ({n} mahasiswa)', { n: m[1] })],
  [/^aspek (\S+) \(kurikulum versi (\S+)\)$/, (m, t) => t('aspek {kode} (kurikulum versi {v})', { kode: m[1], v: m[2] })],
  [/^kurikulum versi (\S+)$/, (m, t) => t('kurikulum versi {v}', { v: m[1] })],
  [/^periode (Ganjil|Genap) (\S+)$/, (m, t) => t('periode {nama}', { nama: t(m[1]) + ' ' + m[2] })],
  [/^akun (.+)$/, (m, t) => t('akun {nama}', { nama: m[1] })],
  [/^angkatan (.+)$/, (m, t) => t('angkatan {nama}', { nama: m[1] })],
  [/^batch (.+)$/, (m, t) => t('batch {nama}', { nama: m[1] })],
  [/^fakultas (.+)$/, (m, t) => t('fakultas {nama}', { nama: m[1] })],
  [/^prodi (.+)$/, (m, t) => t('prodi {nama}', { nama: m[1] })],
  [/^mahasiswa (\S+)$/, (m, t) => t('mahasiswa {nim}', { nim: m[1] })],
  [/^permintaan (P-\d+)$/, (m, t) => t('permintaan {id}', { id: m[1] })],
  [/^usulan (U-\d+)$/, (m, t) => t('usulan {id}', { id: m[1] })],
]

export function labelSasaran(sasaran, t) {
  for (const [pola, susun] of POLA_SASARAN) {
    const m = String(sasaran).match(pola)
    if (m) return susun(m, t)
  }
  return sasaran
}

/* Peran pelaku (nilai basis data dari src/server/log.js) dan nilai `peran` di rincian akun (src/server/akses.js). */
const LABEL_PERAN = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  DOSEN: 'Dosen',
  MAHASISWA: 'Mahasiswa',
  superadmin: 'Super Admin',
  admin: 'Admin',
  dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
}

/* Asal nilai satu batch (Batch.cara), juga sebutan `cara` di rincian log data terkunci. */
const LABEL_CARA = {
  manual: 'input manual',
  import: 'import CSV',
  'import-mentah': 'import CSV',
  koreksi: 'pengajuan koreksi',
  'unggah-dosen': 'unggahan dosen',
  'perbaikan dosen': 'perbaikan nilai dosen',
  'persetujuan usulan': 'persetujuan usulan dosen',
}

const NAMA_SUMBER = { PDP: 'PDP', MK: 'MK Humaniora', ENGAGEMENT: 'Kemahasiswaan' }
const LABEL_KEPUTUSAN = { disetujui: 'Disetujui', ditolak: 'Ditolak', gagal: 'Gagal dijalankan' }
const LABEL_TANDA = { FINAL: 'Final', SEMENTARA: 'Sementara' }

/* Arti ya/tidak pada sebelum dan sesudah yang berupa benar-salah, per jenis tindakan: [salah, benar]. */
const BENAR_SALAH = {
  UBAH_AKSES: ['Dicabut', 'Aktif'],
  UBAH_IZIN: ['Tidak ada', 'Diberi'],
}

/* Nama isian rincian (src/server/*) dalam bahasa layar. Yang tidak terdaftar tampil dengan huruf kecil apa adanya. */
const LABEL_RINCIAN = {
  alasan: 'Alasan',
  catatan: 'Catatan',
  galat: 'Pesan galat',
  email: 'Email',
  peran: 'Peran',
  nama: 'Nama',
  nim: 'NIM',
  nip: 'NIP',
  prodi: 'Program studi',
  fakultas: 'Fakultas',
  jenjang: 'Jenjang',
  angkatan: 'Angkatan',
  angkatanDiampu: 'Angkatan yang diampu',
  label: 'Label',
  id: 'Kode',
  kode: 'Kode',
  periode: 'Periode',
  tahun: 'Tahun',
  semester: 'Semester',
  semesterKalender: 'Semester kalender',
  sumber: 'Sumber',
  cara: 'Cara masuk nilai',
  batch: 'Batch',
  batchId: 'Batch',
  jumlah: 'Jumlah',
  jumlahNilai: 'Jumlah nilai',
  jumlahMahasiswa: 'Jumlah mahasiswa',
  mahasiswa: 'Mahasiswa',
  baris: 'Baris data terkunci',
  komponen: 'Komponen',
  nilaiLama: 'Nilai lama',
  nilaiBaru: 'Nilai baru',
  nilaiUsulan: 'Nilai usulan',
  nilaiDiharapkan: 'Nilai yang diharapkan',
  nilaiSaatIni: 'Nilai saat diajukan',
  nilaiAkhir: 'Nilai akhir',
  pengajuan: 'Pengajuan',
  permintaan: 'Permintaan',
  usulan: 'Usulan',
  usulanId: 'Usulan',
  dosen: 'Dosen',
  pengaju: 'Pengaju',
  lapis: 'Lapis',
  status: 'Status',
  keputusan: 'Keputusan',
  aksi: 'Tindakan',
  judul: 'Judul',
  dampak: 'Dampak',
  contoh: 'Contoh',
  aspek: 'Aspek',
  aspekId: 'Aspek',
  cluster: 'Cluster',
  aktif: 'Aktif',
  kelolaMaster: 'Izin lihat data master',
  ditambah: 'Ditambah',
  diubah: 'Diubah',
  diarsipkan: 'Diarsipkan',
  dipulihkan: 'Dipulihkan',
  bobot: 'Bobot',
  pengaturan: 'Pengaturan',
  kunci: 'Pengaturan',
  izin: 'Izin',
  dari: 'Dari',
  ke: 'Ke',
  dariFinal: 'Dicabut dari final',
  total: 'Jumlah mahasiswa',
  berhak: 'Berhak sertifikat',
  tidakBerhak: 'Belum berhak sertifikat',
  komponenKosong: 'Komponen kosong',
  berubah: 'Nilai berubah',
  jadiBelumLengkap: 'Menjadi belum lengkap',
  tidakLagiLayak: 'Tidak lagi berhak sertifikat',
  angkatanTerkunci: 'Angkatan disahkan',
  dilewati: 'Dilewati (nilai sama)',
  diajukan: 'Diajukan ke Super Admin',
  jumlahDiajukan: 'Jumlah diajukan',
  ditolakSistem: 'Ditolak sistem',
  dibuatOleh: 'Batch dibuat oleh',
  dibuatPada: 'Batch dibuat pada',
  foto: 'Foto profil',
  versi: 'Versi kurikulum',
  jumlahCetak: 'Sudah dibuka untuk dicetak',
  cetakTerakhir: 'Terakhir dibuka untuk dicetak',
  deskripsi: 'Deskripsi',
}

const UKURAN = 25
const KOSONG = { aktorId: '', aksi: '', nim: '', dari: '', sampai: '' }
const BATAS_TABEL = 20 // contoh di rincian log paling banyak 20 baris (BATAS_CONTOH di src/server/nilai.js)

/** Tanggal TTTT-BB-HH menurut WIB, `mundur` hari sebelum hari ini; zona yang sama dengan log di server. */
export function tanggalWib(mundur = 0) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() - mundur * 86400000))
}

/* --------------------------- membaca rincian log --------------------------- */

const adalahObjek = (v) => v != null && typeof v === 'object' && !Array.isArray(v)
const punyaSebelumSesudah = (v) => adalahObjek(v) && 'sebelum' in v && 'sesudah' in v
const sama = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
// Hanya nama isian bergaya camelCase yang dipecah; kunci seperti ID komponen ('A1-MK-UTS') ditulis apa adanya.
const kunciTerbaca = (k) => (/^[a-z][a-zA-Z]*$/.test(k) ? k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() : k)
const labelKunci = (k, t) => (LABEL_RINCIAN[k] ? t(LABEL_RINCIAN[k]) : kunciTerbaca(k))
const potong = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const kodeAspek = (a) => a.kode.replace(/\.$/, '') + ' ' + a.nama

/** Isian yang berbeda antara dua objek; dua nilai biasa dianggap satu isian tanpa nama. */
const isianBerubah = (a, b) =>
  [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((k) => !sama(a?.[k], b?.[k]))

/**
 * Satu nilai rincian sebagai teks pendek, dipakai di sel tabel dan ringkasan baris. `kunci` menentukan cara
 * membacanya (sumber, cara, peran, komponen, dan seterusnya); `aksi` menentukan arti ya/tidak.
 */
function teksNilai(v, t, { kunci = null, aksi = null } = {}) {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') {
    const arti = BENAR_SALAH[aksi]
    return t(arti ? arti[v ? 1 : 0] : v ? 'Ya' : 'Tidak')
  }
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.length ? v.map((x) => teksNilai(x, t, { kunci, aksi })).join(', ') : '—'
  if (adalahObjek(v)) {
    if (punyaSebelumSesudah(v)) return teksNilai(v.sebelum, t, { kunci, aksi }) + ' → ' + teksNilai(v.sesudah, t, { kunci, aksi })
    // Angkatan yang diampu dan sejenisnya ({ id, label }) cukup ditulis labelnya.
    if (typeof v.label === 'string') return v.label
    return Object.entries(v)
      .map(([k, x]) => labelKunci(k, t) + ': ' + teksNilai(x, t, { kunci: k, aksi }))
      .join('; ')
  }
  const s = String(v)
  const dari = (peta) => (peta[s] ? t(peta[s]) : s)
  if (kunci === 'peran') return dari(LABEL_PERAN)
  if (kunci === 'sumber') return dari(NAMA_SUMBER)
  if (kunci === 'cara') return dari(LABEL_CARA)
  if (kunci === 'keputusan') return dari(LABEL_KEPUTUSAN)
  if (kunci === 'dari' || kunci === 'ke') return dari(LABEL_TANDA)
  if (kunci === 'aksi') return LABEL_AKSI[s] || LABEL_LOG[s] ? t(LABEL_AKSI[s] ?? LABEL_LOG[s]) : s
  if (kunci === 'status') return LABEL_SERTIFIKAT[s.toLowerCase()] ? t(LABEL_SERTIFIKAT[s.toLowerCase()]) : s
  if (kunci === 'komponen') {
    const k = getKomponenById(s)
    return k ? k.label + ' (' + s + ')' : s
  }
  if (kunci === 'aspekId' || kunci === 'aspek') {
    const a = getAspek(s)
    return a ? kodeAspek(a) : s
  }
  return s
}

/** Sebelum → sesudah. Objek dibandingkan per isian: yang berubah ditebalkan, yang sama dibiarkan pudar. */
function TabelPerubahan({ sebelum, sesudah, aksi }) {
  const t = useTeks()
  const perIsian = adalahObjek(sebelum) || adalahObjek(sesudah)
  const baris = perIsian
    ? [...new Set([...Object.keys(sebelum ?? {}), ...Object.keys(sesudah ?? {})])].map((k) => [k, sebelum?.[k], sesudah?.[k]])
    : [[null, sebelum, sesudah]]
  return (
    <table className="w-full max-w-2xl border-separate border-spacing-0 text-left text-[13px]">
      <thead>
        <tr className="text-[12px] text-ink-3 [&>th]:pb-1.5 [&>th]:pr-4 [&>th]:font-semibold">
          {perIsian ? <th scope="col">{t('Isian')}</th> : null}
          <th scope="col">{t('Sebelum')}</th>
          <th scope="col">{t('Sesudah')}</th>
        </tr>
      </thead>
      <tbody>
        {baris.map(([k, a, b]) => {
          const berubah = !sama(a, b)
          return (
            <tr
              key={k ?? '-'}
              className={'align-top [&>*]:border-t [&>*]:border-line [&>*]:py-1.5 [&>*]:pr-4 ' + (berubah ? 'text-ink' : 'text-ink-3')}
            >
              {perIsian ? (
                <th scope="row" className="whitespace-nowrap text-[12.5px] font-semibold">
                  {labelKunci(k, t)}
                </th>
              ) : null}
              <td className="break-words">{teksNilai(a, t, { kunci: k, aksi })}</td>
              <td className={'break-words' + (berubah ? ' font-semibold' : '')}>{teksNilai(b, t, { kunci: k, aksi })}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Larik objek (contoh, bobot per aspek, komponen yang diubah) sebagai tabel; sebelum/sesudah hanya isian yang berubah. */
function TabelDaftar({ daftar, aksi }) {
  const t = useTeks()
  const tampil = daftar.slice(0, BATAS_TABEL)
  const ss = tampil.every(punyaSebelumSesudah)
  const kolom = [...new Set(tampil.flatMap((x) => Object.keys(x)))].filter((k) => !ss || (k !== 'sebelum' && k !== 'sesudah'))
  /** Bila sebelum dan sesudah sama-sama objek, yang ditulis hanya isian yang berubah. */
  const ringkasSS = (x) => {
    if (!adalahObjek(x.sebelum) || !adalahObjek(x.sesudah)) return [x.sebelum, x.sesudah]
    const beda = isianBerubah(x.sebelum, x.sesudah)
    if (!beda.length) return [x.sebelum, x.sesudah]
    const pilih = (o) => Object.fromEntries(beda.map((k) => [k, o[k] ?? null]))
    return [pilih(x.sebelum), pilih(x.sesudah)]
  }
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left text-[12.5px]">
        <thead>
          <tr className="text-[12px] text-ink-3 [&>th]:pb-1.5 [&>th]:pr-4 [&>th]:font-semibold">
            {kolom.map((k) => (
              <th key={k} scope="col" className="whitespace-nowrap">
                {labelKunci(k, t)}
              </th>
            ))}
            {ss ? (
              <>
                <th scope="col">{t('Sebelum')}</th>
                <th scope="col">{t('Sesudah')}</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody className="text-ink-2">
          {tampil.map((x, i) => {
            const [a, b] = ss ? ringkasSS(x) : []
            return (
              <tr key={i} className="align-top [&>td]:border-t [&>td]:border-line [&>td]:py-1.5 [&>td]:pr-4">
                {kolom.map((k) => (
                  <td key={k} className="break-words">
                    {teksNilai(x[k], t, { kunci: k, aksi })}
                  </td>
                ))}
                {ss ? (
                  <>
                    <td className="break-words">{teksNilai(a, t, { aksi })}</td>
                    <td className="break-words font-semibold text-ink">{teksNilai(b, t, { aksi })}</td>
                  </>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
      {daftar.length > tampil.length ? (
        <p className="mt-1.5 text-[12px] text-ink-3">{t('dan {n} lainnya', { n: daftar.length - tampil.length })}</p>
      ) : null}
    </div>
  )
}

function IsiRincian({ v, kunci, aksi, dalam }) {
  const t = useTeks()
  if (Array.isArray(v) && v.length && v.every(adalahObjek)) return <TabelDaftar daftar={v} aksi={aksi} />
  if (punyaSebelumSesudah(v)) return <TabelPerubahan sebelum={v.sebelum} sesudah={v.sesudah} aksi={aksi} />
  if (adalahObjek(v)) {
    // Objek di dalam rincian (misalnya dampak) ditulis satu isian per baris; yang lebih dalam lagi diringkas.
    if (dalam) return <span>{teksNilai(v, t, { kunci, aksi })}</span>
    return (
      <ul className="space-y-0.5">
        {Object.entries(v).map(([k, x]) => (
          <li key={k}>
            <span className="text-ink-3">{labelKunci(k, t)}:</span>{' '}
            {adalahObjek(x) || (Array.isArray(x) && x.some(adalahObjek)) ? (
              <IsiRincian v={x} kunci={k} aksi={aksi} dalam />
            ) : (
              teksNilai(x, t, { kunci: k, aksi })
            )}
          </li>
        ))}
      </ul>
    )
  }
  return <span>{teksNilai(v, t, { kunci, aksi })}</span>
}

/** Rincian satu tindakan: sebelum/sesudah lebih dulu sebagai tabel perubahan, lalu alasan, lalu isian lainnya. */
export function Rincian({ rincian, aksi = null }) {
  const t = useTeks()
  if (!adalahObjek(rincian) || !Object.keys(rincian).length) {
    return <p className="text-[13px] text-ink-3">{t('Tidak ada rincian tambahan.')}</p>
  }
  const ss = punyaSebelumSesudah(rincian)
  const depan = ['alasan', 'catatan']
  const entri = Object.entries(rincian).filter(([k]) => !(ss && (k === 'sebelum' || k === 'sesudah')))
  const urut = [...entri.filter(([k]) => depan.includes(k)), ...entri.filter(([k]) => !depan.includes(k))]
  return (
    <dl className="grid gap-x-5 gap-y-2.5 sm:grid-cols-[170px_minmax(0,1fr)]">
      {ss ? (
        <>
          <dt className="text-[12.5px] font-semibold text-ink-3">{t('Perubahan')}</dt>
          <dd className="min-w-0">
            <TabelPerubahan sebelum={rincian.sebelum} sesudah={rincian.sesudah} aksi={aksi} />
          </dd>
        </>
      ) : null}
      {urut.map(([k, v]) => (
        <Fragment key={k}>
          <dt className="text-[12.5px] font-semibold text-ink-3">{labelKunci(k, t)}</dt>
          <dd className="min-w-0 break-words text-[13px] text-ink-2">
            <IsiRincian v={v} kunci={k} aksi={aksi} />
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}

/**
 * Sampai tiga baris ringkas di bawah sasaran: apa yang berubah (isian sebelum → sesudah, atau jumlah nilai) dan
 * alasannya, supaya log terbaca tanpa membuka Rincian.
 */
export function ringkasan(b, t) {
  const r = b.rincian
  if (!adalahObjek(r)) return []
  const baris = []
  const opsi = (kunci) => ({ kunci, aksi: b.aksi })
  if (punyaSebelumSesudah(r)) {
    if (adalahObjek(r.sebelum) || adalahObjek(r.sesudah)) {
      const beda = isianBerubah(r.sebelum, r.sesudah)
      for (const k of beda.slice(0, 2)) {
        baris.push(labelKunci(k, t) + ': ' + teksNilai(r.sebelum?.[k], t, opsi(k)) + ' → ' + teksNilai(r.sesudah?.[k], t, opsi(k)))
      }
      if (beda.length > 2) baris.push(t('dan {n} lainnya', { n: beda.length - 2 }))
    } else {
      baris.push(teksNilai(r.sebelum, t, opsi(null)) + ' → ' + teksNilai(r.sesudah, t, opsi(null)))
    }
  } else if ('nilaiLama' in r && 'nilaiBaru' in r) {
    baris.push(t('Nilai') + ': ' + teksNilai(r.nilaiLama, t) + ' → ' + teksNilai(r.nilaiBaru, t))
  }
  if (typeof r.jumlahNilai === 'number') {
    baris.push(
      [
        t('{n} nilai', { n: r.jumlahNilai }),
        r.sumber ? teksNilai(r.sumber, t, opsi('sumber')) : null,
        r.semester ? t('Semester {n}', { n: r.semester }) : null,
        r.cara ? teksNilai(r.cara, t, opsi('cara')) : null,
      ]
        .filter(Boolean)
        .join(' · '),
    )
  }
  if (Array.isArray(r.diubah) && r.diubah.length && r.diubah.every((x) => typeof x === 'string')) {
    baris.push(labelKunci('diubah', t) + ': ' + r.diubah.join(', '))
  }
  const alasan = typeof r.alasan === 'string' && r.alasan ? ['Alasan', r.alasan] : typeof r.catatan === 'string' && r.catatan ? ['Catatan', r.catatan] : null
  if (alasan) baris.push(t(alasan[0]) + ': ' + potong(alasan[1], 90))
  return baris.slice(0, 3)
}

/* ------------------------------- sel tabel -------------------------------- */

/** Siapa: nama, lalu peran dan email. Dua akun admin sama-sama bernama "Biro Kemahasiswaan"; emailnya yang membedakan. */
function SelPelaku({ b }) {
  const t = useTeks()
  const peran = LABEL_PERAN[b.aktorPeran]
  const keterangan = [peran && peran !== b.aktor ? t(peran) : null, b.aktorEmail].filter(Boolean).join(' · ')
  return (
    <td className="px-3 py-3">
      <span className="block text-[13.5px] font-semibold text-ink">{b.aktor ?? '—'}</span>
      {keterangan ? <span className="block break-all text-[12px] text-ink-3">{keterangan}</span> : null}
    </td>
  )
}

/** Komponen yang nilainya berubah: nama, aspek, asal nilai (cara dan batch), dan keterangan batch-nya. */
function SelKomponen({ b }) {
  const t = useTeks()
  // Tanpa basis data (uji) barisnya dari AUDIT_LOG yang termuat, tanpa label; dicari dari kurikulum yang terpasang.
  const komponen = b.komponenLabel ? null : getKomponenById(b.komponen)
  const label = b.komponenLabel ?? komponen?.label ?? b.komponen
  const aspek = b.aspekKode ? { kode: b.aspekKode, nama: b.aspekNama ?? '' } : getAspek(b.aspek ?? komponen?.aspekId)
  const sumber = b.sumber ?? komponen?.sumber
  const asal = [
    aspek ? kodeAspek(aspek) : null,
    sumber ? t(NAMA_SUMBER[sumber] ?? sumber) : null,
    b.semester ? t('Semester {n}', { n: b.semester }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <td className="px-3 py-3 text-[13px] text-ink-2">
      <span className="block text-[13.5px] text-ink" title={b.komponen}>
        {label}
      </span>
      {asal ? <span className="block text-[12px] text-ink-3">{asal}</span> : null}
      {b.cara || b.batchId || b.dibatalkan ? (
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
          {b.cara ? <span>{t(LABEL_CARA[b.cara] ?? b.cara)}</span> : null}
          {b.batchId ? <span className="tabular-nums">{b.batchId}</span> : null}
          {b.dibatalkan ? <Badge tone="neutral">{t('Batch dibatalkan')}</Badge> : null}
        </span>
      ) : null}
      {b.pembatalan ? (
        <span className="mt-0.5 block text-[12px] text-ink-3">
          {t('Dibatalkan {oleh} pada {waktu}', { oleh: b.pembatalan.oleh ?? '—', waktu: b.pembatalan.waktu ?? '—' })}
          {b.pembatalan.alasan ? '. ' + t('Alasan') + ': ' + b.pembatalan.alasan : ''}
        </span>
      ) : null}
      {b.alasan ? (
        <span className="mt-0.5 block text-[12px] text-ink-2">
          {t('Alasan')}: {b.alasan}
        </span>
      ) : null}
    </td>
  )
}

/* Kotak tanggal dengan label di dalamnya, serupa Select ringkas. min/max menjaga rentangnya: tanggal awal tidak
   bisa melewati tanggal akhir (dulu rentang terbalik hanya berakhir di "Tidak ada catatan"). */
function TanggalRingkas({ label, value, onChange, min, max }) {
  return (
    <label className="flex min-w-0 items-center rounded-xl border border-line bg-surface transition hover:border-line-strong focus-within:border-brand-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-ink">
      <span className="shrink-0 whitespace-nowrap pl-3.5 text-[12.5px] font-semibold text-ink-2">{label}</span>
      <input
        type="date"
        value={value}
        min={min || undefined}
        max={max || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent py-2.5 pl-2 pr-3 text-sm font-semibold text-ink focus-visible:outline-none"
      />
    </label>
  )
}

export default function Log() {
  const t = useTeks()
  const [jenis, setJenis] = useState('aktivitas')
  const [saring, setSaring] = useState(KOSONG)
  const [nimKetik, setNimKetik] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [hasil, setHasil] = useState(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState(null)
  const [terbuka, setTerbuka] = useState(null)

  useEffect(() => {
    let batal = false
    setMemuat(true)
    setGalat(null)
    const isi = { jenis, halaman, ukuran: UKURAN }
    for (const k of ['aktorId', 'dari', 'sampai']) if (saring[k]) isi[k] = saring[k]
    if (jenis === 'aktivitas' && saring.aksi) isi.aksi = saring.aksi
    if (jenis === 'nilai' && saring.nim) isi.nim = saring.nim
    bacaLog(isi)
      .then((h) => !batal && setHasil(h))
      .catch((e) => !batal && setGalat(e.message))
      .finally(() => !batal && setMemuat(false))
    return () => {
      batal = true
    }
  }, [jenis, halaman, saring])

  const ubah = (patch) => {
    setSaring((s) => ({ ...s, ...patch }))
    setHalaman(1)
    setTerbuka(null)
  }

  const gantiJenis = (j) => {
    setJenis(j)
    setSaring((s) => ({ ...s, aktorId: '', aksi: '', nim: '' }))
    setNimKetik('')
    setHalaman(1)
    setTerbuka(null)
  }

  const adaSaring = Object.values(saring).some(Boolean)
  const baris = hasil?.baris ?? []
  const aktor = hasil?.pilihanAktor ?? []
  // Nama yang dipakai lebih dari satu akun (semua admin bernama "Biro Kemahasiswaan") diberi emailnya di pilihan.
  const namaKembar = new Set(aktor.map((a) => a.nama).filter((n, i, semua) => semua.indexOf(n) !== i))
  const namaAktor = new Map(aktor.map((a) => [String(a.id), namaKembar.has(a.nama) && a.email ? a.nama + ' (' + a.email + ')' : a.nama]))
  const aksiPilihan = hasil?.pilihanAksi?.length ? hasil.pilihanAksi : Object.keys(LABEL_LOG)

  const hariIni = tanggalWib()
  const PRESET = [
    { label: 'Hari ini', dari: hariIni, sampai: hariIni },
    { label: '7 hari terakhir', dari: tanggalWib(6), sampai: hariIni },
    { label: 'Semua waktu', dari: '', sampai: '' },
  ]

  return (
    <div className="space-y-6">
      <JudulHalaman
        judul={t('Log Aktivitas')}
        keterangan={t(
          'Jejak setiap tindakan untuk menelusuri siapa mengubah apa dan kapan. Log hanya bisa dibaca, tidak bisa diubah atau dihapus dari website.',
        )}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <Tabs
            label={t('Jenis catatan')}
            value={jenis}
            onChange={gantiJenis}
            items={[
              { value: 'aktivitas', label: t('Aktivitas') },
              { value: 'nilai', label: t('Perubahan nilai') },
            ]}
          />
          <span className="text-[13px] font-semibold tabular-nums text-ink-2" role="status">
            {memuat ? t('Memuat…') : t('{n} catatan', { n: (hasil?.total ?? 0).toLocaleString('id-ID') })}
          </span>
        </div>

        <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
          {/* Empat kolom baru mulai 1440px: di bawahnya 'Jenis tindakan' dan nilainya tidak muat dalam seperempat lebar. */}
          <div className="grid gap-2.5 sm:grid-cols-2 min-[1440px]:grid-cols-4">
            <Select
              ringkas
              label={t('Pelaku')}
              value={saring.aktorId}
              onChange={(v) => ubah({ aktorId: v })}
              options={['', ...aktor.map((a) => String(a.id))]}
              tampilkan={(v) => (v ? (namaAktor.get(v) ?? v) : t('Semua pelaku'))}
            />
            {jenis === 'aktivitas' ? (
              <Select
                ringkas
                label={t('Jenis tindakan')}
                value={saring.aksi}
                onChange={(v) => ubah({ aksi: v })}
                options={['', ...aksiPilihan]}
                tampilkan={(v) => (v ? t(LABEL_LOG[v] ?? v) : t('Semua tindakan'))}
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  ubah({ nim: nimKetik.trim() })
                }}
              >
                <label className="relative block">
                  <span className="sr-only">{t('NIM mahasiswa')}</span>
                  <IconSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input
                    type="search"
                    inputMode="numeric"
                    value={nimKetik}
                    onChange={(e) => setNimKetik(e.target.value)}
                    onBlur={() => nimKetik.trim() !== saring.nim && ubah({ nim: nimKetik.trim() })}
                    placeholder={t('Cari NIM, lalu tekan Enter')}
                    className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-3 transition hover:border-line-strong"
                  />
                </label>
              </form>
            )}
            <TanggalRingkas label={t('Dari')} value={saring.dari} max={saring.sampai} onChange={(v) => ubah({ dari: v })} />
            <TanggalRingkas label={t('Sampai')} value={saring.sampai} min={saring.dari} onChange={(v) => ubah({ sampai: v })} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET.map((p) => {
              const aktif = saring.dari === p.dari && saring.sampai === p.sampai
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => ubah({ dari: p.dari, sampai: p.sampai })}
                  className={
                    'rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ' +
                    (aktif ? 'border-brand-ink bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink')
                  }
                >
                  {t(p.label)}
                </button>
              )
            })}
            {adaSaring ? (
              <button
                type="button"
                onClick={() => {
                  setNimKetik('')
                  ubah(KOSONG)
                }}
                className="ml-1 inline-flex min-h-[36px] items-center text-[13px] font-bold text-brand-ink underline-offset-4 hover:underline"
              >
                {t('Atur ulang filter')}
              </button>
            ) : null}
          </div>
        </div>

        {hasil?.lokal && jenis === 'aktivitas' ? (
          <p className="flex items-start gap-2 border-b border-line px-5 py-3 text-[13px] text-ink-2 sm:px-6">
            <IconInfo size={15} className="mt-0.5 shrink-0" />
            {t('Aktivitas hanya tercatat saat website terhubung ke basis data.')}
          </p>
        ) : null}

        {galat ? (
          <p role="alert" className="flex items-start gap-2 px-5 py-4 text-[13.5px] font-semibold text-[var(--critical)] sm:px-6">
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            {galat}
          </p>
        ) : !memuat && !baris.length ? (
          <EmptyState title={t('Tidak ada catatan')}>
            {adaSaring ? t('Coba longgarkan penyaringnya.') : t('Belum ada yang tercatat.')}
          </EmptyState>
        ) : (
          /* GulirTabel: dulu label sr-only "Rincian" lolos dari wadah ini dan melebarkan halaman HP ke 680px, juga di
             /super/log yang memakai halaman ini. */
          <GulirTabel>
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-surface-2 [&>th]:border-b [&>th]:border-line">
                  <th className={JUDUL_KOLOM + ' pl-4 sm:pl-5'}>{t('Waktu (WIB)')}</th>
                  <th className={JUDUL_KOLOM}>{t('Pelaku')}</th>
                  {jenis === 'aktivitas' ? (
                    <>
                      <th className={JUDUL_KOLOM}>{t('Tindakan')}</th>
                      <th className={JUDUL_KOLOM}>{t('Sasaran')}</th>
                      <th className={JUDUL_KOLOM + ' pr-4 sm:pr-5'}>
                        <span className="sr-only">{t('Rincian')}</span>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className={JUDUL_KOLOM}>{t('Mahasiswa')}</th>
                      <th className={JUDUL_KOLOM}>{t('Komponen')}</th>
                      <th className={JUDUL_KOLOM + ' pr-4 text-right sm:pr-5'}>{t('Lama → baru')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className={memuat ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                {baris.map((b) =>
                  jenis === 'aktivitas' ? (
                    <Fragment key={b.id}>
                      <tr className="align-top transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-line">
                        <td className="whitespace-nowrap py-3 pl-4 pr-3 text-[13px] tabular-nums text-ink-2 sm:pl-5">{b.waktu}</td>
                        <SelPelaku b={b} />
                        <td className="px-3 py-3 text-[13.5px] text-ink">{t(LABEL_LOG[b.aksi] ?? b.aksi)}</td>
                        <td className="px-3 py-3 text-[13px] text-ink-2">
                          {b.target ? labelSasaran(b.target, t) : '—'}
                          {ringkasan(b, t).map((r, i) => (
                            <span key={i} className="mt-0.5 block max-w-[420px] break-words text-[12.5px] text-ink-3">
                              {r}
                            </span>
                          ))}
                        </td>
                        <td className="py-2 pl-3 pr-4 text-right sm:pr-5">
                          <button
                            type="button"
                            onClick={() => setTerbuka((x) => (x === b.id ? null : b.id))}
                            aria-expanded={terbuka === b.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold text-brand-ink transition hover:bg-brand-soft"
                          >
                            {t('Rincian')}
                            <IconChevronDown size={15} className={'transition-transform ' + (terbuka === b.id ? 'rotate-180' : '')} />
                          </button>
                        </td>
                      </tr>
                      {terbuka === b.id ? (
                        <tr className="bg-surface-2 [&>td]:border-b [&>td]:border-line">
                          <td colSpan={5} className="animate-rise px-5 py-4 sm:px-6">
                            <Rincian rincian={b.rincian} aksi={b.aksi} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ) : (
                    <tr key={b.id} className="align-top transition-colors hover:bg-surface-2 [&>td]:border-b [&>td]:border-line">
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 text-[13px] tabular-nums text-ink-2 sm:pl-5">{b.waktu}</td>
                      <SelPelaku b={b} />
                      <td className="px-3 py-3 text-[13.5px] text-ink">
                        {b.nama || '—'}
                        <span className="block text-[12px] tabular-nums text-ink-3">{b.nim}</span>
                      </td>
                      <SelKomponen b={b} />
                      <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-[13.5px] tabular-nums sm:pr-5">
                        <span className="text-ink-3">{b.nilaiLama ?? '—'}</span>
                        <span className="px-1.5 text-ink-3" aria-hidden="true">→</span>
                        <span className="sr-only"> {t('menjadi')} </span>
                        <span className="font-bold text-ink">{b.nilaiBaru ?? '—'}</span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </GulirTabel>
        )}

        {hasil && baris.length ? (
          <Paginasi
            halaman={halaman}
            jumlahHalaman={Math.max(1, hasil.jumlahHalaman ?? 1)}
            total={hasil.total ?? baris.length}
            ukuran={UKURAN}
            onHalaman={setHalaman}
          />
        ) : null}
      </Card>
    </div>
  )
}
