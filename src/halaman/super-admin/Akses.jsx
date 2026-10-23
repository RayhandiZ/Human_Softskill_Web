import { useEffect, useState } from 'react'
import { Avatar, Badge, Card, CatatanKaki, EmptyState, SearchInput, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconCheck, IconCheckShield, IconHapus, IconLock, IconPlus, IconRefresh, IconUndo } from '../../components/Icons'
import { ALASAN_AKSES_MIN, SANDI_AWAL_MIN, aturIzinMaster, hapusAkun, muatAkses, tambahAkun, ubahAkses } from '../../lib/store'
import { COHORTS, PROGRAMS, getAngkatan } from '../../lib/data'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Mahasiswa, dosen, dan admin Kemahasiswaan yang boleh masuk (Pengguna.aktif). Daftar dari /api/akses, perubahan
   lewat /api/akses/ubah (src/server/akses.js); lihat README.md › Panel Super Admin › Akses Pengguna.
   Akun yang dicabut sudah ditolak server: penggunaDari() di src/server/api.js membaca `aktif` setiap permintaan.
   Baris admin juga memberi atau mencabut izin kelola data master lewat /api/akses/izin; lihat README.md › Data master. */

const KELOMPOK = {
  dosen: { label: 'Dosen', peran: ['dosen'], kosong: 'Belum ada akun dosen.', cari: 'Cari nama, email, atau NIP', tambah: 'Tambah dosen' },
  admin: { label: 'Admin Kemahasiswaan', peran: ['admin', 'superadmin'], kosong: 'Belum ada akun admin.', cari: 'Cari email', tambah: 'Tambah admin' },
  mahasiswa: { label: 'Mahasiswa', peran: ['mahasiswa'], kosong: 'Belum ada akun mahasiswa.', cari: 'Cari nama, email, atau NIM', tambah: 'Tambah mahasiswa' },
}
const LABEL_STATUS = { semua: 'Semua status', aktif: 'Punya akses', dicabut: 'Akses dicabut' }
const TOMBOL_BAHAYA =
  'btn border border-[color-mix(in_srgb,var(--critical)_45%,transparent)] text-[var(--critical)] hover:bg-[color-mix(in_srgb,var(--critical)_10%,transparent)]'

const urut = (a, b) => (a.nama || a.email).localeCompare(b.nama || b.email, 'id')

/** Inisial dari nama tanpa gelar ("Simon Petrus W., S.S." menjadi SP), atau dari email bila nama tidak ada. */
function inisial(a) {
  const nama = String(a.nama ?? '').split(',')[0].trim()
  if (nama) return nama.split(/\s+/).slice(0, 2).map((k) => k[0]).join('').toUpperCase()
  return String(a.email ?? '').split('@')[0].replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() || '?'
}

export default function Akses() {
  const t = useTeks()
  const { user } = useAuth()
  const [muat, setMuat] = useState({ keadaan: 'memuat', akun: [], galat: null })
  const [kelompok, setKelompok] = useState('dosen')
  const [cari, setCari] = useState('')
  const [status, setStatus] = useState('semua')
  const [terbuka, setTerbuka] = useState(null)
  const [tambah, setTambah] = useState(false)
  const [pesan, setPesan] = useState('')


  async function ambil() {
    setMuat((m) => ({ ...m, keadaan: 'memuat', galat: null }))
    try {
      const { akun = [] } = await muatAkses()
      setMuat({ keadaan: 'siap', akun, galat: null })
    } catch (e) {
      setMuat({ keadaan: 'galat', akun: [], galat: e })
    }
  }
  useEffect(() => {
    ambil()
  }, [])

  const ganti = (baru) => setMuat((m) => ({ ...m, akun: m.akun.map((a) => (a.id === baru.id ? { ...a, ...baru } : a)) }))

  const anggota = (k) => muat.akun.filter((a) => KELOMPOK[k].peran.includes(a.peran))
  const kata = cari.trim().toLowerCase()
  const daftar = anggota(kelompok)
    .filter((a) => status === 'semua' || (status === 'aktif') === Boolean(a.aktif))
    .filter((a) => !kata || [a.nama, a.email, a.nip, a.nim].some((x) => String(x ?? '').toLowerCase().includes(kata)))
    .sort(urut)
  const dicabut = anggota(kelompok).filter((a) => !a.aktif).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Akses Pengguna')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t('Tentukan mahasiswa, dosen, dan admin Kemahasiswaan yang boleh masuk ke VIBE. Mencabut akses langsung mengakhiri sesinya dan menolak login berikutnya; datanya tetap tersimpan dan aksesnya bisa dipulihkan kapan saja.')}
        </p>
      </header>

      <Card className="overflow-hidden">
        {muat.keadaan === 'galat' ? (
          muat.galat?.status === 404 ? (
            <div className="px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <IconLock size={22} />
              </span>
              <p className="mt-4 text-[15px] font-bold text-ink">{t('Pengaturan akses belum tersedia')}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-2">
                {t('Server belum menyediakan daftar akun. Halaman ini langsung berfungsi begitu pintu /api/akses dibuat; rinciannya ada di README › Akses Pengguna.')}
              </p>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-[15px] font-bold text-ink">{t('Daftar akun gagal dimuat')}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-2">{muat.galat?.message}</p>
              <button type="button" className="btn-ghost mt-4" onClick={ambil}>
                <IconRefresh size={16} />
                {t('Coba lagi')}
              </button>
            </div>
          )
        ) : (
          <>
            <div className="space-y-4 px-5 pt-4 sm:px-6">
              <Tabs
                value={kelompok}
                onChange={(k) => {
                  setKelompok(k)
                  setTerbuka(null)
                  setTambah(false)
                  setPesan('')
                }}
                items={Object.entries(KELOMPOK).map(([value, k]) => ({
                  value,
                  label: t(k.label),
                  count: muat.keadaan === 'siap' ? anggota(value).length : null,
                }))}
              />
              <div className="flex flex-wrap items-end gap-3">
                <SearchInput
                  value={cari}
                  onChange={setCari}
                  placeholder={t(KELOMPOK[kelompok].cari)}
                  className="min-w-[220px] flex-1"
                />
                <Select
                  value={status}
                  onChange={setStatus}
                  options={Object.keys(LABEL_STATUS)}
                  tampilkan={(s) => t(LABEL_STATUS[s])}
                  className="w-[190px]"
                />
                <button type="button" className="btn-primary" aria-expanded={tambah} onClick={() => setTambah((x) => !x)}>
                  <IconPlus size={16} />
                  {t(KELOMPOK[kelompok].tambah)}
                </button>
              </div>
              {muat.keadaan === 'siap' ? (
                <p className="text-[12.5px] text-ink-2">
                  {t('{n} akun · {m} aksesnya dicabut', { n: anggota(kelompok).length, m: dicabut })}
                </p>
              ) : null}
              {/* Selalu terpasang supaya pembaca layar mengumumkan isinya begitu terisi. */}
              <p role="status" className={pesan ? 'teks-baik flex items-center gap-2 text-[13px] font-semibold' : 'sr-only'}>
                {pesan ? <IconCheck size={16} className="shrink-0" /> : null}
                {pesan}
              </p>
              {tambah ? (
  <FormTambah
    kelompok={kelompok}
    onBatal={() => setTambah(false)}
    onTambah={(akun) => {
      setMuat((m) => ({ ...m, akun: [...m.akun, akun] }))
      setTambah(false)
    }}
  />
) : null}

            </div>

            {muat.keadaan === 'memuat' ? (
              <p className="px-6 py-12 text-center text-[13.5px] text-ink-2">{t('Memuat daftar akun…')}</p>
            ) : daftar.length ? (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {daftar.map((a) => (
                  <BarisAkun
                    key={a.id}
                    a={a}
                    milikSaya={Boolean(user?.email) && a.email === user.email}
                    terbuka={terbuka === a.id}
                    onBuka={() => setTerbuka(a.id)}
                    onTutup={() => setTerbuka(null)}
                    onGanti={ganti}
                    onHapus={(akun) => {
                      setMuat((m) => ({ ...m, akun: m.akun.filter((x) => x.id !== akun.id) }))
                      setTerbuka(null)
                      setPesan(t('Akun {nama} sudah dihapus dari basis data.', { nama: akun.nama || akun.email }))
                    }}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState
                title={t(anggota(kelompok).length ? 'Tidak ada akun yang cocok.' : KELOMPOK[kelompok].kosong)}
              />
            )}
          </>
        )}
      </Card>

      <CatatanKaki>
        {t('Akses Super Admin tidak bisa dicabut atau dihapus dari sini, termasuk akun Anda sendiri; itu diatur langsung di basis data. Hanya akun yang aksesnya sudah dicabut dan belum punya data yang bisa dihapus. Setiap perubahan akses dan penghapusan akun tercatat di Log Aktivitas beserta alasannya.')}
      </CatatanKaki>
    </div>
  )
}

function BarisAkun({ a, milikSaya, terbuka, onBuka, onTutup, onGanti, onHapus }) {
  const t = useTeks()
  // Panel baris ini berisi ubah akses ('akses'), hapus akun ('hapus'), atau izin kelola data master ('izin').
  const [mode, setMode] = useState('akses')
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const bisaDiubah = a.peran !== 'superadmin' && !milikSaya
  const cabut = Boolean(a.aktif)
  // Hanya akun yang aksesnya sudah dicabut; server juga menolak akun yang masih punya data.
  const bisaDihapus = bisaDiubah && !a.aktif
  const hapus = mode === 'hapus'
  // Izin kelola data master hanya untuk admin biasa (aturIzinMaster di src/server/akses.js). Memberi izin butuh akun
  // yang masih punya akses; mencabut tetap bisa walau aksesnya sudah dicabut.
  const izin = mode === 'izin'
  const punyaIzin = a.kelolaMaster === true
  const bisaIzin = bisaDiubah && a.peran === 'admin' && (a.aktif || punyaIzin)
  const panel = terbuka && bisaDiubah && (hapus ? bisaDihapus : izin ? bisaIzin : true)

  function tutup() {
    setAlasan('')
    setGalat('')
    onTutup()
  }

  /* Tombol yang sama menutup panelnya; tombol lain mengganti isi panel. */
  function buka(baru) {
    if (terbuka && mode === baru) return tutup()
    setMode(baru)
    setAlasan('')
    setGalat('')
    onBuka()
  }

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      if (hapus) {
        await hapusAkun({ id: a.id, alasan: alasan.trim() })
        onHapus(a)
        return
      }
      const { akun } = izin
        ? await aturIzinMaster({ id: a.id, aktif: !punyaIzin, alasan: alasan.trim() })
        : await ubahAkses({ id: a.id, aktif: !cabut, alasan: alasan.trim() })
      onGanti(akun)
      tutup()
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  const rincian = [
    a.nama ? a.email : null,
    a.nip ? 'NIP ' + a.nip : null,
    a.nim ? 'NIM ' + a.nim : null,
    a.prodi,
    a.angkatan ? t('Angkatan {label}', { label: a.angkatan }) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initials={inisial(a)} size={36} />
          <div className="min-w-0">
            <p className="break-words text-[14.5px] font-bold text-ink">{a.nama || a.email}</p>
            {rincian ? <p className="mt-0.5 break-words text-[12.5px] text-ink-2">{rincian}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {a.peran === 'superadmin' ? <Badge tone="brand">{t('Super Admin')}</Badge> : null}
          {punyaIzin ? (
            <Badge tone="brand" icon={IconCheckShield}>
              {t('Izin data master')}
            </Badge>
          ) : null}
          <Badge
            tone={a.aktif ? 'good' : 'critical'}
            icon={a.aktif ? IconCheck : IconLock}
            className={a.aktif ? 'teks-baik' : 'teks-kritis'}
          >
            {t(a.aktif ? 'Punya akses' : 'Akses dicabut')}
          </Badge>
          {bisaDiubah ? (
            <>
              {bisaIzin ? (
                <button
                  type="button"
                  className="btn-ghost !px-3 !py-2 text-[13px]"
                  aria-expanded={panel && izin}
                  onClick={() => buka('izin')}
                >
                  <IconCheckShield size={15} />
                  {t(punyaIzin ? 'Cabut izin data master' : 'Beri izin data master')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn-ghost !px-3 !py-2 text-[13px]"
                aria-expanded={panel && mode === 'akses'}
                onClick={() => buka('akses')}
              >
                {cabut ? <IconLock size={15} /> : <IconUndo size={15} />}
                {t(cabut ? 'Cabut akses' : 'Pulihkan akses')}
              </button>
              {bisaDihapus ? (
                <button
                  type="button"
                  className="btn-ghost teks-kritis !px-3 !py-2 text-[13px]"
                  aria-expanded={panel && hapus}
                  onClick={() => buka('hapus')}
                >
                  <IconHapus size={15} />
                  {t('Hapus akun')}
                </button>
              ) : null}
            </>
          ) : (
            <span className="text-[12.5px] text-ink-3">{t(milikSaya ? 'Akun Anda' : 'Diatur di basis data')}</span>
          )}
        </div>
      </div>

      {panel ? (
        <form key={mode} onSubmit={simpan} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
          <p className="text-[13px] leading-relaxed text-ink">
            {t(
              hapus
                ? 'Akun ini dihapus permanen dari basis data beserta profilnya, dan tidak bisa dikembalikan. Akun yang masih punya nilai, pengumpulan, atau riwayat tindakan tidak bisa dihapus; biarkan aksesnya tetap dicabut.'
                : izin
                  ? punyaIzin
                    ? 'Admin ini tidak bisa lagi menambah atau mengubah data master. Data yang sudah ditambahkannya tetap tersimpan.'
                    : 'Admin ini bisa menambah dan mengubah angkatan, fakultas, program studi, dan data mahasiswa dari halaman Data Master sampai izinnya dicabut. Menghapus data tetap tidak bisa.'
                  : cabut
                  ? 'Akun ini tidak bisa masuk lagi, dan sesi yang sedang terbuka langsung berakhir. Datanya tetap tersimpan.'
                  : 'Akun ini bisa masuk lagi seperti semula.',
            )}
          </p>
          <label className="block max-w-xl">
            <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_AKSES_MIN })}</span>
            <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} autoFocus />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              className={hapus || (izin ? punyaIzin : cabut) ? TOMBOL_BAHAYA : 'btn-primary'}
              disabled={sibuk || alasan.trim().length < ALASAN_AKSES_MIN}
            >
              {hapus ? <IconHapus size={16} /> : izin ? <IconCheckShield size={16} /> : cabut ? <IconLock size={16} /> : <IconUndo size={16} />}
              {t(
                hapus
                  ? 'Hapus permanen'
                  : izin
                    ? punyaIzin
                      ? 'Cabut izin data master'
                      : 'Beri izin data master'
                    : cabut
                      ? 'Cabut akses'
                      : 'Pulihkan akses',
              )}
            </button>
            <button type="button" className="btn-ghost" disabled={sibuk} onClick={tutup}>
              {t('Batal')}
            </button>
          </div>
          {galat ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
            >
              <IconAlert size={16} className="mt-px shrink-0" />
              {galat}
            </p>
          ) : null}
        </form>
      ) : null}
    </li>
  )
}
const SUMBER_DOSEN = { PDP: 'PDP', MK: 'MK Humaniora' }

function FormTambah({ kelompok, onBatal, onTambah }) {
  const t = useTeks()
  const [isian, setIsian] = useState({
    email: '',
    sandi: '',
    nama: '',
    nim: '',
    nip: '',
    jabatan: '',
    prodi: PROGRAMS[0]?.program ?? '',
    angkatanId: COHORTS[0]?.id ?? '',
    sumber: 'MK',
    semester: '1',
  })
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const pasang = (kunci) => (nilai) => setIsian((x) => ({ ...x, [kunci]: nilai }))
  const prodi = PROGRAMS.map((p) => p.program)

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      const { akun } = await tambahAkun({ ...isian, peran: kelompok })
      onTambah(akun)
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <p className="text-[14px] font-bold text-ink">{t(KELOMPOK[kelompok].tambah)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Isian label={t('Email')} type="email" value={isian.email} onChange={pasang('email')} />
        <Isian
          label={t('Sandi awal (minimal {n} karakter)', { n: SANDI_AWAL_MIN })}
          value={isian.sandi}
          onChange={pasang('sandi')}
          autoComplete="new-password"
        />
        {kelompok !== 'admin' ? <Isian label={t('Nama lengkap')} value={isian.nama} onChange={pasang('nama')} /> : null}
        {kelompok === 'mahasiswa' ? (
          <>
            <Isian label="NIM" inputMode="numeric" value={isian.nim} onChange={pasang('nim')} />
            <Select label={t('Program studi')} value={isian.prodi} onChange={pasang('prodi')} options={prodi} />
            <Select
              label={t('Angkatan')}
              value={isian.angkatanId}
              onChange={pasang('angkatanId')}
              options={COHORTS.map((c) => c.id)}
              tampilkan={(id) => getAngkatan(id)?.label ?? id}
            />
          </>
        ) : null}
        {kelompok === 'dosen' ? (
          <>
            <Isian label="NIP" value={isian.nip} onChange={pasang('nip')} />
            <Isian label={t('Jabatan')} value={isian.jabatan} onChange={pasang('jabatan')} />
            <Select label={t('Program studi')} value={isian.prodi} onChange={pasang('prodi')} options={prodi} />
            <Select
              label={t('Sumber penilaian')}
              value={isian.sumber}
              onChange={pasang('sumber')}
              options={Object.keys(SUMBER_DOSEN)}
              tampilkan={(s) => SUMBER_DOSEN[s]}
            />
            <Select
              label={t('Semester yang diampu')}
              value={isian.semester}
              onChange={pasang('semester')}
              options={['1', '2', '3']}
              tampilkan={(s) => t('Semester {n}', { n: s })}
            />
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn-primary" disabled={sibuk}>
          <IconPlus size={16} />
          {t('Simpan akun')}
        </button>
        <button type="button" className="btn-ghost" disabled={sibuk} onClick={onBatal}>
          {t('Batal')}
        </button>
      </div>
      {galat ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
        >
          <IconAlert size={16} className="mt-px shrink-0" />
          {galat}
        </p>
      ) : null}
    </form>
  )
}

function Isian({ label, onChange, ...sisa }) {
  return (
    <label className="block">
      <span className="mb-1.5 block label">{label}</span>
      <input className="field !py-2.5" onChange={(e) => onChange(e.target.value)} {...sisa} />
    </label>
  )
}
