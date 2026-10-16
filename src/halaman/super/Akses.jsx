import { useEffect, useState } from 'react'
import { Avatar, Badge, Card, CatatanKaki, EmptyState, SearchInput, Select, Tabs } from '../../components/Ui'
import { IconAlert, IconCheck, IconLock, IconRefresh, IconUndo } from '../../components/Icons'
import { ALASAN_AKSES_MIN, muatAkses, ubahAkses } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Mahasiswa, dosen, dan admin Kemahasiswaan yang boleh masuk (Pengguna.aktif). Daftar dari /api/akses, perubahan
   lewat /api/akses/ubah (src/server/akses.js); lihat README.md › Panel Super Admin › Akses Pengguna.
   Akun yang dicabut sudah ditolak server: penggunaDari() di src/server/api.js membaca `aktif` setiap permintaan. */

const KELOMPOK = {
  dosen: { label: 'Dosen', peran: ['dosen'], kosong: 'Belum ada akun dosen.', cari: 'Cari nama, email, atau NIP' },
  admin: { label: 'Admin Kemahasiswaan', peran: ['admin', 'superadmin'], kosong: 'Belum ada akun admin.', cari: 'Cari email' },
  mahasiswa: { label: 'Mahasiswa', peran: ['mahasiswa'], kosong: 'Belum ada akun mahasiswa.', cari: 'Cari nama, email, atau NIM' },
}
const LABEL_STATUS = { semua: 'Semua status', aktif: 'Punya akses', dicabut: 'Akses dicabut' }

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
          {t('Tentukan mahasiswa, dosen, dan admin Kemahasiswaan yang boleh masuk ke Human Skill. Mencabut akses langsung mengakhiri sesinya dan menolak login berikutnya; datanya tetap tersimpan dan aksesnya bisa dipulihkan kapan saja.')}
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
              </div>
              {muat.keadaan === 'siap' ? (
                <p className="text-[12.5px] text-ink-2">
                  {t('{n} akun · {m} aksesnya dicabut', { n: anggota(kelompok).length, m: dicabut })}
                </p>
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
        {t('Akses Super Admin tidak bisa dicabut dari sini, termasuk akun Anda sendiri; itu diatur langsung di basis data. Setiap perubahan akses tercatat di Log Aktivitas beserta alasannya.')}
      </CatatanKaki>
    </div>
  )
}

function BarisAkun({ a, milikSaya, terbuka, onBuka, onTutup, onGanti }) {
  const t = useTeks()
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const bisaDiubah = a.peran !== 'superadmin' && !milikSaya
  const cabut = Boolean(a.aktif)

  function tutup() {
    setAlasan('')
    setGalat('')
    onTutup()
  }

  async function simpan(e) {
    e.preventDefault()
    if (sibuk) return
    setSibuk(true)
    setGalat('')
    try {
      const { akun } = await ubahAkses({ id: a.id, aktif: !cabut, alasan: alasan.trim() })
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
          <Badge tone={a.aktif ? 'good' : 'critical'} icon={a.aktif ? IconCheck : IconLock}>
            {t(a.aktif ? 'Punya akses' : 'Akses dicabut')}
          </Badge>
          {bisaDiubah ? (
            <button
              type="button"
              className="btn-ghost !px-3 !py-2 text-[13px]"
              aria-expanded={terbuka}
              onClick={terbuka ? tutup : onBuka}
            >
              {cabut ? <IconLock size={15} /> : <IconUndo size={15} />}
              {t(cabut ? 'Cabut akses' : 'Pulihkan akses')}
            </button>
          ) : (
            <span className="text-[12.5px] text-ink-3">{t(milikSaya ? 'Akun Anda' : 'Diatur di basis data')}</span>
          )}
        </div>
      </div>

      {terbuka && bisaDiubah ? (
        <form onSubmit={simpan} className="mt-3 space-y-3 rounded-xl border border-line bg-surface-2/60 p-4">
          <p className="text-[13px] leading-relaxed text-ink">
            {t(
              cabut
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
              className={
                cabut
                  ? 'btn border border-[color-mix(in_srgb,var(--critical)_45%,transparent)] text-[var(--critical)] hover:bg-[color-mix(in_srgb,var(--critical)_10%,transparent)]'
                  : 'btn-primary'
              }
              disabled={sibuk || alasan.trim().length < ALASAN_AKSES_MIN}
            >
              {cabut ? <IconLock size={16} /> : <IconUndo size={16} />}
              {t(cabut ? 'Cabut akses' : 'Pulihkan akses')}
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
