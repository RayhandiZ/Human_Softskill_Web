import { useState } from 'react'
import { Badge, Card, CardHeader, CatatanKaki, EmptyState, JudulHalaman, SearchInput, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconCalendar, IconBuilding, IconCheck, IconClock, IconEye, IconGrid, IconLock, IconPencil, IconPlus, IconUsers } from '../../components/Icons'
import { COHORTS, FACULTIES, PERIODE_AKTIF, PROGRAMS, STUDENTS, getAngkatan, labelPeriode } from '../../lib/data'
import {
  ALASAN_AKSES_MIN,
  PERMINTAAN,
  SANDI_AWAL_MIN,
  mintaAksesMaster,
  simpanAngkatan,
  simpanKelas,
  simpanMahasiswa,
  simpanProdi,
  useStore,
} from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { padananKamus, useTeks } from '../../lib/bahasa'

/* Data Master: angkatan, fakultas, program studi, kelas (sejak 12 Nov 2026), dan mahasiswa. Sejak rapat 24 Okt 2026
   data master dipegang penuh super admin: hanya ia yang menambah dan mengubahnya (pintu /api/master/* ['superadmin'],
   src/server/dataMaster.js).
   Admin yang diberi izin di Akses Pengguna melihatnya tanpa tombol ubah (`bacaSaja`); admin tanpa izin melihat kartu
   untuk meminta akses baca (permintaan AKSES_DATA_MASTER). Tidak ada hapus. Lihat README.md › Data master. */

const TAB = [
  { value: 'angkatan', label: 'Angkatan' },
  { value: 'prodi', label: 'Fakultas & Prodi' },
  { value: 'kelas', label: 'Kelas' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
]
const JENJANG = ['S1', 'D3']
const BATAS_DAFTAR = 20
const CATATAN_INGGRIS = 'Tampil saat bahasa EN dipilih. Bila dikosongkan, terjemahan bawaan yang dipakai; bila belum ada, teks Indonesianya yang tampil.'
const CATATAN_FAKULTAS = 'Tulis nama fakultasnya saja, tanpa kata "Faculty of". ' + CATATAN_INGGRIS

export default function DataMaster() {
  useStore()
  const t = useTeks()
  const { user } = useAuth()
  const [tab, setTab] = useState('angkatan')
  const [pesan, setPesan] = useState('')

  if (!user?.superAdmin && !user?.kelolaMaster) return <MintaAkses />

  const bacaSaja = !user?.superAdmin
  const Bagian = { angkatan: BagianAngkatan, prodi: BagianProdi, kelas: BagianKelas, mahasiswa: BagianMahasiswa }[tab]

  return (
    <div className="space-y-6">
      <JudulHalaman
        judul={t('Data Master')}
        keterangan={t(
          bacaSaja
            ? 'Lihat angkatan, fakultas, program studi, dan data mahasiswa untuk mencocokkan ulang. Hanya Super Admin yang menambah dan mengubah data master.'
            : 'Tambah dan ubah angkatan, fakultas, program studi, dan data mahasiswa. Setiap perubahan tercatat di Log Aktivitas beserta alasannya.',
        )}
      />

      <Tabs
        label={t('Jenis data master')}
        value={tab}
        onChange={(v) => {
          setTab(v)
          setPesan('')
        }}
        items={TAB.map((x) => ({ value: x.value, label: t(x.label) }))}
      />

      <p role="status" className={pesan ? 'teks-baik flex items-center gap-2 text-[13.5px] font-semibold' : 'sr-only'}>
        {pesan ? <IconCheck size={16} className="shrink-0" /> : null}
        {pesan}
      </p>

      <Bagian onBerhasil={setPesan} bacaSaja={bacaSaja} />

      <CatatanKaki>
        {t(
          bacaSaja
            ? 'Anda hanya bisa melihat data master. Bila ada data yang perlu diperbaiki, sampaikan ke Super Admin.'
            : 'Menghapus data master tidak bisa dari sini. NIM tidak bisa diubah karena riwayat usulan nilai dosen menyambung lewat NIM; bila NIM salah, minta Super Admin menghapus akunnya selama belum punya data, lalu tambahkan lagi.',
        )}
      </CatatanKaki>
    </div>
  )
}

/* ------------------------------ minta akses baca ----------------------------- */

/* Admin tanpa izin: satu kartu untuk meminta akses baca ke super admin, atau keadaan permintaannya bila sudah ada. Izin
   yang disetujui baru terbaca sesudah halaman dimuat ulang, karena peran dan izin dibaca dari sesi saat masuk. */
function MintaAkses() {
  const t = useTeks()
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const menunggu = PERMINTAAN.find((p) => p.aksi === 'AKSES_DATA_MASTER' && p.milikSaya && p.status === 'menunggu')
  const disetujui = PERMINTAAN.find((p) => p.aksi === 'AKSES_DATA_MASTER' && p.milikSaya && p.status === 'disetujui')

  async function kirim(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      await mintaAksesMaster({ alasan })
      setAlasan('')
    } catch (err) {
      setGalat(t(err.message))
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="space-y-6">
      <JudulHalaman
        judul={t('Data Master')}
        keterangan={t('Data master dipegang Super Admin. Untuk mencocokkan ulang data, Anda bisa meminta akses baca.')}
      />
      <Card className="overflow-hidden">
        <CardHeader
          icon={IconEye}
          title={t('Minta akses baca data master')}
          subtitle={t('Akses ini hanya untuk melihat angkatan, fakultas, program studi, dan data mahasiswa, tanpa bisa mengubahnya.')}
        />
        <div className="space-y-4 px-5 py-5 sm:px-6">
          {/* Permintaan yang pernah disetujui bisa berarti halaman belum dimuat ulang, atau izinnya sudah dicabut lagi;
              layar tidak bisa membedakannya, jadi keduanya disebut dan formulirnya tetap ada. */}
          {disetujui && !menunggu ? (
            <p className="flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-2">
              <IconCheck size={16} className="mt-0.5 shrink-0" />
              {t('Permintaan {id} pernah disetujui. Bila Data Master belum terbuka, muat ulang halaman ini; bila izinnya sudah dicabut Super Admin, ajukan lagi.', { id: disetujui.id })}
            </p>
          ) : null}
          {menunggu ? (
            <p role="status" className="flex items-start gap-2 text-[14px] text-ink">
              <IconClock size={17} className="mt-px shrink-0 text-ink-2" />
              <span>
                <strong className="font-bold">{t('Permintaan {id} menunggu Super Admin.', { id: menunggu.id })}</strong>{' '}
                {t('Anda akan bisa melihat Data Master setelah permintaan ini disetujui.')}
              </span>
            </p>
          ) : (
            <form onSubmit={kirim} className="max-w-xl space-y-3">
              <label className="block">
                <span className="mb-1.5 block label">{t('Keperluan')}</span>
                <input
                  className="field !py-2.5"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder={t('Wajib, minimal {n} karakter', { n: ALASAN_AKSES_MIN })}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={sibuk || alasan.trim().length < ALASAN_AKSES_MIN}>
                <IconEye size={16} />
                {t('Minta akses baca')}
              </button>
              <Galat pesan={galat} />
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------- angkatan -------------------------------- */

function BagianAngkatan({ onBerhasil, bacaSaja }) {
  const t = useTeks()
  const [tambah, setTambah] = useState(false)
  const [ubah, setUbah] = useState(null)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconCalendar}
        title={t('Angkatan')}
        subtitle={t('Semester setiap mahasiswa dihitung dari periode masuk angkatannya, jadi periode itu tidak bisa diubah.')}
        action={
          tambah || bacaSaja ? null : (
            <button type="button" className="btn-primary" onClick={() => setTambah(true)}>
              <IconPlus size={16} />
              {t('Tambah angkatan')}
            </button>
          )
        }
      />
      {tambah ? (
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <FormAngkatan
            onBatal={() => setTambah(false)}
            onSelesai={(label) => {
              setTambah(false)
              onBerhasil(t('Angkatan {label} sudah ditambahkan.', { label }))
            }}
          />
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {COHORTS.map((c) => {
          const terkunci = c.status === 'terkunci'
          const jumlah = STUDENTS.filter((s) => s.angkatanId === c.id).length
          return (
            <li key={c.id} className="px-5 py-3.5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-bold text-ink">{t(c.label)}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-2">
                    {t('Kode {id}', { id: c.id })} · {t('Masuk {periode}', { periode: labelPeriode(c.intake) })} ·{' '}
                    {t('{n} mahasiswa', { n: jumlah })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {terkunci ? (
                    <Badge tone="neutral" icon={IconLock}>
                      {t('Disahkan')}
                    </Badge>
                  ) : bacaSaja ? null : (
                    <button
                      type="button"
                      className="btn-ghost !px-3 !py-2 text-[13px]"
                      aria-expanded={ubah === c.id}
                      onClick={() => setUbah(ubah === c.id ? null : c.id)}
                    >
                      <IconPencil size={15} />
                      {t('Ubah label')}
                    </button>
                  )}
                </div>
              </div>
              {ubah === c.id ? (
                <FormUbah
                  awal={{ label: c.label, labelEn: c.labelEn ?? '' }}
                  kolom={[
                    { kunci: 'label', label: t('Label angkatan') },
                    { kunci: 'labelEn', label: t('Label angkatan (Inggris)'), contohDari: 'label' },
                  ]}
                  catatan={t(CATATAN_INGGRIS)}
                  simpan={(isi) => simpanAngkatan({ aksi: 'ubah', id: c.id, ...isi })}
                  onBatal={() => setUbah(null)}
                  onSelesai={() => {
                    setUbah(null)
                    onBerhasil(t('Angkatan {label} sudah diubah.', { label: c.label }))
                  }}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function FormAngkatan({ onBatal, onSelesai }) {
  const t = useTeks()
  // Paling jauh satu tahun di depan periode aktif, sama dengan batas di server.
  const batasAtas = Number(String(PERIODE_AKTIF.tahun).slice(0, 4)) + 1
  const pilihanTahun = Array.from({ length: 8 }, (_, i) => String(batasAtas - i))
  const [tahun, setTahun] = useState(pilihanTahun[0])
  const [semester, setSemester] = useState('Ganjil')
  const { sibuk, galat, jalankan } = useKirim()

  const genap = semester === 'Genap'
  const id = tahun + (genap ? 'B' : '')
  const label = genap ? tahun + ' Genap' : tahun
  const periode = semester + ' ' + tahun + '/' + (Number(tahun) + 1)
  const sudahAda = Boolean(getAngkatan(id))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        jalankan(() => simpanAngkatan({ aksi: 'tambah', tahun: Number(tahun), semester }), () => onSelesai(label))
      }}
      className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label={t('Tahun masuk')} value={tahun} onChange={setTahun} options={pilihanTahun} />
        <Select
          label={t('Semester masuk')}
          value={semester}
          onChange={setSemester}
          options={['Ganjil', 'Genap']}
          tampilkan={(s) => t(s)}
        />
      </div>
      <p className={'text-[13px] ' + (sudahAda ? 'teks-kritis font-semibold' : 'text-ink-2')}>
        {sudahAda
          ? t('Angkatan {label} sudah ada.', { label })
          : t('Akan dibuat: {label} (kode {id}), masuk {periode}.', { label, id, periode })}
      </p>
      <TombolForm sibuk={sibuk} nonaktif={sudahAda} label={t('Simpan angkatan')} onBatal={onBatal} />
      <Galat pesan={galat} />
    </form>
  )
}

/* ---------------------------- fakultas dan prodi ---------------------------- */

function BagianProdi({ onBerhasil, bacaSaja }) {
  const t = useTeks()
  const [tambah, setTambah] = useState(null) // 'fakultas' | 'prodi' | null
  const [ubah, setUbah] = useState(null) // 'fakultas:<nama>' | 'prodi:<nama>' | null
  const fakultas = FACULTIES.map((f) => f.name)

  const tombolTambah = (jenis, label) =>
    tambah === jenis || bacaSaja ? null : (
      <button type="button" className="btn-primary" onClick={() => setTambah(jenis)}>
        <IconPlus size={16} />
        {label}
      </button>
    )

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader icon={IconBuilding} title={t('Fakultas')} action={tombolTambah('fakultas', t('Tambah fakultas'))} />
        {tambah === 'fakultas' ? (
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <FormUbah
              awal={{ nama: '', namaEn: '' }}
              kolom={[
                { kunci: 'nama', label: t('Nama fakultas') },
                { kunci: 'namaEn', label: t('Nama fakultas (Inggris)'), contohDari: 'nama' },
              ]}
              catatan={t(CATATAN_FAKULTAS)}
              tanpaAlasan
              tombol={t('Simpan fakultas')}
              simpan={(isi) => simpanProdi({ jenis: 'fakultas', aksi: 'tambah', ...isi })}
              onBatal={() => setTambah(null)}
              onSelesai={(isi) => {
                setTambah(null)
                onBerhasil(t('Fakultas {nama} sudah ditambahkan.', { nama: isi.nama }))
              }}
            />
          </div>
        ) : null}
        <ul className="divide-y divide-line">
          {FACULTIES.map((f) => (
            <li key={f.name} className="px-5 py-3.5 sm:px-6">
              <BarisUbah
                judul={t(f.name)}
                rincian={t('{n} program studi', { n: f.programs.length })}
                terbuka={ubah === 'fakultas:' + f.name}
                onToggle={bacaSaja ? null : () => setUbah(ubah === 'fakultas:' + f.name ? null : 'fakultas:' + f.name)}
              />
              {ubah === 'fakultas:' + f.name ? (
                <FormUbah
                  awal={{ namaBaru: f.name, namaEn: f.namaEn ?? '' }}
                  kolom={[
                    { kunci: 'namaBaru', label: t('Nama fakultas') },
                    { kunci: 'namaEn', label: t('Nama fakultas (Inggris)'), contohDari: 'namaBaru' },
                  ]}
                  catatan={t(CATATAN_FAKULTAS)}
                  simpan={(isi) => simpanProdi({ jenis: 'fakultas', aksi: 'ubah', nama: f.name, ...isi })}
                  onBatal={() => setUbah(null)}
                  onSelesai={() => {
                    setUbah(null)
                    onBerhasil(t('Fakultas {nama} sudah diubah.', { nama: f.name }))
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          icon={IconBuilding}
          title={t('Program studi')}
          subtitle={t('Mahasiswa dan dosen tersambung ke prodi lewat basis data, jadi nama baru langsung terpakai di semua halaman.')}
          action={tombolTambah('prodi', t('Tambah program studi'))}
        />
        {tambah === 'prodi' ? (
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <FormUbah
              awal={{ nama: '', namaEn: '', jenjang: 'S1', fakultas: '' }}
              kolom={[
                { kunci: 'nama', label: t('Nama program studi') },
                { kunci: 'namaEn', label: t('Nama program studi (Inggris)'), contohDari: 'nama' },
                { kunci: 'jenjang', label: t('Jenjang'), pilihan: JENJANG },
                { kunci: 'fakultas', label: t('Fakultas'), pilihan: fakultas, tampilkan: (x) => t(x), kosong: t('Pilih fakultas') },
              ]}
              catatan={t(CATATAN_INGGRIS)}
              tanpaAlasan
              tombol={t('Simpan program studi')}
              simpan={(isi) => simpanProdi({ jenis: 'prodi', aksi: 'tambah', ...isi })}
              onBatal={() => setTambah(null)}
              onSelesai={(isi) => {
                setTambah(null)
                onBerhasil(t('Program studi {nama} sudah ditambahkan.', { nama: isi.nama }))
              }}
            />
          </div>
        ) : null}
        <ul className="divide-y divide-line">
          {PROGRAMS.map((p) => (
            <li key={p.program} className="px-5 py-3.5 sm:px-6">
              <BarisUbah
                judul={t(p.program)}
                rincian={p.jenjang + ' · ' + t(p.faculty)}
                terbuka={ubah === 'prodi:' + p.program}
                onToggle={bacaSaja ? null : () => setUbah(ubah === 'prodi:' + p.program ? null : 'prodi:' + p.program)}
              />
              {ubah === 'prodi:' + p.program ? (
                <FormUbah
                  awal={{ namaBaru: p.program, namaEn: p.namaEn ?? '', jenjang: p.jenjang, fakultas: p.faculty }}
                  kolom={[
                    { kunci: 'namaBaru', label: t('Nama program studi') },
                    { kunci: 'namaEn', label: t('Nama program studi (Inggris)'), contohDari: 'namaBaru' },
                    { kunci: 'jenjang', label: t('Jenjang'), pilihan: JENJANG },
                    { kunci: 'fakultas', label: t('Fakultas'), pilihan: fakultas, tampilkan: (x) => t(x) },
                  ]}
                  catatan={t(CATATAN_INGGRIS)}
                  simpan={(isi) => simpanProdi({ jenis: 'prodi', aksi: 'ubah', nama: p.program, ...isi })}
                  onBatal={() => setUbah(null)}
                  onSelesai={() => {
                    setUbah(null)
                    onBerhasil(t('Program studi {nama} sudah diubah.', { nama: p.program }))
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

/* ---------------------------------- kelas ---------------------------------- */

/* Kelas di dalam setiap prodi (sejak 12 Nov 2026), mis. Sistem Informasi Kelas A. Satu baris per prodi beserta kelasnya
   dan jumlah anggotanya; Ubah mengganti nama satu kelas, dan Atur mahasiswa (sejak 13 Nov 2026) memasukkan mahasiswa
   prodi itu ke kelas, banyak sekaligus. Nama disimpan tanpa kata "Kelas" dan unik di dalam prodinya (kelolaKelas di
   src/server/dataMaster.js). Dosen yang mengampu kelas itu (Akses Pengguna › Ubah kelas) melihat anggotanya. */
const tanpaAwalanKelas = (nama) => String(nama ?? '').trim().replace(/^kelas(\s+|$)/i, '').trim()
const anggotaKelas = (prodi, nama) => STUDENTS.filter((s) => s.program === prodi && (s.kelas ?? null) === nama)

function BagianKelas({ onBerhasil, bacaSaja }) {
  const t = useTeks()
  const [tambah, setTambah] = useState(false)
  // Formulir yang terbuka di satu baris prodi: ganti nama kelas ('ubah') atau atur anggota ('anggota').
  const [buka, setBuka] = useState(null) // { jenis: 'ubah' | 'anggota', prodi } | null
  const prodi = PROGRAMS.map((p) => p.program)
  const sebut = (nama) => t('Kelas {nama}', { nama })
  const jumlah = PROGRAMS.reduce((n, p) => n + p.kelas.length, 0)
  const terbuka = (jenis, p) => buka?.jenis === jenis && buka.prodi === p
  const alih = (jenis, p) => setBuka(terbuka(jenis, p) ? null : { jenis, prodi: p })

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconGrid}
        title={t('Kelas')}
        subtitle={t('{n} kelas di {p} program studi. Nama kelas unik di dalam prodinya. Dosen yang mengampu sebuah kelas melihat mahasiswa anggotanya.', {
          n: jumlah,
          p: PROGRAMS.length,
        })}
        action={
          tambah || bacaSaja ? null : (
            <button type="button" className="btn-primary" onClick={() => setTambah(true)}>
              <IconPlus size={16} />
              {t('Tambah kelas')}
            </button>
          )
        }
      />
      {tambah ? (
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <FormUbah
            awal={{ prodi: '', nama: '' }}
            kolom={[
              { kunci: 'prodi', label: t('Program studi'), pilihan: prodi, tampilkan: (x) => t(x), kosong: t('Pilih program studi') },
              { kunci: 'nama', label: t('Nama kelas'), placeholder: t('Misalnya C'), maxLength: 30 },
            ]}
            catatan={t('Tulis namanya saja, tanpa kata "Kelas": C tampil sebagai Kelas C.')}
            tanpaAlasan
            tombol={t('Simpan kelas')}
            simpan={(isi) => simpanKelas({ aksi: 'tambah', ...isi })}
            onBatal={() => setTambah(false)}
            onSelesai={(isi) => {
              setTambah(false)
              onBerhasil(t('Kelas {kelas} sudah ditambahkan ke {prodi}.', { kelas: tanpaAwalanKelas(isi.nama), prodi: t(isi.prodi) }))
            }}
          />
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {PROGRAMS.map((p) => {
          const tanpaKelas = anggotaKelas(p.program, null).length
          const rincian = p.kelas.length
            ? [
                ...p.kelas.map((nama) => t('Kelas {nama}: {n} mahasiswa', { nama, n: anggotaKelas(p.program, nama).length })),
                tanpaKelas ? t('{n} belum punya kelas', { n: tanpaKelas }) : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : t('Belum ada kelas')
          return (
            <li key={p.program} className="px-5 py-3.5 sm:px-6">
              <BarisUbah
                judul={t(p.program)}
                rincian={rincian}
                terbuka={terbuka('ubah', p.program)}
                // Prodi tanpa kelas tidak punya yang bisa diubah; kelasnya ditambahkan lewat Tambah kelas.
                onToggle={bacaSaja || !p.kelas.length ? null : () => alih('ubah', p.program)}
                aksi={
                  bacaSaja || !p.kelas.length ? null : (
                    <button
                      type="button"
                      className="btn-ghost !px-3 !py-2 text-[13px]"
                      aria-expanded={terbuka('anggota', p.program)}
                      onClick={() => alih('anggota', p.program)}
                    >
                      <IconUsers size={15} />
                      {t('Atur mahasiswa')}
                    </button>
                  )
                }
              />
              {terbuka('ubah', p.program) ? (
                <FormUbah
                  awal={{ nama: p.kelas[0], namaBaru: '' }}
                  kolom={[
                    { kunci: 'nama', label: t('Kelas'), pilihan: p.kelas, tampilkan: sebut },
                    { kunci: 'namaBaru', label: t('Nama baru kelas'), placeholder: t('Misalnya C'), maxLength: 30 },
                  ]}
                  simpan={(isi) => simpanKelas({ aksi: 'ubah', prodi: p.program, ...isi })}
                  onBatal={() => setBuka(null)}
                  onSelesai={(isi) => {
                    setBuka(null)
                    onBerhasil(t('Kelas {kelas} di {prodi} sudah diubah.', { kelas: isi.nama, prodi: t(p.program) }))
                  }}
                />
              ) : null}
              {terbuka('anggota', p.program) ? (
                <PanelAnggotaKelas
                  // Dipasang ulang per prodi, supaya pilihan mahasiswa prodi lain tidak terbawa.
                  key={p.program}
                  p={p}
                  onBatal={() => setBuka(null)}
                  onSelesai={(pesan) => {
                    setBuka(null)
                    onBerhasil(pesan)
                  }}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/**
 * Memasukkan mahasiswa satu prodi ke kelasnya (aturAnggotaKelas di src/server/dataMaster.js): saring menurut angkatan,
 * kelas sekarang, atau nama/NIM, centang mahasiswanya (atau semua yang tampil), pilih kelas tujuannya atau "Keluarkan
 * dari kelas", lalu simpan dengan alasan. Pilihan dikosongkan setiap saringan berubah, supaya yang disimpan selalu yang
 * terlihat. Nilai mahasiswa tidak berubah; yang berubah hanya dosen yang melihatnya.
 */
function PanelAnggotaKelas({ p, onBatal, onSelesai }) {
  const t = useTeks()
  const [angkatan, setAngkatan] = useState('Semua')
  const [saring, setSaring] = useState('semua') // 'semua' | 'tanpa' | nama kelas
  const [cari, setCari] = useState('')
  const [pilih, setPilih] = useState([]) // NIM
  const [tujuan, setTujuan] = useState(p.kelas[0] ?? '') // nama kelas; '' = keluarkan dari kelas
  const [alasan, setAlasan] = useState('')
  const { sibuk, galat, jalankan } = useKirim()

  const sebut = (nama) => t('Kelas {nama}', { nama })
  const mhsProdi = STUDENTS.filter((s) => s.program === p.program)
  const angkatanAda = COHORTS.filter((c) => mhsProdi.some((s) => s.angkatanId === c.id)).map((c) => c.id)
  const kata = cari.trim().toLowerCase()
  const tampil = mhsProdi
    .filter(
      (s) =>
        (angkatan === 'Semua' || s.angkatanId === angkatan) &&
        (saring === 'semua' || (saring === 'tanpa' ? !s.kelas : s.kelas === saring)) &&
        (!kata || s.nim.includes(kata) || s.name.toLowerCase().includes(kata)),
    )
    .sort((a, b) => a.nim.localeCompare(b.nim))
  const semuaTerpilih = tampil.length > 0 && tampil.every((s) => pilih.includes(s.nim))
  // Saringan baru mengosongkan pilihan: yang disimpan hanya mahasiswa yang sedang terlihat dan dicentang.
  const gantiSaring = (atur) => (nilai) => {
    atur(nilai)
    setPilih([])
  }
  const centang = (nim) => setPilih((x) => (x.includes(nim) ? x.filter((y) => y !== nim) : [...x, nim]))

  function kirim(e) {
    e.preventDefault()
    const jumlahPilih = pilih.length
    jalankan(
      () => simpanKelas({ aksi: 'anggota', prodi: p.program, kelas: tujuan, nim: pilih, alasan: alasan.trim() }),
      (hasil) =>
        onSelesai(
          !hasil?.jumlah
            ? t('{n} mahasiswa terpilih sudah berada di sana; tidak ada yang berubah.', { n: jumlahPilih })
            : tujuan
              ? t('{n} mahasiswa dimasukkan ke {kelas} di {prodi}.', { n: hasil.jumlah, kelas: sebut(tujuan), prodi: t(p.program) })
              : t('{n} mahasiswa dikeluarkan dari kelasnya di {prodi}.', { n: hasil.jumlah, prodi: t(p.program) }),
        ),
    )
  }

  return (
    <form onSubmit={kirim} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <p className="text-[13px] leading-relaxed text-ink">
        {t('Centang mahasiswa {prodi} yang akan dimasukkan ke satu kelas. Dosen yang mengampu kelas itu langsung melihat mereka; nilainya tidak berubah.', {
          prodi: t(p.program),
        })}
      </p>
      <div className="flex flex-wrap items-end gap-2.5">
        <Select
          label={t('Angkatan')}
          value={angkatan}
          onChange={gantiSaring(setAngkatan)}
          options={['Semua', ...angkatanAda]}
          tampilkan={(id) => (id === 'Semua' ? t('Semua angkatan') : t(getAngkatan(id)?.label ?? id))}
          className="w-[180px]"
        />
        <Select
          label={t('Kelas sekarang')}
          value={saring}
          onChange={gantiSaring(setSaring)}
          options={['semua', 'tanpa', ...p.kelas]}
          tampilkan={(x) => (x === 'semua' ? t('Semua') : x === 'tanpa' ? t('Belum punya kelas') : sebut(x))}
          className="w-[190px]"
        />
        <SearchInput
          label={t('Cari mahasiswa')}
          placeholder={t('Cari nama atau NIM')}
          value={cari}
          onChange={gantiSaring(setCari)}
          className="min-w-[200px] flex-1"
        />
      </div>

      {tampil.length ? (
        <fieldset>
          <legend className="sr-only">{t('Mahasiswa {prodi}', { prodi: t(p.program) })}</legend>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 border-b border-line px-1 text-[13.5px] font-bold text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand-ink)]"
              checked={semuaTerpilih}
              onChange={() => setPilih(semuaTerpilih ? [] : tampil.map((s) => s.nim))}
            />
            {t('Pilih semua yang tampil ({n})', { n: tampil.length })}
          </label>
          <ul className="max-h-[360px] overflow-y-auto">
            {tampil.map((s) => (
              <li key={s.nim}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 border-b border-line px-1 py-1.5 text-[13.5px] text-ink last:border-b-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[var(--brand-ink)]"
                    checked={pilih.includes(s.nim)}
                    onChange={() => centang(s.nim)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-ink-2">
                      {' · NIM ' + s.nim + ' · ' + t('Angkatan {label}', { label: s.angkatanLabel })}
                    </span>
                  </span>
                  <span className={'shrink-0 text-[12.5px] ' + (s.kelas ? 'font-semibold text-ink' : 'text-ink-2')}>
                    {s.kelas ? sebut(s.kelas) : t('Belum punya kelas')}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : (
        <p className="text-[13px] text-ink-2">
          {t(mhsProdi.length ? 'Tidak ada mahasiswa yang cocok.' : 'Belum ada mahasiswa di program studi ini.')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={t('Masukkan ke')}
          value={tujuan}
          onChange={setTujuan}
          options={[...p.kelas, '']}
          tampilkan={(nama) => (nama ? sebut(nama) : t('Keluarkan dari kelas'))}
        />
        <label className="block">
          <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_AKSES_MIN })}</span>
          <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </label>
      </div>
      <p className="text-[13px] text-ink-2">{t('{n} mahasiswa dipilih.', { n: pilih.length })}</p>
      <TombolForm
        sibuk={sibuk}
        nonaktif={!pilih.length || alasan.trim().length < ALASAN_AKSES_MIN}
        label={t('Simpan pembagian kelas')}
        onBatal={onBatal}
      />
      <Galat pesan={galat} />
    </form>
  )
}

/* -------------------------------- mahasiswa -------------------------------- */

function BagianMahasiswa({ onBerhasil, bacaSaja }) {
  const t = useTeks()
  const [tambah, setTambah] = useState(false)
  const [ubah, setUbah] = useState(null)
  const [cari, setCari] = useState('')
  const prodi = PROGRAMS.map((p) => p.program)
  // Angkatan terkunci tidak menerima mahasiswa baru maupun pindahan; server menolaknya juga.
  const angkatanTerbuka = COHORTS.filter((c) => c.status !== 'terkunci').map((c) => c.id)
  const labelAngkatan = (id) => t(getAngkatan(id)?.label ?? id)
  // Kelas di prodi yang sedang dipilih, didahului '' (tanpa kelas); kelasnya ikut kosong saat prodinya diganti.
  const kolomKelas = {
    kunci: 'kelas',
    label: t('Kelas'),
    pilihan: (isi) => ['', ...(PROGRAMS.find((p) => p.program === isi.prodi)?.kelas ?? [])],
    tampilkan: (nama) => (nama ? t('Kelas {nama}', { nama }) : t('Tanpa kelas')),
    ikut: 'prodi',
  }

  const kata = cari.trim().toLowerCase()
  const cocok = STUDENTS.filter((s) => !kata || s.nim.includes(kata) || s.name.toLowerCase().includes(kata))
  const tampil = cocok.slice(0, BATAS_DAFTAR)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconUsers}
        title={t('Mahasiswa')}
        subtitle={t('Prodi dan angkatan hanya bisa diubah selama mahasiswanya belum punya nilai, pengumpulan, atau usulan nilai. Kelas di prodinya bisa dipindah kapan saja.')}
        action={
          tambah || bacaSaja ? null : (
            <button type="button" className="btn-primary" onClick={() => setTambah(true)}>
              <IconPlus size={16} />
              {t('Tambah mahasiswa')}
            </button>
          )
        }
      />
      {tambah ? (
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <FormUbah
            // Prodi dan angkatan dimulai kosong supaya harus dipilih, bukan terisi pilihan pertama diam-diam. Kelas boleh
            // tetap kosong: mahasiswanya bisa dimasukkan ke kelas kemudian di tab Kelas.
            awal={{ email: '', sandi: '', nama: '', nim: '', prodi: '', angkatanId: '', kelas: '' }}
            kolom={[
              { kunci: 'email', label: t('Email'), type: 'email' },
              { kunci: 'sandi', label: t('Sandi awal (minimal {n} karakter)', { n: SANDI_AWAL_MIN }), autoComplete: 'new-password' },
              { kunci: 'nama', label: t('Nama lengkap') },
              { kunci: 'nim', label: 'NIM', inputMode: 'numeric' },
              { kunci: 'prodi', label: t('Program studi'), pilihan: prodi, tampilkan: (x) => t(x), kosong: t('Pilih program studi') },
              { kunci: 'angkatanId', label: t('Angkatan'), pilihan: angkatanTerbuka, tampilkan: labelAngkatan, kosong: t('Pilih angkatan') },
              kolomKelas,
            ]}
            tanpaAlasan
            tombol={t('Simpan mahasiswa')}
            simpan={(isi) => simpanMahasiswa({ aksi: 'tambah', ...isi })}
            onBatal={() => setTambah(false)}
            onSelesai={(isi) => {
              setTambah(false)
              onBerhasil(t('Mahasiswa {nama} sudah ditambahkan dan bisa masuk dengan sandi awalnya.', { nama: isi.nama }))
            }}
          />
        </div>
      ) : null}

      <div className="border-b border-line px-5 py-3.5 sm:px-6">
        <SearchInput label={t('Cari mahasiswa')} placeholder={t('Cari nama atau NIM')} value={cari} onChange={setCari} />
      </div>

      {tampil.length ? (
        <ul className="divide-y divide-line">
          {tampil.map((s) => {
            const adaNilai = Object.keys(s.nilai ?? {}).length > 0
            const terkunci = s.statusAngkatan === 'terkunci'
            return (
              <li key={s.nim} className="px-5 py-3.5 sm:px-6">
                <BarisUbah
                  judul={s.name}
                  rincian={[
                    'NIM ' + s.nim,
                    s.email,
                    t(s.program),
                    s.kelas ? t('Kelas {nama}', { nama: s.kelas }) : null,
                    t('Angkatan {label}', { label: s.angkatanLabel }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  terbuka={ubah === s.nim}
                  onToggle={bacaSaja ? null : () => setUbah(ubah === s.nim ? null : s.nim)}
                />
                {ubah === s.nim ? (
                  <FormUbah
                    awal={{ nama: s.name, email: s.email ?? '', prodi: s.program, angkatanId: s.angkatanId, kelas: s.kelas ?? '' }}
                    kolom={[
                      { kunci: 'nama', label: t('Nama lengkap') },
                      { kunci: 'email', label: t('Email'), type: 'email' },
                      // Mahasiswa yang sudah punya nilai atau angkatannya terkunci: prodi dan angkatan ditampilkan tetap.
                      adaNilai || terkunci
                        ? { kunci: 'prodi', label: t('Program studi'), tetap: true, tampilkan: (x) => t(x) }
                        : { kunci: 'prodi', label: t('Program studi'), pilihan: prodi, tampilkan: (x) => t(x) },
                      adaNilai || terkunci
                        ? { kunci: 'angkatanId', label: t('Angkatan'), tetap: true, tampilkan: labelAngkatan }
                        : {
                            kunci: 'angkatanId',
                            label: t('Angkatan'),
                            pilihan: angkatanTerbuka,
                            tampilkan: labelAngkatan,
                          },
                      // Kelas tetap bisa dipindah walau sudah punya nilai: nilainya tidak berubah.
                      kolomKelas,
                    ]}
                    catatan={
                      adaNilai
                        ? t('Mahasiswa ini sudah punya nilai, jadi prodi dan angkatannya tidak bisa diubah.')
                        : terkunci
                          ? t('Nilai angkatan mahasiswa ini sudah disahkan, jadi ia tidak bisa dipindah.')
                          : null
                    }
                    simpan={(isi) => simpanMahasiswa({ aksi: 'ubah', nim: s.nim, ...isi })}
                    onBatal={() => setUbah(null)}
                    onSelesai={() => {
                      setUbah(null)
                      onBerhasil(t('Data {nama} sudah diubah.', { nama: s.name }))
                    }}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title={t(STUDENTS.length ? 'Tidak ada mahasiswa yang cocok.' : 'Belum ada mahasiswa.')} />
      )}
      {cocok.length > tampil.length ? (
        <p className="border-t border-line px-5 py-3 text-[12.5px] text-ink-2 sm:px-6">
          {t('Menampilkan {n} dari {total}. Persempit pencarian untuk menemukan mahasiswa lain.', {
            n: tampil.length,
            total: cocok.length,
          })}
        </p>
      ) : null}
    </Card>
  )
}

/* ------------------------------ bagian bersama ------------------------------ */

/**
 * Pemanggil simpan: { sibuk, galat, jalankan(kerja, sesudah) }; `sesudah` menerima jawaban server. Galat dari server
 * ditampilkan apa adanya.
 */
function useKirim() {
  const t = useTeks()
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  async function jalankan(kerja, sesudah) {
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      sesudah(await kerja())
    } catch (e) {
      setGalat(t(e.message))
    } finally {
      setSibuk(false)
    }
  }
  return { sibuk, galat, jalankan }
}

/* `onToggle` null (mode baca) berarti baris tanpa tombol Ubah. `aksi`: tombol lain di depan tombol Ubah. */
function BarisUbah({ judul, rincian, terbuka, onToggle, aksi = null }) {
  const t = useTeks()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="break-words text-[14.5px] font-bold text-ink">{judul}</p>
        {rincian ? <p className="mt-0.5 break-words text-[12.5px] text-ink-2">{rincian}</p> : null}
      </div>
      {aksi || onToggle ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {aksi}
          {onToggle ? (
            <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" aria-expanded={terbuka} onClick={onToggle}>
              <IconPencil size={15} />
              {t('Ubah')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Formulir isian yang dipakai semua bagian. `kolom`: [{ kunci, label, pilihan?, tampilkan?, tetap?, ikut?, type?, ... }];
 * `pilihan` membuat Select (larik, atau fungsi dari isian bila pilihannya bergantung pada kolom lain), `tetap` hanya
 * menampilkan nilainya, dan `ikut` menyebut kolom yang bila diganti ikut mengosongkan kolom ini (kelas ikut prodi).
 * Kecuali `tanpaAlasan` (tambah), alasan wajib diisi dan ikut dikirim. `simpan(isi)` memanggil store; `onSelesai(isi)`
 * dipanggil sesudah server menerimanya.
 */
function FormUbah({ awal, kolom, simpan, onBatal, onSelesai, tanpaAlasan = false, tombol, catatan = null }) {
  const t = useTeks()
  const [isian, setIsian] = useState(awal)
  const [alasan, setAlasan] = useState('')
  const { sibuk, galat, jalankan } = useKirim()
  const pasang = (kunci) => (nilai) =>
    setIsian((x) => {
      const baru = { ...x, [kunci]: nilai }
      if (x[kunci] !== nilai) for (const k of kolom) if (k.ikut === kunci) baru[k.kunci] = ''
      return baru
    })
  const kurangAlasan = !tanpaAlasan && alasan.trim().length < ALASAN_AKSES_MIN
  // Pilihan yang dimulai kosong (`kosong`) harus dipilih dulu sebelum bisa disimpan.
  const kurangPilihan = kolom.some((k) => k.kosong && !k.tetap && !isian[k.kunci])

  function kirim(e) {
    e.preventDefault()
    // Kolom `tetap` tidak dikirim: server mempertahankan nilai lamanya.
    const isi = Object.fromEntries(kolom.filter((k) => !k.tetap).map((k) => [k.kunci, isian[k.kunci]]))
    jalankan(() => simpan(tanpaAlasan ? isi : { ...isi, alasan: alasan.trim() }), () => onSelesai(isi))
  }

  return (
    <form onSubmit={kirim} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {kolom.map(({ kunci, label, pilihan, tampilkan, tetap, kosong, contohDari, ikut, ...sisa }) =>
          tetap ? (
            <div key={kunci}>
              <span className="mb-1.5 block label">{label}</span>
              <p className="flex items-center gap-1.5 py-2.5 text-[14px] font-semibold text-ink">
                <IconLock size={14} className="shrink-0 text-ink-3" />
                {tampilkan ? tampilkan(isian[kunci]) : isian[kunci]}
              </p>
            </div>
          ) : pilihan ? (
            <Select
              key={kunci}
              label={label}
              value={isian[kunci]}
              onChange={pasang(kunci)}
              options={typeof pilihan === 'function' ? pilihan(isian) : pilihan}
              tampilkan={tampilkan}
              kosong={kosong}
            />
          ) : (
            <label key={kunci} className="block">
              <span className="mb-1.5 block label">{label}</span>
              <input
                className="field !py-2.5"
                value={isian[kunci]}
                // Kolom bahasa Inggris: contohnya terjemahan bawaan yang berlaku selama kolomnya kosong.
                placeholder={contohDari ? (padananKamus(isian[contohDari]) ?? t('Nama dalam bahasa Inggris')) : undefined}
                onChange={(e) => pasang(kunci)(e.target.value)}
                {...sisa}
              />
            </label>
          ),
        )}
      </div>
      {catatan ? <p className="text-[13px] text-ink-2">{catatan}</p> : null}
      {tanpaAlasan ? null : (
        <label className="block max-w-xl">
          <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_AKSES_MIN })}</span>
          <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </label>
      )}
      <TombolForm sibuk={sibuk} nonaktif={kurangAlasan || kurangPilihan} label={tombol ?? t('Simpan perubahan')} onBatal={onBatal} />
      <Galat pesan={galat} />
    </form>
  )
}

function TombolForm({ sibuk, nonaktif, label, onBatal }) {
  const t = useTeks()
  return (
    <div className="flex flex-wrap gap-2.5">
      <button type="submit" className="btn-primary" disabled={sibuk || nonaktif}>
        <IconCheck size={16} />
        {label}
      </button>
      <button type="button" className="btn-ghost" disabled={sibuk} onClick={onBatal}>
        {t('Batal')}
      </button>
    </div>
  )
}

function Galat({ pesan }) {
  if (!pesan) return null
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
    >
      <IconAlert size={16} className="mt-px shrink-0" />
      {pesan}
    </p>
  )
}
