'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  IconAlert,
  IconBell,
  IconCertificate,
  IconCheckShield,
  IconChevronRight,
  IconEye,
  IconInfo,
  IconPencil,
  IconUndo,
} from '../../components/Icons'
import { Tabs } from '../../components/Ui'
import { SUMBER, getAspek, getKomponenById } from '../../lib/curriculum'
import {
  PENGAJUAN_KOREKSI,
  getStudentByNim,
  pekerjaanPenilaian,
  perluDitinjau,
  semesterKalender,
} from '../../lib/data'
import { CONFIG } from '../../lib/config'
import {
  PERMINTAAN_SERTIFIKAT,
  bacaNotifikasi,
  tandaiNotifikasiDibaca,
  terakhirSegar,
  useStore,
  usulanMenunggu,
} from '../../lib/store'
import { giliranSaya } from '../../lib/duaLapis'
import { LABEL_LOG, labelSasaran } from '../../lib/labelLog'
import { useAuth } from '../../lib/auth'
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

/**
 * Pekerjaan Kemahasiswaan yang menunggu; dipakai lonceng ini dan blok Perlu dikerjakan di Overview. Sejak rapat
 * 24 Okt 2026 admin hanya membaca nilai: `bacaSaja` true untuk admin biasa (nilai kosong tampil untuk ditagih ke dosen,
 * bukan untuk diisi), dan usulan dosen lama hanya masuk daftar super admin.
 */
export function usePekerjaanKemahasiswaan() {
  const t = useTeks()
  const versi = useStore()
  const { user } = useAuth()
  const bacaSaja = !user?.superAdmin

  // Koreksi dan akses cetak sertifikat: hanya yang menunggu lapis akun ini (admin lapis 1, super admin lapis 2).
  const koreksi = giliranSaya(PENGAJUAN_KOREKSI, user)
  const sertifikat = giliranSaya(PERMINTAAN_SERTIFIKAT, user)
  const usulan = bacaSaja ? [] : usulanMenunggu()
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

  return {
    koreksi,
    sertifikat,
    usulan,
    pekerjaan,
    tinjauan,
    bacaSaja,
    jumlah: usulan.length + koreksi.length + sertifikat.length + pekerjaan.length + tinjauan.length,
  }
}

const SEGAR_PEMBARUAN = 60_000

/**
 * Pembaruan dari Super Admin untuk admin biasa (src/server/notifikasi.js): sejak 31 Okt 2026 hanya tindakan yang
 * berkaitan dengan admin itu sendiri, yaitu perubahan pada akunnya dan keputusan atas permintaannya. Dibaca ulang setiap
 * data panel dimuat (termasuk tombol Segarkan), saat tab peramban kembali terlihat, dan tiap menit selama terlihat.
 * Super admin tidak memakainya: yang dilaporkan justru tindakannya sendiri.
 */
function usePembaruan(aktif) {
  const [isi, setIsi] = useState(null)
  const [galat, setGalat] = useState(null)
  const [menandai, setMenandai] = useState(false)
  const urut = useRef(0)
  const segar = terakhirSegar()?.getTime() ?? null

  // Hanya jawaban permintaan terakhir yang dipasang; jawaban lama yang datang belakangan dibuang.
  const pasang = useCallback(async (minta) => {
    const ke = ++urut.current
    try {
      const hasil = await minta()
      if (ke === urut.current) {
        setIsi(hasil)
        setGalat(null)
      }
    } catch (e) {
      if (ke === urut.current) setGalat(e.message)
    }
  }, [])

  const muat = useCallback(() => pasang(bacaNotifikasi), [pasang])

  useEffect(() => {
    if (aktif) muat()
  }, [aktif, segar, muat])

  useEffect(() => {
    if (!aktif) return
    const segarkan = () => document.visibilityState === 'visible' && muat()
    const id = setInterval(segarkan, SEGAR_PEMBARUAN)
    document.addEventListener('visibilitychange', segarkan)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', segarkan)
    }
  }, [aktif, muat])

  // Sampai `terbaru` dari daftar yang sedang tampil, bukan "sekarang": yang masuk sesudahnya tetap terhitung baru.
  const tandai = async () => {
    if (!isi?.terbaru) return
    setMenandai(true)
    await pasang(() => tandaiNotifikasiDibaca(isi.terbaru))
    setMenandai(false)
  }

  return { isi: aktif ? isi : null, galat: aktif ? galat : null, menandai, muat, tandai }
}

const potong = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** Satu tindakan Super Admin: jenis, sasaran, alasan atau catatannya, lalu siapa dan kapan. Bukan tautan. */
function BarisPembaruan({ b }) {
  const t = useTeks()
  const r = b.rincian
  const alasan =
    typeof r?.alasan === 'string' && r.alasan
      ? t('Alasan') + ': ' + potong(r.alasan, 90)
      : typeof r?.catatan === 'string' && r.catatan
        ? t('Catatan') + ': ' + potong(r.catatan, 90)
        : null
  return (
    <li className="flex items-start gap-3 rounded-xl px-2 py-2.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
        <IconCheckShield size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold leading-snug text-ink">
          {t(LABEL_LOG[b.aksi] ?? b.aksi)}
          {b.baru ? <span className="sr-only"> ({t('belum dibaca')})</span> : null}
        </span>
        {b.target ? (
          <span className="block break-words text-[12.5px] leading-snug text-ink-2">{labelSasaran(b.target, t)}</span>
        ) : null}
        {alasan ? <span className="block break-words text-[12.5px] leading-snug text-ink-2">{alasan}</span> : null}
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
          {[b.aktor, b.waktu ? b.waktu + ' WIB' : null].filter(Boolean).join(' · ')}
        </span>
      </span>
      {b.baru ? <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full isi-toska" /> : null}
    </li>
  )
}

/* Tanpa tautan ke Log Aktivitas: sejak 31 Okt 2026 tindakan Super Admin tidak ada di Log Aktivitas admin. */
function PanelPembaruan({ pembaruan }) {
  const t = useTeks()
  const { isi, galat, menandai, muat, tandai } = pembaruan
  const baris = isi?.baris ?? []
  return (
    <>
      <div className="max-h-[min(55vh,460px)] overflow-y-auto px-2 py-2">
        <div className="flex min-h-[36px] items-center justify-between gap-3 px-2 pt-1">
          <h3 className="text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-3">{t('Dari Super Admin')}</h3>
          {isi?.belum ? (
            <button
              type="button"
              onClick={tandai}
              disabled={menandai}
              className="rounded-lg px-2 py-1.5 text-[12.5px] font-bold text-brand-ink transition hover:bg-surface-2 disabled:opacity-60"
            >
              {menandai ? t('Menandai…') : t('Tandai semua sudah dibaca')}
            </button>
          ) : null}
        </div>
        {galat ? (
          <p role="alert" className="px-2 py-3 text-[13px] leading-snug text-ink-2">
            {galat}{' '}
            <button type="button" onClick={muat} className="font-bold text-brand-ink underline">
              {t('Coba lagi')}
            </button>
          </p>
        ) : null}
        {!isi && !galat ? (
          <p role="status" className="px-2 py-6 text-center text-[13.5px] text-ink-2">
            {t('Memuat…')}
          </p>
        ) : null}
        {isi && !baris.length ? (
          <p className="px-2 py-6 text-center text-[13.5px] text-ink-2">{t('Belum ada pembaruan dari Super Admin.')}</p>
        ) : null}
        {baris.length ? (
          <ul>
            {baris.map((b) => (
              <BarisPembaruan key={b.id} b={b} />
            ))}
          </ul>
        ) : null}
      </div>
    </>
  )
}

/* nada 'onbrand' untuk bilah biru, 'terang' untuk bilah atas terang panel Kemahasiswaan. Admin biasa juga menerima
   pembaruan dari Super Admin di tab kedua; lihat README.md › Panel Kemahasiswaan › Lonceng. */
export default function LoncengKemahasiswaan({ nada = 'onbrand' }) {
  const t = useTeks()
  const { user } = useAuth()
  const adminBiasa = Boolean(user) && !user.superAdmin
  const [buka, setBuka] = useState(false)
  const [tab, setTab] = useState('kerja')
  const ref = useRef(null)
  const tombol = useRef(null)
  const { koreksi, sertifikat, usulan, pekerjaan, tinjauan, bacaSaja, jumlah } = usePekerjaanKemahasiswaan()
  const pembaruan = usePembaruan(adminBiasa)
  const belum = pembaruan.isi?.belum ?? 0
  const lencana = jumlah + belum

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

  // Admin biasa selalu melihat lonceng supaya pembaruan yang sudah dibaca tetap bisa dibuka lagi; super admin hanya
  // bila ada yang menunggu.
  if (!adminBiasa && !jumlah) return null

  const tutup = () => setBuka(false)
  const bukaTutup = () => {
    // Dibuka di tab yang berisi hal baru; pekerjaan didahulukan hanya bila tidak ada pembaruan yang belum dibaca.
    if (!buka) setTab(belum || !jumlah ? 'pembaruan' : 'kerja')
    setBuka((v) => !v)
  }
  const label = adminBiasa
    ? [
        jumlah ? t('{n} hal menunggu ditangani', { n: jumlah }) : null,
        belum ? t('{n} pembaruan belum dibaca', { n: belum }) : null,
      ]
        .filter(Boolean)
        .join(', ') || t('Pemberitahuan, tidak ada yang baru')
    : t('{n} hal menunggu ditangani', { n: jumlah })
  const tabPembaruan = adminBiasa && tab === 'pembaruan'

  return (
    <div className="relative" ref={ref}>
      <button
        ref={tombol}
        type="button"
        onClick={bukaTutup}
        aria-expanded={buka}
        aria-label={label}
        className={
          nada === 'terang'
            ? 'relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-ink-2 transition hover:bg-surface hover:text-ink'
            : 'relative grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white'
        }
      >
        <IconBell size={19} />
        {lencana ? (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full isi-toska px-1 text-[10px] font-extrabold text-[var(--accent-on)]">
            {lencana > 99 ? '99+' : lencana}
          </span>
        ) : null}
      </button>

      {buka ? (
        <div
          role="dialog"
          aria-label={adminBiasa ? t('Pemberitahuan') : t('Pekerjaan yang menunggu')}
          className="fixed inset-x-4 top-[72px] z-50 overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-pop animate-rise sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[420px]"
        >
          {adminBiasa ? (
            <div className="border-b border-line px-3 py-2.5">
              <Tabs
                label={t('Jenis pemberitahuan')}
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'kerja', label: t('Perlu dikerjakan'), count: jumlah || null },
                  { value: 'pembaruan', label: t('Pembaruan'), count: belum || null },
                ]}
              />
            </div>
          ) : null}

          {tabPembaruan ? (
            <PanelPembaruan pembaruan={pembaruan} />
          ) : (
            <>
              <div className="max-h-[min(55vh,460px)] overflow-y-auto px-2 py-2">
                {!jumlah ? (
                  <p className="px-2 py-6 text-center text-[13.5px] text-ink-2">{t('Tidak ada pekerjaan yang menunggu.')}</p>
                ) : null}
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

                {sertifikat.length ? (
                  <section className="border-b border-line pb-2">
                    <h3 className="px-2 pb-1 pt-2 text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-3">
                      {t('Akses cetak sertifikat')}
                    </h3>
                    <ul>
                      {sertifikat.map((p) => (
                        <Baris
                          key={p.id}
                          href={'/admin/sertifikat?tab=permintaan&cari=' + encodeURIComponent(p.nim)}
                          onPilih={tutup}
                          ikon={IconCertificate}
                          judul={p.nama + ' · ' + p.nim}
                          rinci={t('diajukan {tanggal}', { tanggal: p.diajukan })}
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
                        ikon={bacaSaja ? IconEye : IconPencil}
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
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
