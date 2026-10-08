'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardHeader,
  CatatanKaki,
  EmptyState,
  SearchInput,
  Select,
  StatTile,
} from '../../components/Ui'
import {
  IconChevronRight,
  IconDocument,
  IconInbox,
  IconPencil,
} from '../../components/Icons'
import { SUMBER } from '../../lib/curriculum'
import { dosenSesi, komponenDosen, pengumpulanDosen } from '../../lib/data'
import { statusPengumpulan, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { LencanaStatus, RUPA_STATUS, URUTAN_STATUS } from './status'
import { useTeks } from '../../lib/bahasa'

const PER_HALAMAN = 12
const SEMUA_KOMPONEN = 'Semua tugas'
const SEMUA_STATUS = 'Semua status'

export default function Masuk() {
  const versi = useStore()
  const t = useTeks()
  const { user } = useAuth()
  const dosen = useMemo(() => dosenSesi(user), [user])

  const [komponenPilih, setKomponenPilih] = useState(SEMUA_KOMPONEN)
  const [statusPilih, setStatusPilih] = useState(SEMUA_STATUS)
  const [cari, setCari] = useState('')
  const [halaman, setHalaman] = useState(1)

  const komponen = useMemo(() => komponenDosen(dosen), [dosen])

  /* Status dihitung sekali per baris supaya satu baris tidak menampilkan dua jawaban. */
  const baris = useMemo(() => {
    if (!dosen) return []
    return pengumpulanDosen(dosen.nip).map((p) => ({ ...p, status: statusPengumpulan(p) }))
  }, [dosen, versi])

  const hitung = useMemo(() => {
    const h = { masuk: 0, menunggu: 0, dinilai: 0, ditolak: 0 }
    for (const b of baris) h[b.status.id]++
    return h
  }, [baris])

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return baris.filter((b) => {
      if (komponenPilih !== SEMUA_KOMPONEN && labelKomponen(b) !== komponenPilih) return false
      if (statusPilih !== SEMUA_STATUS && RUPA_STATUS[b.status.id].label !== statusPilih) return false
      if (q && !b.nama.toLowerCase().includes(q) && !b.nim.includes(q)) return false
      return true
    })
  }, [baris, komponenPilih, statusPilih, cari])

  const totalHalaman = Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN))
  const nomor = Math.min(halaman, totalHalaman)
  const tampil = tersaring.slice((nomor - 1) * PER_HALAMAN, nomor * PER_HALAMAN)

  const ganti = (setter) => (v) => {
    setter(v)
    setHalaman(1)
  }

  /* Label dalam bahasa aktif, tetapi nilai yang disimpan tetap kalimat Indonesianya. */
  const pilihanStatus = [SEMUA_STATUS, ...URUTAN_STATUS.map((id) => RUPA_STATUS[id].label)]

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
          {t('Data masuk')}
        </h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
        <Card className="px-6 py-7">
          <p className="text-[15px] font-semibold text-ink-2">{t('Menunggu dinilai')}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[46px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
              {hitung.masuk}
            </span>
            <span className="text-[18px] font-semibold text-ink-2">
              {t('dari {n} pengumpulan', { n: baris.length })}
            </span>
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            {t(
              hitung.masuk
                ? 'Berkasnya sudah ada, nilainya belum Anda isi.'
                : baris.length
                  ? 'Tidak ada yang tertinggal. Seluruh pengumpulan sudah Anda tangani.'
                  : 'Belum ada mahasiswa yang mengumpulkan berkas.',
            )}
          </p>
          <Link
            href="/dosen/nilai"
            className="btn-primary mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px]"
          >
            <IconPencil size={16} />
            {t('Mulai menilai')}
          </Link>
        </Card>

        <div className="grid gap-5 sm:grid-cols-3">
          <StatTile
            label={t('Menunggu persetujuan')}
            value={hitung.menunggu}
            hint={t('Sudah Anda usulkan, belum diputuskan Kemahasiswaan.')}
          />
          <StatTile
            label={t('Sudah tercatat')}
            value={hitung.dinilai}
            hint={t('Disetujui dan sudah masuk transkrip.')}
          />
          <StatTile
            label={t('Ditolak')}
            value={hitung.ditolak}
            hint={t(
              hitung.ditolak ? 'Perlu Anda usulkan ulang.' : 'Belum ada usulan yang ditolak.',
            )}
          />
        </div>
      </div>

      <Card>
        <CardHeader
          title={t('Daftar pengumpulan')}
          subtitle={
            tersaring.length === baris.length
              ? t('{n} berkas dari seluruh kelas', { n: baris.length })
              : t('{n} dari {total} berkas', { n: tersaring.length, total: baris.length })
          }
          icon={IconInbox}
        />

        <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-3 sm:px-6">
          <Select
            label={t('Tugas')}
            value={komponenPilih}
            onChange={ganti(setKomponenPilih)}
            options={[SEMUA_KOMPONEN, ...komponen.map((k) => k.id + ' · ' + k.label)]}
            tampilkan={t}
          />
          <Select
            label={t('Status')}
            value={statusPilih}
            onChange={ganti(setStatusPilih)}
            options={pilihanStatus}
            tampilkan={t}
          />
          <div>
            <span className="mb-1.5 block label">{t('Cari mahasiswa')}</span>
            <SearchInput value={cari} onChange={ganti(setCari)} placeholder={t('Nama atau NIM…')} />
          </div>
        </div>

        {tampil.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <Th>{t('Mahasiswa')}</Th>
                    <Th>{t('Tugas yang dikumpulkan')}</Th>
                    <Th>{t('Dikumpulkan')}</Th>
                    <Th>{t('Status')}</Th>
                    <Th align="right">{t('Tindakan')}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tampil.map((b) => (
                    <tr key={b.id} className="transition hover:bg-surface-2">
                      <td className="px-4 py-3.5 align-top">
                        <span className="block text-[14px] font-bold leading-snug text-ink">
                          {b.nama}
                        </span>
                        <span className="mt-0.5 block font-mono text-[12px] text-ink-3">{b.nim}</span>
                        <span className="mt-0.5 block text-[12.5px] text-ink-3">
                          {b.angkatanLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="block max-w-[280px] text-[13.5px] leading-snug text-ink-2">
                          {b.komponenLabel}
                        </span>
                        <span className="mt-1 block font-mono text-[11.5px] text-ink-3">
                          {b.komponenId}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
                          <IconDocument size={13} />
                          {b.berkas}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="block whitespace-nowrap text-[13px] tabular-nums text-ink-2">
                          {b.waktu}
                        </span>
                        {b.terlambat ? (
                          <span className="mt-1 block text-[12px] font-semibold text-ink-2">
                            {t('Terlambat')}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <LencanaStatus id={b.status.id} />
                        {b.status.nilai != null ? (
                          <span className="mt-1.5 block text-[12.5px] text-ink-3">
                            {t('nilai {n}', { n: b.status.nilai })}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-right align-top">
                        {b.status.id === 'dinilai' ? (
                          <span className="text-[12.5px] text-ink-3">-</span>
                        ) : (
                          <Link
                            href={
                              '/dosen/nilai?komponen=' +
                              encodeURIComponent(b.komponenId) +
                              '&cari=' +
                              encodeURIComponent(b.nim)
                            }
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-3 py-2 text-[12.5px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink"
                          >
                            <IconPencil size={14} />
                            {t(b.status.id === 'ditolak' ? 'Usulkan ulang' : 'Nilai')}
                            <IconChevronRight size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalHalaman > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:px-6">
                <span className="text-[13px] text-ink-2">
                  {t('Halaman {n} dari {total}', { n: nomor, total: totalHalaman })}
                </span>
                <span className="flex gap-2">
                  <Pindah ke={nomor - 1} batas={nomor > 1} onPindah={setHalaman}>
                    {t('Sebelumnya')}
                  </Pindah>
                  <Pindah ke={nomor + 1} batas={nomor < totalHalaman} onPindah={setHalaman}>
                    {t('Berikutnya')}
                  </Pindah>
                </span>
              </div>
            ) : null}
          </>
        ) : baris.length ? (
          <EmptyState title={t('Tidak ada pengumpulan yang cocok')}>
            {t('Ubah penyaring di atas, atau kosongkan kotak pencarian.')}
          </EmptyState>
        ) : (
          <EmptyState title={t('Belum ada pengumpulan')}>
            {t('Berkas yang dikirim mahasiswa kelas ini akan muncul di sini.')}
          </EmptyState>
        )}

        <div className="px-5 pb-5 sm:px-6">
          <CatatanKaki>
            {t('Nilai yang Anda isi tidak langsung masuk transkrip. Setiap penilaian dikirim sebagai usulan dan baru tercatat setelah disetujui Biro Kemahasiswaan.')}
          </CatatanKaki>
        </div>
      </Card>
    </div>
  )
}

const labelKomponen = (b) => b.komponenId + ' · ' + b.komponenLabel

function Th({ children, align = 'left' }) {
  return (
    <th
      className={
        'px-4 py-3 text-[11px] font-bold uppercase tracking-[.07em] text-ink-3 ' +
        (align === 'right' ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  )
}

function Pindah({ ke, batas, onPindah, children }) {
  return (
    <button
      type="button"
      disabled={!batas}
      onClick={() => onPindah(ke)}
      className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-bold text-ink-2 transition hover:border-brand-ink hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-2"
    >
      {children}
    </button>
  )
}
