import { useState } from 'react'
import { Badge, Card, CardHeader, CatatanKaki, EmptyState, JudulHalaman, SearchInput, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconCalendar, IconBuilding, IconCheck, IconLock, IconPencil, IconPlus, IconUsers } from '../../components/Icons'
import { COHORTS, FACULTIES, PERIODE_AKTIF, PROGRAMS, STUDENTS, getAngkatan, labelPeriode } from '../../lib/data'
import { ALASAN_AKSES_MIN, SANDI_AWAL_MIN, simpanAngkatan, simpanMahasiswa, simpanProdi, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Data Master: tambah dan ubah angkatan, fakultas, program studi, dan mahasiswa. Hanya untuk super admin dan admin
   yang diberi izin kelola data master di Akses Pengguna; pintu /api/master/* memeriksa izin itu lagi di server
   (src/server/dataMaster.js), jadi menyembunyikan menu saja bukan penjaganya. Tidak ada hapus. Lihat README.md ›
   Data master. */

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

  if (!user?.superAdmin && !user?.kelolaMaster) {
    return (
      <Card>
        <EmptyState title={t('Halaman ini butuh izin dari Super Admin')}>
          {t('Minta Super Admin memberi izin kelola data master di Akses Pengguna, lalu muat ulang halaman ini.')}
        </EmptyState>
      </Card>
    )
  }

  const Bagian = { angkatan: BagianAngkatan, prodi: BagianProdi, mahasiswa: BagianMahasiswa }[tab]

  return (
    <div className="space-y-6">
      <JudulHalaman
        judul={t('Data Master')}
        keterangan={t(
          'Tambah dan ubah angkatan, fakultas, program studi, dan data mahasiswa. Setiap perubahan tercatat di Log Aktivitas beserta alasannya.',
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

      <Bagian onBerhasil={setPesan} />

      <CatatanKaki>
        {t(
          'Menghapus data master tidak bisa dari sini. NIM tidak bisa diubah karena riwayat usulan nilai dosen menyambung lewat NIM; bila NIM salah, minta Super Admin menghapus akunnya selama belum punya data, lalu tambahkan lagi.',
        )}
      </CatatanKaki>
    </div>
  )
}

/* -------------------------------- angkatan -------------------------------- */

function BagianAngkatan({ onBerhasil }) {
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
          tambah ? null : (
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
                  ) : (
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

function BagianProdi({ onBerhasil }) {
  const t = useTeks()
  const [tambah, setTambah] = useState(null) // 'fakultas' | 'prodi' | null
  const [ubah, setUbah] = useState(null) // 'fakultas:<nama>' | 'prodi:<nama>' | null
  const fakultas = FACULTIES.map((f) => f.name)

  const tombolTambah = (jenis, label) =>
    tambah === jenis ? null : (
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
                onToggle={() => setUbah(ubah === 'fakultas:' + f.name ? null : 'fakultas:' + f.name)}
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
              awal={{ nama: '', jenjang: 'S1', fakultas: fakultas[0] ?? '' }}
              kolom={[
                { kunci: 'nama', label: t('Nama program studi') },
                { kunci: 'jenjang', label: t('Jenjang'), pilihan: JENJANG },
                { kunci: 'fakultas', label: t('Fakultas'), pilihan: fakultas },
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
                onToggle={() => setUbah(ubah === 'prodi:' + p.program ? null : 'prodi:' + p.program)}
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

function BagianMahasiswa({ onBerhasil }) {
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
          tambah ? null : (
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
            awal={{ email: '', sandi: '', nama: '', nim: '', prodi: prodi[0] ?? '', angkatanId: angkatanTerbuka[0] ?? '' }}
            kolom={[
              { kunci: 'email', label: t('Email'), type: 'email' },
              { kunci: 'sandi', label: t('Sandi awal (minimal {n} karakter)', { n: SANDI_AWAL_MIN }), autoComplete: 'new-password' },
              { kunci: 'nama', label: t('Nama lengkap') },
              { kunci: 'nim', label: 'NIM', inputMode: 'numeric' },
              { kunci: 'prodi', label: t('Program studi'), pilihan: prodi },
              { kunci: 'angkatanId', label: t('Angkatan'), pilihan: angkatanTerbuka, tampilkan: labelAngkatan },
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
                  onToggle={() => setUbah(ubah === s.nim ? null : s.nim)}
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

function BarisUbah({ judul, rincian, terbuka, onToggle }) {
  const t = useTeks()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="break-words text-[14.5px] font-bold text-ink">{judul}</p>
        {rincian ? <p className="mt-0.5 break-words text-[12.5px] text-ink-2">{rincian}</p> : null}
      </div>
      <button type="button" className="btn-ghost !px-3 !py-2 text-[13px]" aria-expanded={terbuka} onClick={onToggle}>
        <IconPencil size={15} />
        {t('Ubah')}
      </button>
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

  function kirim(e) {
    e.preventDefault()
    // Kolom `tetap` tidak dikirim: server mempertahankan nilai lamanya.
    const isi = Object.fromEntries(kolom.filter((k) => !k.tetap).map((k) => [k.kunci, isian[k.kunci]]))
    jalankan(() => simpan(tanpaAlasan ? isi : { ...isi, alasan: alasan.trim() }), () => onSelesai(isi))
  }

  return (
    <form onSubmit={kirim} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {kolom.map(({ kunci, label, pilihan, tampilkan, tetap, ...sisa }) =>
          tetap ? (
            <div key={kunci}>
              <span className="mb-1.5 block label">{label}</span>
              <p className="flex items-center gap-1.5 py-2.5 text-[14px] font-semibold text-ink">
                <IconLock size={14} className="shrink-0 text-ink-3" />
                {tampilkan ? tampilkan(isian[kunci]) : isian[kunci]}
              </p>
            </div>
          ) : pilihan ? (
            <Select key={kunci} label={label} value={isian[kunci]} onChange={pasang(kunci)} options={pilihan} tampilkan={tampilkan} />
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
      <TombolForm sibuk={sibuk} nonaktif={kurangAlasan} label={tombol ?? t('Simpan perubahan')} onBatal={onBatal} />
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
