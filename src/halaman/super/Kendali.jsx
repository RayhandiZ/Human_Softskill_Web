import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, EmptyState } from '../../components/Ui'
import { IconCheckShield, IconChevronRight, IconInfo, IconList, IconUsers } from '../../components/Icons'
import { AUDIT_LOG, COHORTS, STUDENTS } from '../../lib/data'
import { PERMINTAAN, bacaLog, permintaanMenunggu, useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'
import { LABEL_AKSI } from '../admin/PersetujuanAdmin'
import { LABEL_LOG, tanggalWib } from '../admin/Log'

/* Pusat Kendali Super Admin: yang perlu diputuskan, yang baru terjadi, dan rantai pengawasan.
   Lihat README.md › Panel Super Admin. */

const RANTAI = [
  { peran: 'Super Admin', tugas: 'Menyetujui permintaan admin dan mengawasi seluruh jejak tindakan.' },
  { peran: 'Kemahasiswaan', tugas: 'Mengelola nilai, angkatan, kurikulum, dan sertifikat.' },
  { peran: 'Dosen', tugas: 'Mengusulkan nilai mahasiswa di kelasnya.' },
  { peran: 'Mahasiswa', tugas: 'Melihat capaian dan mengajukan koreksi nilai.' },
]

function Ubin({ label, nilai, catatan, ke, tautan, sorot = false }) {
  return (
    <div className={'card card-pad flex flex-col ' + (sorot ? 'ring-2 ring-[var(--accent)]' : '')}>
      <span className="label">{label}</span>
      <span className="mt-3 text-[32px] font-extrabold leading-none tracking-tight text-ink tabular-nums">{nilai}</span>
      {catatan ? <span className="mt-2 text-[13px] leading-snug text-ink-2">{catatan}</span> : null}
      {ke ? (
        <Link href={ke} className="mt-auto inline-flex items-center gap-1 pt-3 text-[13px] font-bold text-brand-ink hover:underline">
          {tautan}
          <IconChevronRight size={15} />
        </Link>
      ) : null}
    </div>
  )
}

function TautanKaki({ href, children }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 border-t border-line px-5 py-3 text-[13.5px] font-bold text-brand-ink transition hover:bg-surface-2 sm:px-6"
    >
      {children}
      <IconChevronRight size={16} />
    </Link>
  )
}

export default function Kendali() {
  useStore()
  const t = useTeks()
  const [aktivitas, setAktivitas] = useState(null)

  useEffect(() => {
    let batal = false
    bacaLog({ jenis: 'aktivitas', ukuran: 6 })
      .then((h) => !batal && setAktivitas(h))
      .catch((e) => !batal && setAktivitas({ galat: e.message, baris: [] }))
    return () => {
      batal = true
    }
  }, [])

  const sejak = tanggalWib(6)
  const dalamSepekan = (waktu) => String(waktu ?? '').slice(0, 10) >= sejak
  // Terlama di atas: yang paling lama menunggu diputuskan lebih dulu.
  const menunggu = [...permintaanMenunggu()].sort((a, b) => String(a.diajukanPada).localeCompare(String(b.diajukanPada)))
  const diputuskan = PERMINTAAN.filter((p) => p.status !== 'menunggu' && dalamSepekan(p.diputuskanPada)).length
  const perubahanNilai = AUDIT_LOG.filter((l) => dalamSepekan(l.waktu)).length
  const terkunci = COHORTS.filter((c) => c.status === 'terkunci').length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Pusat Kendali')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t('Pengawasan seluruh sistem Human Skill: permintaan yang perlu diputuskan, jejak tindakan, dan aturan yang berlaku.')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Ubin
          label={t('Menunggu keputusan')}
          nilai={menunggu.length}
          catatan={t(menunggu.length ? 'Permintaan admin menunggu persetujuan Anda.' : 'Tidak ada yang menunggu.')}
          ke="/super/persetujuan"
          tautan={t('Buka antrean')}
          sorot={menunggu.length > 0}
        />
        <Ubin
          label={t('Diputuskan 7 hari terakhir')}
          nilai={diputuskan}
          catatan={t('Disetujui, ditolak, atau gagal dijalankan.')}
        />
        <Ubin
          label={t('Perubahan nilai 7 hari terakhir')}
          nilai={perubahanNilai}
          catatan={t('Dari {n} mahasiswa terdaftar.', { n: STUDENTS.length })}
          ke="/super/log"
          tautan={t('Telusuri di log')}
        />
        <Ubin
          label={t('Angkatan terkunci')}
          nilai={terkunci + ' / ' + COHORTS.length}
          catatan={t('Angkatan terkunci tidak bisa diubah tanpa alasan.')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader
            icon={IconCheckShield}
            title={t('Perlu keputusan Anda')}
            subtitle={t('Diurutkan dari yang paling lama menunggu.')}
          />
          {menunggu.length ? (
            <ul className="flex-1 divide-y divide-line">
              {menunggu.slice(0, 5).map((p) => (
                <li key={p.id} className="px-5 py-3.5 sm:px-6">
                  <p className="text-[14px] font-bold text-ink">
                    {t(LABEL_AKSI[p.aksi] ?? p.aksi)}
                    <span className="font-semibold text-ink-3"> · {p.id}</span>
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {t('Diajukan {siapa} pada {kapan}', { siapa: p.diajukanOleh ?? '—', kapan: p.diajukanPada ?? '—' })}
                  </p>
                  {p.alasan ? <p className="mt-1 line-clamp-2 text-[13px] italic text-ink-2">“{p.alasan}”</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1">
              <EmptyState title={t('Tidak ada permintaan yang menunggu')}>
                {t('Permintaan admin untuk mahasiswa yang sudah lewat Semester 3 akan muncul di sini.')}
              </EmptyState>
            </div>
          )}
          <TautanKaki href="/super/persetujuan">{t('Buka antrean persetujuan')}</TautanKaki>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <CardHeader
            icon={IconList}
            title={t('Tindakan admin terbaru')}
            subtitle={t('Enam catatan terakhir dari Log Aktivitas.')}
          />
          {aktivitas === null ? (
            <p className="flex-1 px-5 py-6 text-[13.5px] text-ink-3 sm:px-6">{t('Memuat…')}</p>
          ) : aktivitas.galat ? (
            <p role="alert" className="flex-1 px-5 py-6 text-[13.5px] font-semibold text-[var(--critical)] sm:px-6">
              {aktivitas.galat}
            </p>
          ) : aktivitas.lokal ? (
            <p className="flex flex-1 items-start gap-2 px-5 py-6 text-[13.5px] text-ink-2 sm:px-6">
              <IconInfo size={15} className="mt-0.5 shrink-0" />
              {t('Tindakan admin hanya tercatat saat website terhubung ke basis data.')}
            </p>
          ) : aktivitas.baris.length ? (
            <ul className="flex-1 divide-y divide-line">
              {aktivitas.baris.map((b) => (
                <li key={b.id} className="px-5 py-3 sm:px-6">
                  <p className="text-[13.5px] text-ink">
                    <span className="font-bold">{b.aktor ?? '—'}</span> · {t(LABEL_LOG[b.aksi] ?? b.aksi)}
                  </p>
                  <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-3">
                    {b.waktu}
                    {b.target ? ' · ' + b.target : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1">
              <EmptyState title={t('Belum ada tindakan admin yang tercatat')} />
            </div>
          )}
          <TautanKaki href="/super/log">{t('Lihat seluruh log')}</TautanKaki>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          icon={IconUsers}
          title={t('Rantai pengawasan')}
          subtitle={t('Setiap peran diawasi peran di atasnya.')}
        />
        <ol className="grid gap-3 p-5 sm:p-6 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
          {RANTAI.map((r, i) => (
            <li
              key={r.peran}
              className={'rounded-2xl px-4 py-3.5 ' + (i === 0 ? 'bg-brand-deep text-white' : 'border border-line bg-surface-2 text-ink')}
            >
              <p className="text-[14px] font-extrabold">
                {t(r.peran)}
                {i === 0 ? (
                  <span className="ml-2 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--accent)]">{t('Anda')}</span>
                ) : null}
              </p>
              <p className={'mt-1 text-[13px] leading-snug ' + (i === 0 ? 'text-white/80' : 'text-ink-2')}>{t(r.tugas)}</p>
            </li>
          ))}
        </ol>
        <TautanKaki href="/super/wewenang">{t('Lihat matriks peran & wewenang')}</TautanKaki>
      </Card>
    </div>
  )
}
