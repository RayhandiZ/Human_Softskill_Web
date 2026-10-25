'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CatatanKaki, EmptyState, Paginasi, ScoreBar, SearchInput, StatTile } from '../../components/Ui'
import { IconChevronDown, IconList, IconUpload, IconUsers } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { dosenSesi, getAngkatan, komponenDosen, mahasiswaKelas } from '../../lib/data'
import { unggahanDosen, useStore } from '../../lib/store'
import { ringkasKelas } from '../../lib/unggahDosen'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Beranda dosen: memantau nilai kelas. Rapat 24 Okt 2026 menilai panel dosen terlalu ribet dan memutuskan dosen tidak
   lagi mengisi nilai satu per satu: nilai masuk lewat unggahan Excel (halaman Unggah Nilai) dan halaman ini hanya
   menampilkan hasilnya. Semua angka dihitung dari nilai yang tersimpan untuk tugas kelas dosen ini (ringkasKelas di
   src/lib/unggahDosen.js). Lihat README.md › Panel Dosen. */

const PER_HALAMAN = 15
const angka = (n) => (n == null ? '–' : n.toLocaleString('id-ID', { maximumFractionDigits: 1 }))

export default function Pantau() {
  const versi = useStore()
  const t = useTeks()
  const { user } = useAuth()
  const dosen = useMemo(() => dosenSesi(user), [user])

  const komponen = useMemo(() => komponenDosen(dosen), [dosen, versi])
  const mahasiswa = useMemo(() => mahasiswaKelas(dosen), [dosen, versi])
  const ringkas = useMemo(() => ringkasKelas({ mahasiswa, komponenKelas: komponen }), [mahasiswa, komponen])
  const terakhir = unggahanDosen().find((u) => u.status === 'tersimpan')

  if (!dosen) {
    return (
      <EmptyState title={t('Akun ini belum terdaftar sebagai dosen pengampu')}>
        {t('Hubungi Biro Kemahasiswaan untuk didaftarkan pada satu kelas.')}
      </EmptyState>
    )
  }

  const persen = ringkas.total ? Math.round((ringkas.terisi / ringkas.total) * 100) : 0
  // Angkatan yang diampu, bila Super Admin sudah memilihnya; tanpa pilihan, kelasnya angkatan yang sedang di semester ini.
  const angkatanDiampu = dosen.angkatan.map((id) => getAngkatan(id)?.label ?? id).join(', ')

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Beranda')}</h1>
        <p className="mt-1.5 text-[15px] text-ink-2">
          {t('Pantau kelengkapan dan sebaran nilai kelas Anda. Nilai masuk lewat unggahan Excel.')}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
        {/* Titik fokus halaman: seberapa lengkap nilai kelas ini, dan satu tombol untuk melengkapinya. */}
        <Card className="px-6 py-7">
          <p className="text-[15px] font-semibold text-ink-2">{t('Nilai terisi')}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[46px] font-extrabold leading-none tracking-tight text-ink">{ringkas.terisi}</span>
            <span className="text-[18px] font-semibold text-ink-2">{t('dari {n} nilai', { n: ringkas.total })}</span>
          </p>
          <div className="mt-4">
            <ScoreBar value={persen} color="var(--brand-ink)" />
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            {!ringkas.total
              ? t('Belum ada mahasiswa atau tugas di kelas Anda.')
              : !ringkas.terisi
                ? t('Belum ada nilai yang masuk. Unggah rekap Excel kelas Anda.')
                : ringkas.terisi < ringkas.total
                  ? t('{n} nilai belum masuk.', { n: ringkas.total - ringkas.terisi })
                  : t('Semua nilai kelas Anda sudah masuk.')}
          </p>
          <Link href="/dosen/nilai" className="btn-primary mt-5 inline-flex min-h-[44px] items-center gap-2 px-4 text-[13.5px]">
            <IconUpload size={16} />
            {t('Unggah nilai')}
          </Link>
          {terakhir ? (
            <p className="mt-3 text-[13px] text-ink-2">
              {t('Unggahan terakhir {waktu}, {n} nilai.', { waktu: terakhir.waktu, n: terakhir.jumlah })}
            </p>
          ) : null}
        </Card>

        <div className="grid gap-5 sm:grid-cols-3">
          <StatTile
            label={t('Jumlah mahasiswa')}
            value={mahasiswa.length}
            hint={
              angkatanDiampu
                ? t('{prodi}, angkatan {daftar}.', { prodi: dosen.prodi, daftar: angkatanDiampu })
                : t('{prodi} dari Semester {n} sampai programnya selesai.', { prodi: dosen.prodi, n: dosen.semester })
            }
          />
          <StatTile label={t('Rata-rata kelas')} value={angka(ringkas.rata)} hint={t('Dari seluruh nilai tugas yang sudah masuk.')} />
          <StatTile
            label={t('Rata-rata di bawah {n}', { n: CONFIG.AMBANG_SERTIFIKAT })}
            value={ringkas.dibawahAmbang}
            hint={t('Mahasiswa yang rata-rata nilai tugasnya perlu perhatian.')}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          icon={IconList}
          title={t('Kelengkapan per tugas')}
          subtitle={t('Berapa mahasiswa yang nilainya sudah masuk untuk tiap tugas.')}
        />
        {!komponen.length ? (
          <EmptyState title={t('Belum ada tugas untuk kelas Anda')}>
            {t('Tugas kelas ditetapkan Super Admin lewat halaman Penilaian & Bobot.')}
          </EmptyState>
        ) : !mahasiswa.length ? (
          <EmptyState title={t('Belum ada mahasiswa di kelas Anda')}>
            {angkatanDiampu
              ? t('Di sini akan muncul mahasiswa {prodi} angkatan {daftar}.', { prodi: dosen.prodi, daftar: angkatanDiampu })
              : t('Di sini akan muncul mahasiswa {prodi} yang sudah sampai Semester {n} dan programnya belum selesai.', {
                  prodi: dosen.prodi,
                  n: dosen.semester,
                })}{' '}
            {angkatanDiampu
              ? null
              : t('Bila Anda mengampu angkatan tertentu, termasuk yang sudah disahkan, minta Super Admin memilihnya di akun Anda.')}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {ringkas.perTugas.map(({ komponen: k, terisi, rata }) => (
              <li
                key={k.id}
                className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_220px_110px] sm:items-center sm:gap-5 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{k.label}</p>
                  <p className="text-[12.5px] text-ink-2">{t('Kode {id}', { id: k.id })}</p>
                </div>
                <div>
                  <ScoreBar value={(terisi / mahasiswa.length) * 100} color="var(--brand-ink)" height={8} />
                  <p className="mt-1 text-[12.5px] tabular-nums text-ink-2">
                    {t('{n} dari {total} mahasiswa', { n: terisi, total: mahasiswa.length })}
                  </p>
                </div>
                <p className="text-[13px] text-ink-2 sm:text-right">
                  {t('Rata-rata')} <strong className="tabular-nums text-ink">{angka(rata)}</strong>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {mahasiswa.length ? <NilaiMahasiswa perMahasiswa={ringkas.perMahasiswa} jumlahTugas={komponen.length} /> : null}

      <CatatanKaki>
        {t('Nilai yang Anda unggah langsung tersimpan dan tampil di transkrip mahasiswa. Bila ada yang keliru, unggah ulang dengan nilai yang benar, atau minta Super Admin membatalkan unggahannya.')}
      </CatatanKaki>
    </div>
  )
}

/** Daftar mahasiswa kelas: terisi, rata-rata, dan nilai terendah, dengan rincian per tugas yang bisa dibuka. */
function NilaiMahasiswa({ perMahasiswa, jumlahTugas }) {
  const t = useTeks()
  const [cari, setCari] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [buka, setBuka] = useState(null)

  const kata = cari.trim().toLowerCase()
  const tersaring = perMahasiswa.filter(
    (m) => !kata || m.mahasiswa.name.toLowerCase().includes(kata) || m.mahasiswa.nim.includes(kata),
  )
  const jumlahHalaman = Math.max(1, Math.ceil(tersaring.length / PER_HALAMAN))
  const hal = Math.min(halaman, jumlahHalaman)
  const tampil = tersaring.slice((hal - 1) * PER_HALAMAN, hal * PER_HALAMAN)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={IconUsers}
        title={t('Nilai mahasiswa')}
        subtitle={
          tersaring.length === perMahasiswa.length
            ? t('{n} mahasiswa di kelas Anda', { n: perMahasiswa.length })
            : t('{n} dari {total} mahasiswa', { n: tersaring.length, total: perMahasiswa.length })
        }
      />
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <SearchInput
          value={cari}
          onChange={(v) => {
            setCari(v)
            setHalaman(1)
          }}
          label={t('Cari mahasiswa')}
          placeholder={t('Nama atau NIM…')}
        />
      </div>

      {tampil.length ? (
        <ul className="divide-y divide-line">
          {tampil.map((m) => {
            const dibuka = buka === m.mahasiswa.nim
            const idRinci = 'rinci-' + m.mahasiswa.nim
            return (
              <li key={m.mahasiswa.nim} className="px-5 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[14.5px] font-bold text-ink">{m.mahasiswa.name}</p>
                    <p className="text-[12.5px] tabular-nums text-ink-2">{m.mahasiswa.nim}</p>
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                    <div>
                      <dt className="text-ink-2">{t('Terisi')}</dt>
                      <dd className="font-bold tabular-nums text-ink">
                        {m.terisi}/{jumlahTugas}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-2">{t('Rata-rata')}</dt>
                      <dd className="font-bold tabular-nums text-ink">{angka(m.rata)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-2">{t('Terendah')}</dt>
                      <dd className="font-bold tabular-nums text-ink">{m.terendah ? angka(m.terendah.nilai) : '–'}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    aria-expanded={dibuka}
                    aria-controls={idRinci}
                    onClick={() => setBuka(dibuka ? null : m.mahasiswa.nim)}
                    className="btn-ghost inline-flex min-h-[44px] items-center gap-1.5 !px-3 text-[13px]"
                  >
                    {t(dibuka ? 'Tutup rincian' : 'Rincian')}
                    <IconChevronDown size={15} className={'transition ' + (dibuka ? 'rotate-180' : '')} />
                  </button>
                </div>
                {dibuka ? (
                  <ul id={idRinci} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {m.isi.map(({ komponen: k, nilai }) => (
                      <li key={k.id} className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
                        <span className="min-w-0 text-[13px] text-ink">
                          {k.label}
                          <span className="block text-[12px] text-ink-2">{k.id}</span>
                        </span>
                        <span className="shrink-0 text-[14px] font-bold tabular-nums text-ink">
                          {nilai == null ? <span className="text-[12.5px] font-semibold text-ink-2">{t('belum ada')}</span> : angka(nilai)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title={t('Tidak ada mahasiswa yang cocok.')} />
      )}

      {tersaring.length > PER_HALAMAN ? (
        <div className="border-t border-line">
          <Paginasi halaman={hal} jumlahHalaman={jumlahHalaman} total={tersaring.length} ukuran={PER_HALAMAN} onHalaman={setHalaman} />
        </div>
      ) : null}
    </Card>
  )
}
