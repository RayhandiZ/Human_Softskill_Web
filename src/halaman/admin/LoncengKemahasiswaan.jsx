'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  IconAlert,
  IconBell,
  IconCertificate,
  IconCheckShield,
  IconChevronRight,
  IconInfo,
  IconPencil,
  IconUndo,
} from '../../components/Icons'
import { SUMBER, getAspek, getKomponenById } from '../../lib/curriculum'
import {
  PENGAJUAN_KOREKSI,
  getStudentByNim,
  pekerjaanPenilaian,
  perluDitinjau,
  semesterKalender,
} from '../../lib/data'
import { CONFIG } from '../../lib/config'
import { useStore, usulanMenunggu } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

/* Tiap baris membuka Input Nilai dengan sasaran terisi; lihat README.md › Input nilai. */

export function tautanInput({ semester, sumber, angkatanId, prodi, aspekId, nim, tab }) {
  const q = new URLSearchParams()
  if (semester) q.set('semester', String(semester))
  if (sumber) q.set('sumber', sumber)
  if (angkatanId) q.set('angkatan', angkatanId)
  if (prodi && prodi !== 'Semua') q.set('prodi', prodi)
  if (aspekId) q.set('aspek', aspekId)
  if (nim) q.set('cari', nim)
  if (tab) q.set('tab', tab)
  return '/admin/nilai?' + q.toString()
}

/** Kode aspek tanpa titik penutup, dipisah koma: "A.1, A.2, A.3". Satu bentuk untuk seluruh panel. */
export const daftarKode = (aspek) => aspek.map((a) => String(a?.kode ?? a).replace(/\.$/, '')).join(', ')

/**
 * Posisi angkatan dalam program, dari semester kalender. semesterAktif tidak dipakai di sini karena dibatasi
 * 1 sampai 3: angkatan yang semester pertamanya belum tiba terbaca "Semester 1".
 */
export function labelSemesterAngkatan(t, intake) {
  const n = semesterKalender(intake)
  if (n < 1) return t('Belum mulai')
  if (n > CONFIG.TOTAL_SEMESTER_PROGRAM) return t('Program selesai')
  return t('Semester {n} dari {total}', { n, total: CONFIG.TOTAL_SEMESTER_PROGRAM })
}

export function tautanKoreksi(k) {
  const komponen = getKomponenById(k.komponenId)
  const aspek = getAspek(k.aspekId)
  const mhs = getStudentByNim(k.nim)
  return tautanInput({
    tab: 'koreksi',
    semester: aspek?.semester,
    sumber: komponen?.sumber,
    angkatanId: mhs?.angkatanId,
    prodi: mhs?.program,
    aspekId: k.aspekId,
    nim: k.nim,
  })
}

function Baris({ href, onPilih, ikon: Ikon, judul, rinci, jumlah }) {
  return (
    <li>
      <Link
        href={href}
        onClick={onPilih}
        className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2"
      >
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <Ikon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold leading-snug text-ink">{judul}</span>
          <span className="block text-[12.5px] leading-snug text-ink-2">{rinci}</span>
        </span>
        {jumlah ? (
          <span className="mt-0.5 shrink-0 text-[12.5px] font-bold tabular-nums text-ink-2">{jumlah}</span>
        ) : null}
        <IconChevronRight size={15} className="mt-1 shrink-0 text-ink-3" />
      </Link>
    </li>
  )
}

/** Pekerjaan Kemahasiswaan yang menunggu; dipakai lonceng ini dan blok Perlu dikerjakan di Overview. */
export function usePekerjaanKemahasiswaan() {
  const t = useTeks()
  const versi = useStore()

  const koreksi = PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu')
  const usulan = usulanMenunggu()
  const pekerjaan = useMemo(() => pekerjaanPenilaian(), [versi])

  const tinjau = useMemo(() => perluDitinjau(), [versi])
  const tinjauan = [
    tinjau.dibawahAmbang > 0 && {
      id: 'ambang',
      href: '/admin/mahasiswa',
      ikon: IconAlert,
      judul: t('{n} mahasiswa belum berhak atas sertifikat', { n: tinjau.dibawahAmbang }),
      rinci: t('Sudah sampai Semester {semester}, nilainya masih di bawah {ambang}', {
        semester: CONFIG.TOTAL_SEMESTER_PROGRAM,
        ambang: CONFIG.AMBANG_SERTIFIKAT,
      }),
    },
    tinjau.siapDikunci > 0 && {
      id: 'kunci',
      href: '/admin/angkatan',
      ikon: IconCertificate,
      judul: t('{n} angkatan siap disahkan', { n: tinjau.siapDikunci }),
      rinci: t('Tiga semester sudah tuntas, sertifikatnya bisa diterbitkan'),
    },
  ].filter(Boolean)

  return { koreksi, usulan, pekerjaan, tinjauan, jumlah: usulan.length + koreksi.length + pekerjaan.length + tinjauan.length }
}

/* nada 'onbrand' untuk bilah biru, 'terang' untuk bilah atas terang panel Kemahasiswaan. */
export default function LoncengKemahasiswaan({ nada = 'onbrand' }) {
  const t = useTeks()
  const [buka, setBuka] = useState(false)
  const ref = useRef(null)
  const tombol = useRef(null)
  const { koreksi, usulan, pekerjaan, tinjauan, jumlah } = usePekerjaanKemahasiswaan()

  useEffect(() => {
    if (!buka) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setBuka(false)
    }
    // Esc mengembalikan fokus ke lonceng; tanpa itu fokus yang ada di dalam panel hilang ke <body>.
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setBuka(false)
      tombol.current?.focus()
    }
    const onFokus = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setBuka(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFokus)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFokus)
    }
  }, [buka])

  if (!jumlah) return null

  const tutup = () => setBuka(false)

  return (
    <div className="relative" ref={ref}>
      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-label={t('{n} hal menunggu ditangani', { n: jumlah })}
        className={
          nada === 'terang'
            ? 'relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-2 transition hover:bg-surface hover:text-ink'
            : 'relative grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white'
        }
      >
        <IconBell size={19} />
        <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full isi-toska px-1 text-[10px] font-extrabold text-[var(--accent-on)]">
          {jumlah > 99 ? '99+' : jumlah}
        </span>
      </button>

      {buka ? (
        <div
          role="dialog"
          aria-label={t('Pekerjaan yang menunggu')}
          className="fixed inset-x-4 top-[72px] z-50 overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-pop animate-rise sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[420px]"
        >

          <div className="max-h-[min(55vh,460px)] overflow-y-auto px-2 py-2">
            {usulan.length ? (
              <section className="border-b border-line pb-2">
                <h3 className="px-2 pb-1 pt-2 text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-3">
                  {t('Usulan nilai dosen')}
                </h3>
                <ul>
                  {usulan.map((u) => (
                    <Baris
                      key={u.id}
                      href="/admin/usulan"
                      onPilih={tutup}
                      ikon={IconCheckShield}
                      judul={u.dosenNama}
                      rinci={
                        (SUMBER[u.sumber]?.label ?? u.sumber) +
                        ' · ' +
                        t('Semester {n}', { n: u.semester }) +
                        ' · ' +
                        t('menunggu persetujuan')
                      }
                      jumlah={u.entri.length.toLocaleString('id-ID')}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {koreksi.length ? (
              <section className="border-b border-line pb-2">
                <h3 className="px-2 pb-1 pt-2 text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-3">
                  {t('Pengajuan koreksi')}
                </h3>
                <ul>
                  {koreksi.map((k) => (
                    <Baris
                      key={k.id}
                      href={tautanKoreksi(k)}
                      onPilih={tutup}
                      ikon={IconUndo}
                      judul={k.nama + ' · ' + k.nim}
                      rinci={k.komponenLabel}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {tinjauan.length ? (
              <section className="border-b border-line pb-2">
                <h3 className="px-2 pb-1 pt-2 text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-3">
                  {t('Perlu ditinjau')}
                </h3>
                <ul>
                  {tinjauan.map((x) => (
                    <Baris
                      key={x.id}
                      href={x.href}
                      onPilih={tutup}
                      ikon={x.ikon}
                      judul={x.judul}
                      rinci={x.rinci}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Dulu judul ini selalu tampil, juga saat yang menunggu hanya koreksi atau usulan. */}
            {pekerjaan.length ? (
            <section>
              <h3 className="px-2 pb-1 pt-2 text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-3">
                {t('Belum dinilai')}
              </h3>
              <ul>
                {pekerjaan.map((p) => (
                  <Baris
                    key={p.id}
                    href={tautanInput({
                      semester: p.semester,
                      sumber: p.sumber,
                      angkatanId: p.angkatan.id,
                      aspekId: p.aspek[0]?.id,
                      nim: p.nimTunggal,
                    })}
                    onPilih={tutup}
                    ikon={IconPencil}
                    judul={
                      t('Semester {n}', { n: p.semester }) +
                      ' · ' +
                      (SUMBER[p.sumber]?.label ?? p.sumber)
                    }
                    rinci={
                      t('Angkatan {label}', { label: p.angkatan.label }) +
                      ', ' +
                      t('{n} mahasiswa', { n: p.mahasiswa }) +
                      ' · ' +
                      daftarKode(p.aspek)
                    }
                    jumlah={p.kosong.toLocaleString('id-ID')}
                  />
                ))}
              </ul>
            </section>
            ) : null}
          </div>

          {usulan.length || pekerjaan.length ? (
            <div className="border-t border-line bg-surface-2 px-4 py-3">
              <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-3">
                <IconInfo size={13} className="mt-px shrink-0" />
                {/* Dulu hanya menyebut nilai kosong, padahal angka di baris usulan adalah banyaknya nilai yang diusulkan. */}
                {t('Angka di kanan: banyaknya nilai dalam usulan dosen, atau nilai komponen yang masih kosong pada kelompok itu.')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
