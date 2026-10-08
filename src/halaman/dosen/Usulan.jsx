'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CatatanKaki, EmptyState, StatusTeks } from '../../components/Ui'
import {
  IconCheckShield,
  IconChevronDown,
  IconPencil,
} from '../../components/Icons'
import { SUMBER } from '../../lib/curriculum'
import { dosenSesi } from '../../lib/data'
import { useStore, usulanDosen } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

const RUPA = {
  menunggu: { label: 'Menunggu keputusan' },
  disetujui: { label: 'Disetujui' },
  ditolak: { label: 'Ditolak', perluTindakan: true },
}

export default function UsulanDosen() {
  const t = useTeks()
  const versi = useStore()
  const { user } = useAuth()
  const dosen = useMemo(() => dosenSesi(user), [user])
  const [buka, setBuka] = useState(null)

  const daftar = useMemo(() => (dosen ? usulanDosen(dosen.nip) : []), [dosen, versi])

  const hitung = useMemo(() => {
    const h = { menunggu: 0, disetujui: 0, ditolak: 0, nilai: 0 }
    for (const u of daftar) {
      h[u.status]++
      if (u.status === 'disetujui') h.nilai += u.entri.length
    }
    return h
  }, [daftar])

  if (!dosen) {
    return (
      <EmptyState title={t('Akun ini belum terdaftar sebagai dosen pengampu')}>
        {t('Hubungi Biro Kemahasiswaan untuk didaftarkan pada satu kelas.')}
      </EmptyState>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
          {t('Status usulan')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t(
            'Setiap pengiriman nilai tercatat sebagai satu usulan. Di sini terlihat mana yang masih menunggu, mana yang sudah masuk transkrip, dan mana yang ditolak beserta alasannya.',
          )}
        </p>
      </header>

      <Card className="px-6 py-7">
        <p className="text-[15px] font-semibold text-ink-2">{t('Menunggu keputusan')}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-[46px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {hitung.menunggu}
          </span>
          <span className="text-[18px] font-semibold text-ink-2">
            {t('dari {n} usulan', { n: daftar.length })}
          </span>
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          {t('{n} usulan disetujui, {nilai} nilai sudah tercatat di transkrip mahasiswa', {
            n: hitung.disetujui,
            nilai: hitung.nilai,
          })}
          {hitung.ditolak ? t(', {n} usulan ditolak', { n: hitung.ditolak }) : ''}.
        </p>
      </Card>

      <Card>
        <CardHeader
          title={t('Riwayat usulan')}
          subtitle={t('Terbaru di atas; ketuk satu baris untuk melihat nilainya')}
          icon={IconCheckShield}
          action={
            <Link
              href="/dosen/nilai"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12.5px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink"
            >
              <IconPencil size={14} />
              {t('Usulkan nilai')}
            </Link>
          }
        />

        {daftar.length ? (
          <ul className="divide-y divide-line">
            {daftar.map((u) => {
              const r = RUPA[u.status] ?? RUPA.menunggu
              const terbuka = buka === u.id
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setBuka(terbuka ? null : u.id)}
                    aria-expanded={terbuka}
                    aria-controls={'usulan-' + u.id}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 text-left transition hover:bg-surface-2 sm:px-6"
                  >
                    <span className="font-mono text-[12.5px] font-bold text-ink">{u.id}</span>
                    <span className="min-w-[180px] flex-1 text-[13.5px] text-ink-2">
                      {t('{n} nilai, {unit} Semester {semester}', {
                        n: u.entri.length,
                        unit: SUMBER[u.sumber]?.label ?? u.sumber,
                        semester: u.semester,
                      })}{' '}
                      · {t(u.cara === 'manual' ? 'input manual' : 'unggah berkas')}
                    </span>
                    <span className="text-[12.5px] tabular-nums text-ink-3">{u.waktu}</span>
                    <StatusTeks kuat={Boolean(r.perluTindakan)}>{t(r.label)}</StatusTeks>
                    <IconChevronDown
                      size={17}
                      className={
                        'shrink-0 text-ink-3 transition-transform ' + (terbuka ? 'rotate-180' : '')
                      }
                    />
                  </button>

                  {terbuka ? (
                    <div id={'usulan-' + u.id} className="bg-surface-2 px-5 pb-5 pt-1 sm:px-6">
                      {u.catatan ? (
                        <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
                          <span className="font-bold text-ink">{t('Catatan Anda')}:</span> {u.catatan}
                        </p>
                      ) : null}

                      {u.keputusan ? (
                        <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
                          <span className="font-bold text-ink">
                            {t(u.status === 'disetujui' ? 'Disetujui oleh' : 'Ditolak oleh')}{' '}
                            {u.keputusan.oleh}
                          </span>{' '}
                          {t('pada')} {u.keputusan.tanggal}
                          {u.keputusan.catatan ? '. ' + u.keputusan.catatan : ''}
                          {u.batchId ? ' · ' + t('batch {id}', { id: u.batchId }) : ''}
                        </p>
                      ) : null}

                      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                        <table className="w-full min-w-[420px] border-collapse">
                          <thead>
                            <tr className="border-b border-line">
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                                {t('Mahasiswa')}
                              </th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                                {t('Komponen')}
                              </th>
                              <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[.07em] text-ink-3">
                                {t('Nilai')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {u.entri.map((e) => (
                              <tr key={e.nim + e.komponenId}>
                                <td className="px-4 py-2.5">
                                  <span className="block text-[13.5px] font-semibold text-ink">
                                    {e.nama}
                                  </span>
                                  <span className="block font-mono text-[12px] text-ink-3">
                                    {e.nim}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[12.5px] text-ink-2">
                                  {e.komponenId}
                                </td>
                                <td className="px-4 py-2.5 text-right text-[14px] font-bold tabular-nums text-ink">
                                  {e.nilai}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState title={t('Belum ada usulan terkirim')}>
            {t('Isi nilai di halaman Input Nilai; setiap pengiriman akan muncul di sini beserta statusnya.')}
          </EmptyState>
        )}

        <div className="px-5 pb-5 sm:px-6">
          <CatatanKaki>
            {t('Usulan yang ditolak tidak mengubah apa pun. Perbaiki nilainya lalu kirim ulang dari halaman Input Nilai.')}
          </CatatanKaki>
        </div>
      </Card>
    </div>
  )
}
