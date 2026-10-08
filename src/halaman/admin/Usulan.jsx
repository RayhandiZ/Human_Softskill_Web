'use client'

import { useMemo, useState } from 'react'
import { Badge, Card, CardHeader, CatatanKaki, EmptyState, Tabs } from '../../components/Ui'
import {
  IconAlert,
  IconCheck,
  IconCheckShield,
  IconChevronDown,
  IconClock,
  IconInfo,
  IconUndo,
  IconX,
} from '../../components/Icons'
import { SUMBER } from '../../lib/curriculum'
import { getStudentByNim } from '../../lib/data'
import { periksaUsulan } from '../../lib/rules'
import { USULAN_NILAI, putuskanUsulan, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Dua lapis konfirmasi: sistem lalu orang; lihat README.md › Usulan nilai dosen. */

const RUPA = {
  menunggu: { label: 'Menunggu keputusan', tone: 'warning', icon: IconClock },
  disetujui: { label: 'Disetujui', tone: 'good', icon: IconCheck },
  ditolak: { label: 'Ditolak', tone: 'critical', icon: IconAlert },
}

export default function Usulan() {
  const t = useTeks()
  const versi = useStore()
  const { admin } = useAuth()
  const aktor = admin.officer

  const [tab, setTab] = useState('menunggu')
  const [buka, setBuka] = useState(null)

  const semua = useMemo(() => [...USULAN_NILAI], [versi])
  const menunggu = semua.filter((u) => u.status === 'menunggu')
  const diputuskan = semua.filter((u) => u.status !== 'menunggu')
  const daftar = tab === 'menunggu' ? menunggu : diputuskan

  const nilaiMenunggu = menunggu.reduce((n, u) => n + u.entri.length, 0)
  const dosenTerlibat = new Set(menunggu.map((u) => u.dosenNip)).size

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
          {t('Persetujuan nilai dosen')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          {t('Nilai yang dikirim dosen tertahan di sini sampai disetujui. Sebelum Anda memutuskan, sistem sudah memeriksa tiap barisnya lebih dulu.')}
        </p>
      </header>

      <Card className="px-6 py-7">
        <p className="text-[15px] font-semibold text-ink-2">{t('Usulan menunggu keputusan')}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-[46px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {menunggu.length}
          </span>
          <span className="text-[18px] font-semibold text-ink-2">
            {t('berisi {n} nilai', { n: nilaiMenunggu.toLocaleString('id-ID') })}
          </span>
        </p>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
          {menunggu.length
            ? t('Dari {n} dosen pengampu.', { n: dosenTerlibat }) +
              ' ' +
              t('Tidak satu pun sudah masuk transkrip.')
            : semua.length
              ? t('Tidak ada yang tertahan. Seluruh usulan dosen sudah diputuskan.')
              : t('Belum ada usulan dari dosen.')}
        </p>
      </Card>

      <Card>
        <CardHeader
          title={t('Antrean usulan')}
          subtitle={t('Buka satu usulan untuk melihat nilainya dan hasil pemeriksaan sistem')}
          icon={IconCheckShield}
          action={
            <Tabs
              items={[
                { value: 'menunggu', label: t('Menunggu'), count: menunggu.length },
                { value: 'riwayat', label: t('Sudah diputuskan'), count: diputuskan.length },
              ]}
              value={tab}
              onChange={(v) => {
                setTab(v)
                setBuka(null)
              }}
            />
          }
        />

        {daftar.length ? (
          <ul className="divide-y divide-line">
            {daftar.map((u) => (
              <BarisUsulan
                key={u.id}
                usulan={u}
                aktor={aktor}
                terbuka={buka === u.id}
                onToggle={() => setBuka(buka === u.id ? null : u.id)}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={t(
              tab === 'menunggu'
                ? 'Tidak ada usulan yang menunggu'
                : 'Belum ada usulan yang diputuskan',
            )}
          >
            {t(
              tab === 'menunggu'
                ? 'Usulan baru akan muncul di sini begitu dosen mengirim nilai.'
                : 'Keputusan yang sudah diambil akan tercatat di sini lengkap dengan alasannya.',
            )}
          </EmptyState>
        )}

        <div className="px-5 pb-5 sm:px-6">
          <CatatanKaki>
            {t('Usulan yang disetujui masuk sebagai satu batch di Riwayat Batch halaman Input Nilai. Bila ternyata keliru, seluruh nilainya masih bisa dibatalkan sekaligus.')}
          </CatatanKaki>
        </div>
      </Card>
    </div>
  )
}

function BarisUsulan({ usulan: u, aktor, terbuka, onToggle }) {
  const t = useTeks()
  const [catatan, setCatatan] = useState('')
  const [galat, setGalat] = useState('')
  const r = RUPA[u.status] ?? RUPA.menunggu

  const periksa = useMemo(
    () => periksaUsulan(u.entri, { cariMahasiswa: getStudentByNim, sumber: u.sumber }),
    [u],
  )
  const gagal = periksa.ditolak

  async function putuskan(keputusan) {
    setGalat('')
    if (keputusan === 'ditolak' && !catatan.trim()) {
      setGalat(t('Alasan penolakan wajib diisi. Dosen perlu tahu apa yang harus diperbaiki.'))
      return
    }
    try {
      if (!(await putuskanUsulan(u.id, keputusan, { aktor, catatan }))) {
        setGalat(t('Usulan ini sudah diputuskan sebelumnya.'))
        return
      }
      setCatatan('')
    } catch (e) {
      setGalat(e.message)
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        aria-controls={'u-' + u.id}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 text-left transition hover:bg-surface-2 sm:px-6"
      >
        <span className="font-mono text-[12.5px] font-bold text-ink">{u.id}</span>
        <span className="min-w-[220px] flex-1">
          <span className="block text-[14px] font-bold leading-snug text-ink">{u.dosenNama}</span>
          <span className="block text-[12.5px] leading-snug text-ink-2">
            {t('{n} nilai, {unit} Semester {semester}', {
              n: u.entri.length,
              unit: SUMBER[u.sumber]?.label ?? u.sumber,
              semester: u.semester,
            })}
            {u.prodi ? ', ' + u.prodi : ''} ·{' '}
            {t(u.cara === 'manual' ? 'input manual' : 'unggah berkas')}
          </span>
        </span>
        <span className="text-[12.5px] tabular-nums text-ink-3">{u.waktu}</span>
        {gagal.length && u.status === 'menunggu' ? (
          <Badge tone="critical" icon={IconAlert}>
            {t('{n} ditolak sistem', { n: gagal.length })}
          </Badge>
        ) : null}
        <Badge tone={r.tone} icon={r.icon}>
          {t(r.label)}
        </Badge>
        <IconChevronDown
          size={17}
          className={'shrink-0 text-ink-3 transition-transform ' + (terbuka ? 'rotate-180' : '')}
        />
      </button>

      {terbuka ? (
        <div id={'u-' + u.id} className="bg-surface-2 px-5 pb-5 pt-1 sm:px-6">
          {u.catatan ? (
            <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
              <span className="font-bold text-ink">{t('Catatan dosen')}:</span> {u.catatan}
            </p>
          ) : null}

          {/* --------------------- hasil pemeriksaan sistem --------------------- */}
          <div className="mb-3 rounded-xl border border-line bg-surface px-4 py-3">
            <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <IconCheckShield size={16} className="text-brand-ink" />
              {t('Pemeriksaan sistem')}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {t('{n} baris lolos', { n: periksa.diterima.length })}
              {gagal.length
                ? t(', {n} ditolak dan tidak akan ikut ditulis', { n: gagal.length })
                : t(', seluruhnya bersih')}
              .
            </p>
            {gagal.length ? (
              <ul className="mt-2 space-y-1">
                {gagal.slice(0, 6).map((x) => (
                  <li
                    key={x.nim + x.komponenId + x.nomor}
                    className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[var(--critical)]"
                  >
                    <IconX size={13} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-mono">{x.nim || '(kosong)'}</span>: {x.alasan.join('; ')}
                    </span>
                  </li>
                ))}
                {gagal.length > 6 ? (
                  <li className="text-[12.5px] text-ink-3">
                    {t('…dan {n} baris lagi.', { n: gagal.length - 6 })}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          {/* ----------------------------- isi usulan --------------------------- */}
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[480px] border-collapse">
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
                {u.entri.slice(0, 30).map((e) => (
                  <tr key={e.nim + e.komponenId}>
                    <td className="px-4 py-2.5">
                      <span className="block text-[13.5px] font-semibold text-ink">{e.nama}</span>
                      <span className="block font-mono text-[12px] text-ink-3">{e.nim}</span>
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
          {u.entri.length > 30 ? (
            <p className="mt-2 text-[12.5px] text-ink-3">
              {t('Menampilkan 30 dari {n} baris. Seluruhnya tetap ikut diproses.', {
                n: u.entri.length,
              })}
            </p>
          ) : null}

          {/* ------------------------------ keputusan --------------------------- */}
          {u.status === 'menunggu' ? (
            <div className="mt-4">
              <label className="block">
                <span className="mb-1.5 block label">
                  {t('Catatan keputusan (wajib bila menolak)')}
                </span>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder={t('Misalnya: nilai UAS belum termasuk komponen presentasi.')}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 transition hover:border-line-strong"
                />
              </label>
              {galat ? (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[var(--critical)]"
          >
            <IconAlert size={16} className="mt-px shrink-0" />
            {galat}
          </p>
        ) : null}
              <div className="mt-3 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => putuskan('disetujui')}
                  disabled={!periksa.diterima.length}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IconCheck size={16} />
                  {t('Setujui {n} nilai', { n: periksa.diterima.length })}
                </button>
                <button
                  type="button"
                  onClick={() => putuskan('ditolak')}
                  className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-[13.5px] font-bold text-ink-2 transition hover:border-[var(--critical)] hover:text-[var(--critical)]"
                >
                  <IconUndo size={15} />
                  {t('Tolak usulan')}
                </button>
              </div>
              {!periksa.diterima.length ? (
                <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-3">
                  <IconInfo size={13} className="mt-px shrink-0" />
                  {t('Tidak ada baris yang lolos pemeriksaan sistem, jadi tidak ada yang bisa disetujui. Tolak usulannya dengan alasan agar dosen bisa mengirim ulang.')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              <span className="font-bold text-ink">
                {t(u.status === 'disetujui' ? 'Disetujui oleh' : 'Ditolak oleh')}{' '}
                {u.keputusan?.oleh}
              </span>{' '}
              {t('pada')} {u.keputusan?.tanggal}
              {u.keputusan?.catatan ? '. ' + u.keputusan.catatan : ''}
              {u.batchId ? ' · ' + t('tercatat sebagai batch {id}', { id: u.batchId }) : ''}
              {u.ditolakSistem?.length
                ? ' · ' +
                  t('{n} baris tidak ikut ditulis karena ditolak sistem', {
                    n: u.ditolakSistem.length,
                  })
                : ''}
            </p>
          )}
        </div>
      ) : null}
    </li>
  )
}
