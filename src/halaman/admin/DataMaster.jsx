import { useState } from 'react'
import { Badge, Card, CardHeader, CatatanKaki, EmptyState, JudulHalaman, SearchInput, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconCalendar, IconBuilding, IconCheck, IconClock, IconEye, IconLock, IconPencil, IconPlus, IconUsers } from '../../components/Icons'
import { COHORTS, FACULTIES, PERIODE_AKTIF, PROGRAMS, STUDENTS, getAngkatan, labelPeriode } from '../../lib/data'
import {
  ALASAN_AKSES_MIN,
  PERMINTAAN,
  SANDI_AWAL_MIN,
  mintaAksesMaster,
  simpanAngkatan,
  simpanMahasiswa,
  simpanProdi,
  useStore,
} from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Data Master: angkatan, fakultas, program studi, dan mahasiswa. Sejak rapat 24 Okt 2026 data master dipegang penuh
   super admin: hanya ia yang menambah dan mengubahnya (pintu /api/master/* ['superadmin'], src/server/dataMaster.js).
   Admin yang diberi izin di Akses Pengguna melihatnya tanpa tombol ubah (`bacaSaja`); admin tanpa izin melihat kartu
   untuk meminta akses baca (permintaan AKSES_DATA_MASTER). Tidak ada hapus. Lihat README.md › Data master. */

const TAB = [
  { value: 'angkatan', label: 'Angkatan' },
  { value: 'prodi', label: 'Fakultas & Prodi' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
]
const JENJANG = ['S1', 'D3']
const BATAS_DAFTAR = 20

export default function DataMaster() {
  useStore()
  const t = useTeks()
  const { user } = useAuth()
  const [tab, setTab] = useState('angkatan')
  const [pesan, setPesan] = useState('')

  if (!user?.superAdmin && !user?.kelolaMaster) return <MintaAkses />

  const bacaSaja = !user?.superAdmin
  const Bagian = { angkatan: BagianAngkatan, prodi: BagianProdi, mahasiswa: BagianMahasiswa }[tab]

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
      setGalat(err.message)
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
                  <p className="text-[14.5px] font-bold text-ink">{c.label}</p>
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
                  awal={{ label: c.label }}
                  kolom={[{ kunci: 'label', label: t('Label angkatan') }]}
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
              awal={{ nama: '' }}
              kolom={[{ kunci: 'nama', label: t('Nama fakultas') }]}
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
                judul={f.name}
                rincian={t('{n} program studi', { n: f.programs.length })}
                terbuka={ubah === 'fakultas:' + f.name}
                onToggle={bacaSaja ? null : () => setUbah(ubah === 'fakultas:' + f.name ? null : 'fakultas:' + f.name)}
              />
              {ubah === 'fakultas:' + f.name ? (
                <FormUbah
                  awal={{ namaBaru: f.name }}
                  kolom={[{ kunci: 'namaBaru', label: t('Nama fakultas') }]}
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
              awal={{ nama: '', jenjang: 'S1', fakultas: '' }}
              kolom={[
                { kunci: 'nama', label: t('Nama program studi') },
                { kunci: 'jenjang', label: t('Jenjang'), pilihan: JENJANG },
                { kunci: 'fakultas', label: t('Fakultas'), pilihan: fakultas, kosong: t('Pilih fakultas') },
              ]}
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
                judul={p.program}
                rincian={p.jenjang + ' · ' + p.faculty}
                terbuka={ubah === 'prodi:' + p.program}
                onToggle={bacaSaja ? null : () => setUbah(ubah === 'prodi:' + p.program ? null : 'prodi:' + p.program)}
              />
              {ubah === 'prodi:' + p.program ? (
                <FormUbah
                  awal={{ namaBaru: p.program, jenjang: p.jenjang, fakultas: p.faculty }}
                  kolom={[
                    { kunci: 'namaBaru', label: t('Nama program studi') },
                    { kunci: 'jenjang', label: t('Jenjang'), pilihan: JENJANG },
                    { kunci: 'fakultas', label: t('Fakultas'), pilihan: fakultas },
                  ]}
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

/* -------------------------------- mahasiswa -------------------------------- */

function BagianMahasiswa({ onBerhasil, bacaSaja }) {
  const t = useTeks()
  const [tambah, setTambah] = useState(false)
  const [ubah, setUbah] = useState(null)
  const [cari, setCari] = useState('')
  const prodi = PROGRAMS.map((p) => p.program)
  // Angkatan terkunci tidak menerima mahasiswa baru maupun pindahan; server menolaknya juga.
  const angkatanTerbuka = COHORTS.filter((c) => c.status !== 'terkunci').map((c) => c.id)
  const labelAngkatan = (id) => getAngkatan(id)?.label ?? id

  const kata = cari.trim().toLowerCase()
  const cocok = STUDENTS.filter((s) => !kata || s.nim.includes(kata) || s.name.toLowerCase().includes(kata))
  const tampil = cocok.slice(0, BATAS_DAFTAR)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconUsers}
        title={t('Mahasiswa')}
        subtitle={t('Prodi dan angkatan hanya bisa diubah selama mahasiswanya belum punya nilai, pengumpulan, atau usulan nilai.')}
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
            // Prodi dan angkatan dimulai kosong supaya harus dipilih, bukan terisi pilihan pertama diam-diam.
            awal={{ email: '', sandi: '', nama: '', nim: '', prodi: '', angkatanId: '' }}
            kolom={[
              { kunci: 'email', label: t('Email'), type: 'email' },
              { kunci: 'sandi', label: t('Sandi awal (minimal {n} karakter)', { n: SANDI_AWAL_MIN }), autoComplete: 'new-password' },
              { kunci: 'nama', label: t('Nama lengkap') },
              { kunci: 'nim', label: 'NIM', inputMode: 'numeric' },
              { kunci: 'prodi', label: t('Program studi'), pilihan: prodi, kosong: t('Pilih program studi') },
              { kunci: 'angkatanId', label: t('Angkatan'), pilihan: angkatanTerbuka, tampilkan: labelAngkatan, kosong: t('Pilih angkatan') },
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
                  rincian={['NIM ' + s.nim, s.email, s.program, t('Angkatan {label}', { label: s.angkatanLabel })]
                    .filter(Boolean)
                    .join(' · ')}
                  terbuka={ubah === s.nim}
                  onToggle={bacaSaja ? null : () => setUbah(ubah === s.nim ? null : s.nim)}
                />
                {ubah === s.nim ? (
                  <FormUbah
                    awal={{ nama: s.name, email: s.email ?? '', prodi: s.program, angkatanId: s.angkatanId }}
                    kolom={[
                      { kunci: 'nama', label: t('Nama lengkap') },
                      { kunci: 'email', label: t('Email'), type: 'email' },
                      // Mahasiswa yang sudah punya nilai atau angkatannya terkunci: prodi dan angkatan ditampilkan tetap.
                      adaNilai || terkunci
                        ? { kunci: 'prodi', label: t('Program studi'), tetap: true }
                        : { kunci: 'prodi', label: t('Program studi'), pilihan: prodi },
                      adaNilai || terkunci
                        ? { kunci: 'angkatanId', label: t('Angkatan'), tetap: true, tampilkan: labelAngkatan }
                        : {
                            kunci: 'angkatanId',
                            label: t('Angkatan'),
                            pilihan: angkatanTerbuka,
                            tampilkan: labelAngkatan,
                          },
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

/** Pemanggil simpan: { sibuk, galat, jalankan(kerja, sesudah) }. Galat dari server ditampilkan apa adanya. */
function useKirim() {
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  async function jalankan(kerja, sesudah) {
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      await kerja()
      sesudah()
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }
  return { sibuk, galat, jalankan }
}

/* `onToggle` null (mode baca) berarti baris tanpa tombol Ubah. */
function BarisUbah({ judul, rincian, terbuka, onToggle }) {
  const t = useTeks()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="break-words text-[14.5px] font-bold text-ink">{judul}</p>
        {rincian ? <p className="mt-0.5 break-words text-[12.5px] text-ink-2">{rincian}</p> : null}
      </div>
      {onToggle ? (
        <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" aria-expanded={terbuka} onClick={onToggle}>
          <IconPencil size={15} />
          {t('Ubah')}
        </button>
      ) : null}
    </div>
  )
}

/**
 * Formulir isian yang dipakai semua bagian. `kolom`: [{ kunci, label, pilihan?, tampilkan?, tetap?, type?, ... }];
 * `pilihan` membuat Select, `tetap` hanya menampilkan nilainya. Kecuali `tanpaAlasan` (tambah), alasan wajib diisi
 * dan ikut dikirim. `simpan(isi)` memanggil store; `onSelesai(isi)` dipanggil sesudah server menerimanya.
 */
function FormUbah({ awal, kolom, simpan, onBatal, onSelesai, tanpaAlasan = false, tombol, catatan = null }) {
  const t = useTeks()
  const [isian, setIsian] = useState(awal)
  const [alasan, setAlasan] = useState('')
  const { sibuk, galat, jalankan } = useKirim()
  const pasang = (kunci) => (nilai) => setIsian((x) => ({ ...x, [kunci]: nilai }))
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
        {kolom.map(({ kunci, label, pilihan, tampilkan, tetap, kosong, ...sisa }) =>
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
              options={pilihan}
              tampilkan={tampilkan}
              kosong={kosong}
            />
          ) : (
            <label key={kunci} className="block">
              <span className="mb-1.5 block label">{label}</span>
              <input className="field !py-2.5" value={isian[kunci]} onChange={(e) => pasang(kunci)(e.target.value)} {...sisa} />
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
