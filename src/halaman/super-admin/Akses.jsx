import { useEffect, useRef, useState } from 'react'
import { Avatar, Badge, Card, CatatanKaki, EmptyState, SearchInput, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconCalendar, IconCheck, IconCheckShield, IconHapus, IconLock, IconPlus, IconRefresh, IconUndo, IconUsers } from '../../components/Icons'
import {
  ALASAN_AKSES_MIN,
  SANDI_AWAL_MIN,
  aturAksesAngkatan,
  aturIzinMaster,
  hapusAkun,
  muatAkses,
  tambahAkun,
  ubahAkses,
  ubahKelasDosen,
} from '../../lib/store'
import { COHORTS, PROGRAMS, getAngkatan, programSelesai } from '../../lib/data'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Mahasiswa, dosen, dan admin Kemahasiswaan yang boleh masuk (Pengguna.aktif). Daftar dari /api/akses, perubahan
   lewat /api/akses/ubah (src/server/akses.js); lihat README.md › Panel Super Admin › Akses Pengguna.
   Akun yang dicabut sudah ditolak server: penggunaDari() di src/server/api.js membaca `aktif` setiap permintaan.
   Baris admin juga memberi atau mencabut izin lihat data master lewat /api/akses/izin (sejak rapat 24 Okt 2026 hanya
   untuk melihat; menambah dan mengubahnya hanya super admin); lihat README.md › Data master. Baris admin juga mengatur
   angkatan yang terlihat oleh admin itu (membuka angkatan yang sudah lewat Semester 3, menonaktifkan angkatan
   Semester 1–3) lewat /api/akses/angkatan; lihat README.md › Akses angkatan. */

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
                  label={t(KELOMPOK[kelompok].cari)}
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
  // Panel baris ini berisi ubah akses ('akses'), hapus akun ('hapus'), atau izin lihat data master ('izin').
  const [mode, setMode] = useState('akses')
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const bisaDiubah = a.peran !== 'superadmin' && !milikSaya
  const cabut = Boolean(a.aktif)
  // Hanya akun yang aksesnya sudah dicabut; server juga menolak akun yang masih punya data.
  const bisaDihapus = bisaDiubah && !a.aktif
  const hapus = mode === 'hapus'
  // Izin lihat data master hanya untuk admin biasa (aturIzinMaster di src/server/akses.js). Memberi izin butuh akun
  // yang masih punya akses; mencabut tetap bisa walau aksesnya sudah dicabut.
  const izin = mode === 'izin'
  const punyaIzin = a.kelolaMaster === true
  const bisaIzin = bisaDiubah && a.peran === 'admin' && (a.aktif || punyaIzin)
  // Kelas dosen (prodi, sumber, semester, angkatan yang diampu) punya panelnya sendiri, tanpa isian alasan.
  const kelas = mode === 'kelas'
  const bisaKelas = bisaDiubah && a.peran === 'dosen'
  // Angkatan yang terlihat oleh admin biasa (aturAksesAngkatan di src/server/akses.js), panelnya sendiri.
  const aksesAngkatan = mode === 'angkatan'
  const bisaAngkatan = bisaDiubah && a.peran === 'admin'
  const panel =
    terbuka &&
    bisaDiubah &&
    (hapus ? bisaDihapus : izin ? bisaIzin : kelas ? bisaKelas : aksesAngkatan ? bisaAngkatan : true)
  // Tombol yang membuka panel: panel yang ditutup dilepas dari DOM, jadi fokus papan ketik dikembalikan ke sini, bukan
  // jatuh ke <body> di awal halaman.
  const pemicu = useRef(null)

  function tutup() {
    setAlasan('')
    setGalat('')
    onTutup()
    requestAnimationFrame(() => pemicu.current?.isConnected && pemicu.current.focus())
  }

  /* Tombol yang sama menutup panelnya; tombol lain mengganti isi panel. */
  function buka(baru, e) {
    if (terbuka && mode === baru) return tutup()
    pemicu.current = e?.currentTarget ?? null
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
    // Kelas dosen: tanpa angkatan terpilih, kelasnya angkatan yang sedang di semester itu.
    ...(a.peran === 'dosen'
      ? [
          SUMBER_DOSEN[a.sumber] ?? a.sumber,
          t('Semester {n}', { n: a.semester }),
          a.angkatanDiampu?.length
            ? t('Angkatan {label}', { label: a.angkatanDiampu.map((x) => x.label).join(', ') })
            : t('angkatan otomatis'),
        ]
      : []),
    // Admin biasa: angkatan yang aksesnya diatur super admin; tanpa pengaturan, bawaannya angkatan Semester 1–3.
    ...(a.peran === 'admin' ? ringkasAksesAngkatan(a.aksesAngkatan, t) : []),
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
              {t('Izin lihat data master')}
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
              {bisaKelas ? (
                <button
                  type="button"
                  className="btn-ghost !px-3 !py-2 text-[13px]"
                  aria-expanded={panel && kelas}
                  onClick={(e) => buka('kelas', e)}
                >
                  <IconUsers size={15} />
                  {t('Ubah kelas')}
                </button>
              ) : null}
              {bisaAngkatan ? (
                <button
                  type="button"
                  className="btn-ghost !px-3 !py-2 text-[13px]"
                  aria-expanded={panel && aksesAngkatan}
                  onClick={(e) => buka('angkatan', e)}
                >
                  <IconCalendar size={15} />
                  {t('Akses angkatan')}
                </button>
              ) : null}
              {bisaIzin ? (
                <button
                  type="button"
                  className="btn-ghost !px-3 !py-2 text-[13px]"
                  aria-expanded={panel && izin}
                  onClick={(e) => buka('izin', e)}
                >
                  <IconCheckShield size={15} />
                  {t(punyaIzin ? 'Cabut izin lihat data master' : 'Beri izin lihat data master')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn-ghost !px-3 !py-2 text-[13px]"
                aria-expanded={panel && mode === 'akses'}
                onClick={(e) => buka('akses', e)}
              >
                {cabut ? <IconLock size={15} /> : <IconUndo size={15} />}
                {t(cabut ? 'Cabut akses' : 'Pulihkan akses')}
              </button>
              {bisaDihapus ? (
                <button
                  type="button"
                  className="btn-ghost teks-kritis !px-3 !py-2 text-[13px]"
                  aria-expanded={panel && hapus}
                  onClick={(e) => buka('hapus', e)}
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

      {panel && kelas ? (
        <PanelKelas
          a={a}
          onBatal={tutup}
          onSelesai={(akun) => {
            onGanti(akun)
            tutup()
          }}
        />
      ) : panel && aksesAngkatan ? (
        <PanelAksesAngkatan
          a={a}
          onBatal={tutup}
          onSelesai={(akun) => {
            onGanti(akun)
            tutup()
          }}
        />
      ) : panel ? (
        <form key={mode} onSubmit={simpan} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
          <p className="text-[13px] leading-relaxed text-ink">
            {t(
              hapus
                ? 'Akun ini dihapus permanen dari basis data beserta profilnya, dan tidak bisa dikembalikan. Akun yang masih punya nilai, pengumpulan, atau riwayat tindakan tidak bisa dihapus; biarkan aksesnya tetap dicabut.'
                : izin
                  ? punyaIzin
                    ? 'Admin ini tidak bisa lagi membuka halaman Data Master. Halaman lain yang menampilkan mahasiswa dan angkatan tetap terbaca seperti biasa.'
                    : 'Admin ini bisa melihat angkatan, fakultas, program studi, dan data mahasiswa di halaman Data Master untuk mencocokkan ulang, tanpa bisa mengubahnya. Menambah dan mengubah data master tetap hanya oleh Super Admin.'
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
                      ? 'Cabut izin lihat data master'
                      : 'Beri izin lihat data master'
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

/**
 * Angkatan yang diampu dosen, kotak centang per angkatan. Kosong berarti otomatis: angkatan yang sedang di semester yang
 * diampu dan programnya belum selesai. Angkatan yang sudah selesai atau disahkan boleh dipilih; perbaikan nilainya oleh
 * dosen lalu diajukan ke Super Admin (unggahNilaiDosen di src/server/pengajuan.js).
 */
function PilihAngkatan({ terpilih, onUbah }) {
  const t = useTeks()
  const ganti = (id) => onUbah(terpilih.includes(id) ? terpilih.filter((x) => x !== id) : [...terpilih, id].sort())
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 block label">{t('Angkatan yang diampu')}</legend>
      <div className="flex flex-wrap gap-2">
        {COHORTS.map((c) => (
          <label
            key={c.id}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[13.5px] font-semibold text-ink has-[:checked]:border-brand-ink has-[:checked]:bg-brand-soft"
          >
            <input type="checkbox" className="h-4 w-4 accent-[var(--brand-ink)]" checked={terpilih.includes(c.id)} onChange={() => ganti(c.id)} />
            {c.label}
            {c.status === 'terkunci' ? <span className="font-medium text-ink-2">{t('(disahkan)')}</span> : null}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
        {t('Kosongkan untuk otomatis: angkatan yang sedang di semester yang diampu. Untuk angkatan yang sudah disahkan atau selesai, perbaikan nilai dari dosen diajukan ke Super Admin dulu.')}
      </p>
    </fieldset>
  )
}

/** Mengubah kelas satu dosen (ubahKelasDosen di src/server/akses.js); nilai yang sudah tersimpan tidak berubah. */
function PanelKelas({ a, onBatal, onSelesai }) {
  const t = useTeks()
  const [isian, setIsian] = useState({
    prodi: a.prodi ?? '',
    sumber: a.sumber ?? '',
    semester: a.semester ? String(a.semester) : '',
    angkatan: (a.angkatanDiampu ?? []).map((x) => x.id),
  })
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const pasang = (kunci) => (nilai) => setIsian((x) => ({ ...x, [kunci]: nilai }))

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      const { akun } = await ubahKelasDosen({ id: a.id, ...isian })
      onSelesai(akun)
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <form onSubmit={simpan} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <p className="text-[13px] leading-relaxed text-ink">
        {t('Kelas menentukan mahasiswa yang terlihat dan bisa diunggah nilainya oleh dosen ini. Nilai yang sudah tersimpan tidak berubah.')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label={t('Program studi')} value={isian.prodi} onChange={pasang('prodi')} options={PROGRAMS.map((p) => p.program)} />
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
        <PilihAngkatan terpilih={isian.angkatan} onUbah={pasang('angkatan')} />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn-primary" disabled={sibuk}>
          <IconCheck size={16} />
          {t('Simpan kelas')}
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

/** Baris rincian akses angkatan seorang admin di daftar akun: yang dibuka dan yang dinonaktifkan, atau bawaannya. */
function ringkasAksesAngkatan(akses = [], t) {
  const dibuka = akses.filter((x) => x.terlihat).map((x) => x.label)
  const ditutup = akses.filter((x) => !x.terlihat).map((x) => x.label)
  if (!dibuka.length && !ditutup.length) return [t('angkatan Semester 1–3 saja')]
  return [
    dibuka.length ? t('Angkatan dibuka: {label}', { label: dibuka.join(', ') }) : null,
    ditutup.length ? t('Angkatan dinonaktifkan: {label}', { label: ditutup.join(', ') }) : null,
  ].filter(Boolean)
}

/**
 * Angkatan yang terlihat oleh satu admin biasa (aturAksesAngkatan di src/server/akses.js); kotak tercentang = terlihat.
 * Bawaannya angkatan Semester 1–3 (dan yang belum mulai) tercentang dan yang sudah lewat Semester 3 kosong: super admin
 * bisa menonaktifkan yang pertama dan membuka yang kedua. Yang tidak terlihat tidak dikirim ke admin itu di halaman mana
 * pun, dan pintu API-nya menolak (lihat README.md › Akses angkatan).
 */
function PanelAksesAngkatan({ a, onBatal, onSelesai }) {
  const t = useTeks()
  const berjalan = COHORTS.filter((c) => !programSelesai(c.intake))
  const lewat = COHORTS.filter((c) => programSelesai(c.intake))
  // Terlihat menurut pengaturan sekarang; angkatan tanpa pengaturan mengikuti bawaan semesternya.
  const atur = new Map((a.aksesAngkatan ?? []).map((x) => [x.id, x.terlihat]))
  const awal = COHORTS.filter((c) => atur.get(c.id) ?? !programSelesai(c.intake)).map((c) => c.id)
  const [terlihat, setTerlihat] = useState(awal)
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const berubah = [...terlihat].sort().join() !== [...awal].sort().join()
  const ganti = (id) => setTerlihat((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      // Yang dikirim hanya yang berbeda dari bawaan; selebihnya kembali ke bawaan.
      const { akun } = await aturAksesAngkatan({
        id: a.id,
        dibuka: lewat.filter((c) => terlihat.includes(c.id)).map((c) => c.id),
        ditutup: berjalan.filter((c) => !terlihat.includes(c.id)).map((c) => c.id),
        alasan: alasan.trim(),
      })
      onSelesai(akun)
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <form onSubmit={simpan} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
      <p className="text-[13px] leading-relaxed text-ink">
        {t('Centang angkatan yang boleh dilihat admin ini. Bawaannya, angkatan Semester 1–3 terlihat dan angkatan yang sudah lewat Semester 3 tersembunyi; pengaturan di sini berlaku sampai diubah lagi.')}
      </p>
      {[
        {
          judul: t('Angkatan Semester 1–3 atau belum mulai'),
          daftar: berjalan,
          kosong: t('Belum ada angkatan yang sedang berjalan.'),
          petunjuk: t('Hilangkan centang untuk menonaktifkan aksesnya.'),
        },
        {
          judul: t('Angkatan yang sudah lewat Semester 3'),
          daftar: lewat,
          kosong: t('Belum ada angkatan yang lewat Semester 3.'),
          petunjuk: t('Centang untuk membuka aksesnya.'),
        },
      ].map((k) => (
        <fieldset key={k.judul}>
          <legend className="mb-1.5 block label">{k.judul}</legend>
          {k.daftar.length ? (
            <div className="flex flex-wrap gap-2">
              {k.daftar.map((c) => (
                <label
                  key={c.id}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[13.5px] font-semibold text-ink has-[:checked]:border-brand-ink has-[:checked]:bg-brand-soft"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--brand-ink)]"
                    checked={terlihat.includes(c.id)}
                    onChange={() => ganti(c.id)}
                  />
                  {c.label}
                  {c.status === 'terkunci' ? <span className="font-medium text-ink-2">{t('(disahkan)')}</span> : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-2">{k.kosong}</p>
          )}
          {k.daftar.length ? <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{k.petunjuk}</p> : null}
        </fieldset>
      ))}
      <label className="block max-w-xl">
        <span className="mb-1.5 block label">{t('Alasan (wajib, minimal {n} karakter)', { n: ALASAN_AKSES_MIN })}</span>
        <input className="field !py-2.5" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="submit"
          className="btn-primary"
          disabled={sibuk || !berubah || alasan.trim().length < ALASAN_AKSES_MIN}
        >
          <IconCalendar size={16} />
          {t('Simpan akses angkatan')}
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

function FormTambah({ kelompok, onBatal, onTambah }) {
  const t = useTeks()
  const [isian, setIsian] = useState({
    email: '',
    sandi: '',
    nama: '',
    nim: '',
    nip: '',
    jabatan: '',
    // Pilihan yang menentukan kelas dan prodi sengaja dimulai kosong: dulu prodi pertama (Informatika) dan semester 1
    // terisi diam-diam, dan akun tersimpan dengan pilihan yang tidak pernah dipilih.
    prodi: '',
    angkatanId: '',
    sumber: '',
    semester: '',
    // Angkatan yang diampu dosen; kosong = otomatis (PilihAngkatan).
    angkatan: [],
  })
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const pasang = (kunci) => (nilai) => setIsian((x) => ({ ...x, [kunci]: nilai }))
  const prodi = PROGRAMS.map((p) => p.program)
  const wajibDipilih = {
    mahasiswa: [
      ['prodi', t('Pilih program studi lebih dulu.')],
      ['angkatanId', t('Pilih angkatan lebih dulu.')],
    ],
    dosen: [
      ['prodi', t('Pilih program studi lebih dulu.')],
      ['sumber', t('Pilih sumber penilaian lebih dulu.')],
      ['semester', t('Pilih semester yang diampu lebih dulu.')],
    ],
  }

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    const belum = (wajibDipilih[kelompok] ?? []).find(([kunci]) => !isian[kunci])
    if (belum) {
      setGalat(belum[1])
      return
    }
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
            <Select
              label={t('Program studi')}
              value={isian.prodi}
              onChange={pasang('prodi')}
              options={prodi}
              kosong={t('Pilih program studi')}
            />
            <Select
              label={t('Angkatan')}
              value={isian.angkatanId}
              onChange={pasang('angkatanId')}
              options={COHORTS.map((c) => c.id)}
              tampilkan={(id) => getAngkatan(id)?.label ?? id}
              kosong={t('Pilih angkatan')}
            />
          </>
        ) : null}
        {kelompok === 'dosen' ? (
          <>
            <Isian label="NIP" value={isian.nip} onChange={pasang('nip')} />
            <Isian label={t('Jabatan')} value={isian.jabatan} onChange={pasang('jabatan')} />
            <Select
              label={t('Program studi')}
              value={isian.prodi}
              onChange={pasang('prodi')}
              options={prodi}
              kosong={t('Pilih program studi')}
            />
            <Select
              label={t('Sumber penilaian')}
              value={isian.sumber}
              onChange={pasang('sumber')}
              options={Object.keys(SUMBER_DOSEN)}
              tampilkan={(s) => SUMBER_DOSEN[s]}
              kosong={t('Pilih sumber penilaian')}
            />
            <Select
              label={t('Semester yang diampu')}
              value={isian.semester}
              onChange={pasang('semester')}
              options={['1', '2', '3']}
              tampilkan={(s) => t('Semester {n}', { n: s })}
              kosong={t('Pilih semester')}
            />
            <PilihAngkatan terpilih={isian.angkatan} onUbah={pasang('angkatan')} />
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
