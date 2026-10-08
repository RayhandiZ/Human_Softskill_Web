import { useState } from 'react'
import Link from 'next/link'
import { Badge, StatusTeks } from '../../components/Ui'
import { IconCheck, IconChevronRight, IconClock, IconX } from '../../components/Icons'
import { SUMBER, getAspek } from '../../lib/curriculum'
import { transkripOf } from '../../lib/data'
import { koreksiMilik, useStore } from '../../lib/store'
import { useStudent } from './StudentLayout'
import { useTeks } from '../../lib/bahasa'

/* --------------------------------------------------------------------------
   History — lawan dari lonceng "Belum dinilai".

   Lonceng menjawab "apa yang masih ditunggu"; halaman ini menjawab "apa yang
   sudah masuk, siapa yang menetapkannya, dan kapan". Keduanya membaca data
   yang sama, jadi tidak mungkin berselisih.

   Satu pembedaan yang dijaga ketat, karena inilah yang sering disalahpahami:

     FINAL      aspeknya sudah dikunci Kemahasiswaan — nilainya tidak akan
                berubah lagi. Barulah pantas disebut "disetujui".
     SEMENTARA  nilainya sudah masuk dari penilai, tetapi aspeknya belum
                dikunci, jadi masih bisa berubah. Menyebutnya "disetujui" akan
                menyesatkan.

   Karena itu kalimat tiap barisnya berbeda: "Disetujui oleh ..." hanya untuk
   yang final, dan "Dinilai oleh ... — belum dikunci" untuk yang sementara.
   -------------------------------------------------------------------------- */

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

/* ------------------------------ satu catatan ------------------------------ */

function Catatan({ e }) {
  const t = useTeks()
  return (
    <li className="flex items-start gap-4 border-b border-line px-5 py-4 last:border-0 sm:px-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[13px] font-bold text-ink">
        {e.aspek.kode}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-ink-2">{e.aspek.nama}</span>
        <span className="mt-0.5 block text-[15px] font-bold leading-snug text-ink">{e.k.label}</span>
        <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-2">
          {t('dari {sumber}', { sumber: SUMBER[e.k.sumber]?.label ?? e.k.sumber })},{' '}
          {t(e.final ? 'disetujui oleh' : 'dinilai oleh')}{' '}
          <span className="font-semibold text-ink">
            {e.k.penilai ?? t('penilai tidak tercatat')}
          </span>
          {e.k.tanggal ? ' · ' + tanggalPanjang(t, e.k.tanggal) : ''}
          {e.final ? '' : t(' (belum dikunci, masih bisa berubah)')}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-[20px] font-extrabold leading-none text-ink">{e.k.nilai}</span>
        <span className="mt-2 block">
          <StatusTeks kuat={e.final}>{t(e.final ? 'Final' : 'Sementara')}</StatusTeks>
        </span>
      </span>
    </li>
  )
}

/* --------------------------- pengajuan koreksi ---------------------------- */

const LENCANA_KOREKSI = {
  disetujui: { tone: 'good', icon: IconCheck, teks: 'Disetujui' },
  ditolak: { tone: 'critical', icon: IconX, teks: 'Ditolak' },
  menunggu: { tone: 'neutral', icon: IconClock, teks: 'Menunggu keputusan' },
}

function Koreksi({ k }) {
  const t = useTeks()
  const lencana = LENCANA_KOREKSI[k.status] ?? LENCANA_KOREKSI.menunggu
  const aspek = getAspek(k.aspekId)

  return (
    <li className="border-b border-line px-5 py-4 last:border-0 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-2">
            {aspek ? aspek.kode + ' ' + aspek.nama : k.aspekId}
          </p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-ink">{k.komponenLabel}</p>
        </div>
        <Badge tone={lencana.tone} icon={lencana.icon}>
          {t(lencana.teks)}
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
        </p>
      ) : (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          {t('Belum ada keputusan dari Biro Kemahasiswaan.')}
        </p>
      )}
    </li>
  )
}

/* --------------------------------- halaman -------------------------------- */

export default function Riwayat() {
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  useStore()
  const t = useTeks()
  const student = useStudent()
  const tr = transkripOf(student)
  const [tab, setTab] = useState('semua')

  /* Hanya komponen yang benar-benar sudah ada nilainya. Yang belum masuk
     tempatnya di lonceng, bukan di riwayat. */
  const semua = tr.aspek
    .filter((a) => !a.terkunci)
    .flatMap((a) =>
      a.komponen
        .filter((k) => k.terisi)
        .map((k) => ({ k, aspek: a.aspek, final: a.status === 'final' })),
    )
    .sort((x, y) => String(y.k.tanggal ?? '').localeCompare(String(x.k.tanggal ?? '')))

  const menunggu = tr.aspek
    .filter((a) => !a.terkunci)
    .reduce((n, a) => n + a.komponenKosong.length, 0)

  const aktif = TAB.find((x) => x.id === tab)
  const daftar = semua.filter(aktif.cocok)

  /* Dikelompokkan per bulan supaya terbaca sebagai riwayat, bukan tabel. */
  const kelompok = []
  for (const e of daftar) {
    const label = bulanTahun(t, e.k.tanggal)
    const akhir = kelompok[kelompok.length - 1]
    if (akhir && akhir.label === label) akhir.isi.push(e)
    else kelompok.push({ label, isi: [e] })
  }

  const koreksi = koreksiMilik(student.nim)

  return (
    <div className="space-y-6">
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

      <section className="kartu overflow-hidden">
        <div className="px-5 pb-3 pt-5 sm:px-6">
          <h2 className="text-[17px] font-extrabold text-ink">{t('Riwayat penilaian')}</h2>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">{t('Final')}</span>{' '}
            {t('berarti aspeknya sudah dikunci Kemahasiswaan dan nilainya tidak akan berubah lagi.')}
          </p>
        </div>

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
                '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-bold transition ' +
                (x.id === tab
                  ? 'border-brand-ink text-brand-ink'
                  : 'border-transparent text-ink-2 hover:text-ink')
              }
            >
              {t(x.label)}
              <span className="ml-1.5 font-semibold text-ink-3">{semua.filter(x.cocok).length}</span>
            </button>
          ))}
        </div>

        {kelompok.length ? (
          kelompok.map((g) => (
            <section key={g.label}>
              <h3 className="border-b border-line bg-surface-2 px-5 py-2 text-[12.5px] font-bold uppercase tracking-[.06em] text-ink-2 sm:px-6">
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
          <p className="px-6 py-10 text-center text-[14px] text-ink-2">
            {t('Belum ada catatan pada kelompok ini.')}
          </p>
        )}

        <Link
          href="/mahasiswa/transkrip"
          className="flex items-center justify-center gap-1.5 border-t border-line px-5 py-3.5 text-[14px] font-bold text-brand-ink transition hover:bg-surface-2"
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
