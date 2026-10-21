'use client'

import { useMemo, useState } from 'react'
import {
  Badge,
  Card,
  CatatanKaki,
  EmptyState,
  GulirTabel,
  JUDUL_KOLOM,
  JudulHalaman,
  KartuAngka,
  TabSaring,
} from '../../components/Ui'
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
import { USULAN_NILAI, menungguPersetujuan, putuskanUsulan, useStore } from '../../lib/store'
import { PesanMenunggu } from './PermintaanTerkirim'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Dua lapis konfirmasi: sistem lalu orang; lihat README.md › Usulan nilai dosen. Susunannya mengikuti halaman
   daftar lain di panel ini: kepala halaman, tiga angka, lalu satu kartu antrean dengan tab berjumlah. */

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
    <div className="space-y-6">
      <JudulHalaman
        judul={t('Persetujuan Nilai Dosen')}
        keterangan={t('Nilai yang dikirim dosen tertahan di sini sampai disetujui. Sebelum Anda memutuskan, sistem sudah memeriksa tiap barisnya lebih dulu.')}
      />

      <section aria-label={t('Ringkasan angka')} className="grid gap-5 md:grid-cols-3">
        <KartuAngka
          judul={t('Usulan menunggu keputusan')}
          nilai={menunggu.length.toLocaleString('id-ID')}
          satuan={t('berisi {n} nilai', { n: nilaiMenunggu.toLocaleString('id-ID') })}
          keterangan={
            menunggu.length
              ? t('Dari {n} dosen pengampu.', { n: dosenTerlibat }) + ' ' + t('Tidak satu pun sudah masuk transkrip.')
              : semua.length
                ? t('Tidak ada yang tertahan. Seluruh usulan dosen sudah diputuskan.')
                : t('Belum ada usulan dari dosen.')
          }
        />
        <KartuAngka
          judul={t('Disetujui')}
          nilai={diputuskan.filter((u) => u.status === 'disetujui').length.toLocaleString('id-ID')}
          satuan={t('usulan')}
          keterangan={t('Masuk sebagai batch di Riwayat Batch halaman Input Nilai.')}
        />
        <KartuAngka
          judul={t('Ditolak')}
          nilai={diputuskan.filter((u) => u.status === 'ditolak').length.toLocaleString('id-ID')}
          satuan={t('usulan')}
          keterangan={t('Dikembalikan ke dosen beserta alasannya.')}
        />
      </section>

      <Card className="overflow-hidden">
        <TabSaring
          label={t('Antrean usulan')}
          nilai={tab}
          onPilih={(v) => {
            setTab(v)
            setBuka(null)
          }}
          pilihan={[
            { nilai: 'menunggu', label: t('Menunggu'), n: menunggu.length },
            { nilai: 'riwayat', label: t('Sudah diputuskan'), n: diputuskan.length },
          ]}
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

        <div className="border-t border-line px-5 pb-4 sm:px-6">
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
  const [menunggu, setMenunggu] = useState(null)
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
      const hasil = await putuskanUsulan(u.id, keputusan, { aktor, catatan })
      if (!hasil) {
        setGalat(t('Usulan ini sudah diputuskan sebelumnya.'))
        return
      }
      // Usulan untuk mahasiswa yang sudah lewat Semester 3: persetujuannya menunggu super admin.
      setMenunggu(menungguPersetujuan(hasil) ? hasil : null)
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
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-offset-[-3px] sm:px-6"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <IconCheckShield size={18} />
        </span>
        <span className="min-w-[220px] flex-1">
          <span className="block text-[14.5px] font-bold leading-snug text-ink">{u.dosenNama}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">
            <span className="font-mono">{u.id}</span> ·{' '}
            {t('{n} nilai, {unit} Semester {semester}', {
              n: u.entri.length,
              unit: SUMBER[u.sumber]?.label ?? u.sumber,
              semester: u.semester,
            })}
            {u.prodi ? ', ' + u.prodi : ''} · {t(u.cara === 'manual' ? 'input manual' : 'unggah berkas')}
          </span>
        </span>
        <span className="text-[12.5px] tabular-nums text-ink-2">{u.waktu}</span>
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
        <div id={'u-' + u.id} className="animate-rise border-t border-line bg-surface-2 px-5 pb-5 pt-4 sm:px-6">
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
                    className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[color:var(--teks-kritis,var(--critical))]"
                  >
                    <IconX size={13} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-mono">{x.nim || t('(kosong)')}</span>: {x.alasan.join('; ')}
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
          <GulirTabel className="rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[480px] border-separate border-spacing-0">
              <thead>
                <tr className="[&>th]:border-b [&>th]:border-line">
                  <th className={JUDUL_KOLOM + ' pl-4 text-left'}>{t('Mahasiswa')}</th>
                  <th className={JUDUL_KOLOM + ' text-left'}>{t('Komponen')}</th>
                  <th className={JUDUL_KOLOM + ' pr-4 text-right'}>{t('Nilai')}</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)>td]:border-b [&>tr>td]:border-line">
                {u.entri.slice(0, 30).map((e) => (
                  <tr key={e.nim + e.komponenId}>
                    <td className="py-2.5 pl-4 pr-3">
                      <span className="block text-[13.5px] font-semibold text-ink">{e.nama}</span>
                      <span className="block font-mono text-[12px] text-ink-3">{e.nim}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12.5px] text-ink-2">{e.komponenId}</td>
                    <td className="py-2.5 pl-3 pr-4 text-right text-[14px] font-bold tabular-nums text-ink">{e.nilai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GulirTabel>
          {u.entri.length > 30 ? (
            <p className="mt-2 text-[12.5px] text-ink-3">
              {t('Menampilkan 30 dari {n} baris. Seluruhnya tetap ikut diproses.', {
                n: u.entri.length,
              })}
            </p>
          ) : null}

          {/* ------------------------------ keputusan --------------------------- */}
          {u.status === 'menunggu' ? (
            <div className="mt-4 space-y-3">
              <label className="block max-w-2xl">
                <span className="mb-1.5 block text-[13px] font-semibold text-ink">
                  {t('Catatan keputusan (wajib bila menolak)')}
                </span>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder={t('Misalnya: nilai UAS belum termasuk komponen presentasi.')}
                  className="field !py-2.5"
                />
              </label>
              {galat ? (
                <p
                  role="alert"
                  className="flex animate-rise items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]"
                >
                  <IconAlert size={16} className="mt-px shrink-0" />
                  {galat}
                </p>
              ) : null}
              {menunggu ? <PesanMenunggu hasil={menunggu} /> : null}
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => putuskan('disetujui')}
                  disabled={!periksa.diterima.length}
                  className="btn-primary"
                >
                  <IconCheck size={16} />
                  {t('Setujui {n} nilai', { n: periksa.diterima.length })}
                </button>
                <button
                  type="button"
                  onClick={() => putuskan('ditolak')}
                  className="btn-ghost hover:border-[var(--critical)] hover:text-[color:var(--teks-kritis,var(--critical))]"
                >
                  <IconUndo size={15} />
                  {t('Tolak usulan')}
                </button>
              </div>
              {!periksa.diterima.length ? (
                <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-3">
                  <IconInfo size={13} className="mt-px shrink-0" />
                  {t('Tidak ada baris yang lolos pemeriksaan sistem, jadi tidak ada yang bisa disetujui. Tolak usulannya dengan alasan agar dosen bisa mengirim ulang.')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              <span className="font-bold text-ink">
                {t(u.status === 'disetujui' ? 'Disetujui oleh' : 'Ditolak oleh')} {u.keputusan?.oleh}
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
