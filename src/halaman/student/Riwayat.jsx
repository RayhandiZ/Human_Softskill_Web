import { useState } from 'react'
import Link from 'next/link'
import { Badge, SearchInput, Select, StatusTeks } from '../../components/Ui'
import { IconCheck, IconChevronRight, IconClock, IconX } from '../../components/Icons'
import { SUMBER, SUMBER_LIST, getAspek } from '../../lib/curriculum'
import { transkripOf } from '../../lib/data'
import { koreksiMilik, useStore } from '../../lib/store'
import { LABEL_KOREKSI } from '../../lib/duaLapis'
import { useStudent } from './StudentLayout'
import { useBahasa, useTeks } from '../../lib/bahasa'
import { tanggalPendek } from '../../lib/tanggal'

/* "Ditetapkan oleh" hanya untuk aspek final; lihat README.md › Empat keadaan sebuah aspek. */

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const tanggalPanjang = (t, iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return Number(d) + ' ' + t(BULAN[Number(m) - 1]) + ' ' + y
}

const bulanTahun = (t, iso) => {
  if (!iso) return t('Tanpa tanggal')
  const [y, m] = iso.split('-')
  return t(BULAN[Number(m) - 1]) + ' ' + y
}

const TAB = [
  { id: 'semua', label: 'Semua', cocok: () => true },
  { id: 'final', label: 'Final', cocok: (e) => e.final },
  { id: 'sementara', label: 'Sementara', cocok: (e) => !e.final },
]

const SEMUA = 'Semua'
const URUTAN = ['Terbaru', 'Terlama']

const tanpaTitik = (kode) => String(kode ?? '').replace(/\.$/, '')

/* ------------------------------ satu catatan ------------------------------ */

function Catatan({ e }) {
  const { t, bahasa } = useBahasa()
  const penilai = e.k.penilai ?? t('penilai tidak tercatat')
  return (
    <li className="flex items-start gap-4 border-b border-line px-5 py-3 last:border-0 sm:px-6">
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold leading-snug text-ink">{t(e.k.label)}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
          {tanpaTitik(e.aspek.kode)} · {t(e.aspek.nama)}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">
          {[
            t(SUMBER[e.k.sumber]?.label ?? e.k.sumber),
            t(e.final ? 'Ditetapkan oleh {oleh}' : 'Dinilai oleh {oleh}', { oleh: penilai }),
            tanggalPendek(e.k.tanggal, bahasa),
          ]
            .filter(Boolean)
            .join(' · ')}
          {e.final ? '' : t(' (belum final, masih bisa berubah)')}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-[18px] font-extrabold leading-none tabular-nums text-ink">{e.k.nilai}</span>
        <span className="mt-1.5 block">
          <StatusTeks kuat={e.final}>{t(e.final ? 'Final' : 'Sementara')}</StatusTeks>
        </span>
      </span>
    </li>
  )
}

/* --------------------------- pengajuan koreksi ---------------------------- */

// Dua lapis sejak rapat 24 Okt 2026: admin Kemahasiswaan meneruskan, Super Admin memutuskan dan menerapkan nilai.
const LENCANA_KOREKSI = {
  disetujui: { tone: 'good', icon: IconCheck },
  ditolak: { tone: 'critical', icon: IconX },
  menunggu_admin: { tone: 'neutral', icon: IconClock },
  menunggu_superadmin: { tone: 'neutral', icon: IconClock },
}

function Koreksi({ k }) {
  const t = useTeks()
  const lencana = LENCANA_KOREKSI[k.status] ?? LENCANA_KOREKSI.menunggu_admin
  const aspek = getAspek(k.aspekId)

  return (
    <li className="border-b border-line px-5 py-4 last:border-0 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-2">
            {aspek ? aspek.kode + ' ' + t(aspek.nama) : k.aspekId}
          </p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-ink">{t(k.komponenLabel)}</p>
        </div>
        <Badge tone={lencana.tone} icon={lencana.icon}>
          {t(LABEL_KOREKSI[k.status] ?? k.status)}
        </Badge>
      </div>

      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
        {t('Anda ajukan {tanggal}', { tanggal: tanggalPanjang(t, k.diajukan) })}: “{k.alasan}”
      </p>

      {k.keputusan ? (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          {t('Diputuskan')} <span className="font-semibold text-ink">{k.keputusan.oleh}</span>{' '}
          {t('pada')} {tanggalPanjang(t, k.keputusan.tanggal)}
          {k.keputusan.catatan ? '. ' + k.keputusan.catatan : ''}
          {k.status === 'disetujui' && k.nilaiUsulan != null
            ? ' ' + t('Nilai baru {nilai} sudah masuk transkrip.', { nilai: k.nilaiUsulan })
            : ''}
        </p>
      ) : (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          {k.status === 'menunggu_superadmin'
            ? t('Admin Kemahasiswaan sudah meneruskannya. Menunggu keputusan Super Admin.')
            : t('Belum ada keputusan dari Biro Kemahasiswaan.')}
        </p>
      )}
    </li>
  )
}

/* --------------------------------- halaman -------------------------------- */

export default function Riwayat() {
  useStore()
  const t = useTeks()
  const student = useStudent()
  const tr = transkripOf(student)
  const [tab, setTab] = useState('semua')
  const [kata, setKata] = useState('')
  const [semester, setSemester] = useState(SEMUA)
  const [sumber, setSumber] = useState(SEMUA)
  const [urutan, setUrutan] = useState('Terbaru')

  const semua = tr.aspek
    .filter((a) => !a.terkunci)
    .flatMap((a) =>
      a.komponen
        .filter((k) => k.terisi)
        .map((k) => ({ k, aspek: a.aspek, final: a.status === 'final' })),
    )

  const menunggu = tr.aspek
    .filter((a) => !a.terkunci)
    .reduce((n, a) => n + a.komponenKosong.length, 0)

  const semesterAda = [...new Set(semua.map((e) => e.aspek.semester))].sort((a, b) => a - b).map(String)
  const sumberAda = SUMBER_LIST.filter((s) => semua.some((e) => e.k.sumber === s.id)).map((s) => s.id)

  const cari = kata.trim().toLowerCase()
  const cocokKata = (e) =>
    !cari ||
    [t(e.k.label), e.k.label, t(e.aspek.nama), e.aspek.nama, e.aspek.kode].some((x) => String(x ?? '').toLowerCase().includes(cari))
  const tersaring = semua.filter(
    (e) =>
      cocokKata(e) &&
      (semester === SEMUA || String(e.aspek.semester) === semester) &&
      (sumber === SEMUA || e.k.sumber === sumber),
  )
  const adaSaringan = Boolean(cari) || semester !== SEMUA || sumber !== SEMUA

  // Tab baru berguna bila final dan sementara sama-sama ada; kalau tidak, isi ketiganya sama.
  const tampilTab = semua.some((e) => e.final) && semua.some((e) => !e.final)
  const aktif = tampilTab ? TAB.find((x) => x.id === tab) : TAB[0]

  // Catatan tanpa tanggal selalu di ujung, ke arah mana pun urutannya.
  const arah = urutan === 'Terbaru' ? -1 : 1
  const daftar = tersaring.filter(aktif.cocok).sort((x, y) => {
    if (!x.k.tanggal !== !y.k.tanggal) return x.k.tanggal ? -1 : 1
    return arah * String(x.k.tanggal ?? '').localeCompare(String(y.k.tanggal ?? ''))
  })

  const kelompok = []
  for (const e of daftar) {
    const label = bulanTahun(t, e.k.tanggal)
    const akhir = kelompok[kelompok.length - 1]
    if (akhir && akhir.label === label) akhir.isi.push(e)
    else kelompok.push({ label, isi: [e] })
  }

  const koreksi = koreksiMilik(student.nim)

  function hapusSaringan() {
    setKata('')
    setSemester(SEMUA)
    setSumber(SEMUA)
  }

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">
          {t('Riwayat')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {t(
            'Catatan nilai yang sudah masuk: komponen apa, dari jalur mana, siapa yang menetapkannya, dan kapan.',
          )}{' '}
          {t('{n} komponen sudah dinilai', { n: semua.length })}
          {menunggu ? t(' dan {n} masih ditunggu dari penilai', { n: menunggu }) : ''}.
        </p>
      </header>

      {/* Satu-satunya kaca di halaman ini; tiap catatan tetap padat. Menempel di bawah bilah atas mulai layar sm. */}
      {semua.length ? (
        <div className="alat-riwayat">
          <SearchInput
            value={kata}
            onChange={setKata}
            label={t('Cari tugas atau aspek')}
            placeholder={t('Cari tugas atau aspek')}
            className="min-w-[min(100%,240px)] flex-[2_1_240px]"
          />
          <Select
            ringkas
            label={t('Semester')}
            value={semester}
            onChange={setSemester}
            options={[SEMUA, ...semesterAda]}
            tampilkan={(o) => (o === SEMUA ? t('Semua') : o)}
            className="flex-[1_1_165px]"
          />
          <Select
            ringkas
            label={t('Sumber')}
            value={sumber}
            onChange={setSumber}
            options={[SEMUA, ...sumberAda]}
            tampilkan={(o) => (o === SEMUA ? t('Semua') : t(SUMBER[o]?.label ?? o))}
            className="flex-[1_1_145px]"
          />
          <Select
            ringkas
            label={t('Urutan')}
            value={urutan}
            onChange={setUrutan}
            options={URUTAN}
            tampilkan={(o) => t(o)}
            className="flex-[1_1_150px]"
          />
        </div>
      ) : null}

      <section className="kartu overflow-hidden">
        <div className="px-5 pb-3 pt-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-[17px] font-extrabold text-ink">{t('Riwayat penilaian')}</h2>
            {semua.length ? (
              <p role="status" className="text-[13px] font-semibold text-ink-2">
                {t('Menampilkan {n} dari {total} catatan', { n: daftar.length, total: semua.length })}
              </p>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">{t('Final')}</span>{' '}
            {t('berarti nilainya sudah disahkan Kemahasiswaan. Perubahan sesudahnya hanya lewat prosedur koreksi.')}
          </p>
        </div>

        {tampilTab ? (
          <div
            role="tablist"
            aria-label={t('Saring riwayat')}
            className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-4 sm:px-5"
          >
            {TAB.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={x.id === tab}
                onClick={() => setTab(x.id)}
                className={
                  '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-bold transition focus-visible:outline-offset-[-3px] ' +
                  (x.id === tab
                    ? 'border-brand-ink text-brand-ink'
                    : 'border-transparent text-ink-2 hover:text-ink')
                }
              >
                {t(x.label)}
                <span className="ml-1.5 font-semibold text-ink-3">{tersaring.filter(x.cocok).length}</span>
              </button>
            ))}
          </div>
        ) : null}

        {kelompok.length ? (
          kelompok.map((g) => (
            <section key={g.label}>
              <h3 className="border-y border-line bg-surface-2 px-5 py-1.5 text-[12.5px] font-bold uppercase tracking-[.06em] text-ink-2 sm:px-6">
                {g.label}
              </h3>
              <ul>
                {g.isi.map((e) => (
                  <Catatan key={e.k.id} e={e} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <div className="border-t border-line px-6 py-10 text-center">
            <p className="text-[14px] text-ink-2">
              {t(adaSaringan ? 'Tidak ada catatan yang cocok dengan saringan ini.' : 'Belum ada catatan pada kelompok ini.')}
            </p>
            {adaSaringan ? (
              <button type="button" onClick={hapusSaringan} className="btn-ghost mt-3 min-h-[44px]">
                {t('Hapus saringan')}
              </button>
            ) : null}
          </div>
        )}

        <Link
          href="/mahasiswa/transkrip"
          className="flex items-center justify-center gap-1.5 border-t border-line px-5 py-3.5 text-[14px] font-bold text-brand-ink transition hover:bg-surface-2 focus-visible:outline-offset-[-3px]"
        >
          {t('Lihat bobot tiap komponen di transkrip')}
          <IconChevronRight size={16} />
        </Link>
      </section>

      {koreksi.length ? (
        <section className="kartu overflow-hidden">
          <div className="px-5 pb-3 pt-5 sm:px-6">
            <h2 className="text-[17px] font-extrabold text-ink">{t('Pengajuan koreksi saya')}</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-2">
              {t('Keberatan yang Anda kirim lewat transkrip, beserta keputusannya.')}
            </p>
          </div>
          <ul className="border-t border-line">
            {koreksi.map((k) => (
              <Koreksi key={k.id} k={k} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
