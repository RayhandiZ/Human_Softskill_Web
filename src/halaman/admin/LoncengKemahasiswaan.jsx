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
} from '../../lib/data'
import { CONFIG } from '../../lib/config'
import { useStore, usulanMenunggu } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

/* --------------------------------------------------------------------------
   Lonceng panel Kemahasiswaan — pasangan dari lonceng panel mahasiswa.

   Keduanya kini berperilaku sama: sebuah panel yang bisa dibuka, bukan tautan
   yang langsung melempar. Bedanya isi, karena pekerjaannya memang berbeda —
   mahasiswa MENUNGGU nilai, Kemahasiswaan MEMASUKKAN nilai.

   Yang membuat panel ini berguna: tiap baris bukan sekadar kabar, melainkan
   PINTASAN KERJA. Sekali diketuk, halaman Input Nilai terbuka dengan seluruh
   pilihan Langkah 1 sudah terisi — semester, unit penilai, angkatan, program
   studi, dan aspeknya — sehingga daftar mahasiswa beserta nama dan NIM-nya
   langsung tampil siap diisi. Tanpa itu, pengguna harus menerjemahkan sendiri
   "417 nilai kosong" menjadi lima pilihan dropdown yang tepat.
   -------------------------------------------------------------------------- */

/** Menyusun alamat halaman input lengkap dengan sasarannya. */
function tautanInput({ semester, sumber, angkatanId, prodi, aspekId, nim, tab }) {
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

/** Pengajuan koreksi → sasaran input milik mahasiswa yang mengajukan. */
function tautanKoreksi(k) {
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

export default function LoncengKemahasiswaan() {
  const t = useTeks()
  // Ikut berubah begitu ada nilai yang tersimpan atau koreksi yang diputuskan.
  const versi = useStore()
  const [buka, setBuka] = useState(false)
  const ref = useRef(null)

  const koreksi = PENGAJUAN_KOREKSI.filter((k) => k.status === 'menunggu')
  /* Usulan nilai dari dosen. Diletakkan paling atas di panel ini karena
     inilah satu-satunya antrean yang MENAHAN pekerjaan orang lain: selama
     belum diputuskan, nilai yang sudah dikerjakan dosen tidak sampai ke
     mahasiswa mana pun. */
  const usulan = usulanMenunggu()
  const pekerjaan = useMemo(() => pekerjaanPenilaian(), [versi])

  /* Dua keputusan yang dulu berdiri sendiri sebagai kartu "Requires Review" di
     Ringkasan. Dipindah ke sini karena kartu itu mengulang angka yang sama
     dengan daftar "Belum dinilai" di panel ini. */
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
      judul: t('{n} angkatan siap dikunci', { n: tinjau.siapDikunci }),
      rinci: t('Tiga semester sudah tuntas, sertifikatnya bisa diterbitkan'),
    },
  ].filter(Boolean)

  const jumlah = usulan.length + koreksi.length + pekerjaan.length + tinjauan.length

  useEffect(() => {
    if (!buka) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setBuka(false)
    }
    const onKey = (e) => e.key === 'Escape' && setBuka(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [buka])

  if (!jumlah) return null

  const tutup = () => setBuka(false)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-label={t('{n} hal menunggu ditangani', { n: jumlah })}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <IconBell size={19} />
        <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-extrabold text-[#2b1c00]">
          {jumlah > 99 ? '99+' : jumlah}
        </span>
      </button>

      {buka ? (
        /* Di layar kecil panel dipasang selebar layar: loncengnya dekat tepi
           kanan, dan panel selebar 380px yang ditambatkan padanya akan meluber
           keluar layar di sisi kiri. */
        <div
          role="dialog"
          aria-label={t('Pekerjaan yang menunggu')}
          className="fixed inset-x-4 top-[72px] z-50 overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-pop animate-rise sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[420px]"
        >
          {/* <div className="border-b border-line px-4 py-3.5"> */}
            {/* <p className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-bold text-ink">Perlu ditangani</span>
              <span className="text-[13px] font-semibold text-ink-2">{jumlah} hal</span>
            </p> */}
            {/* <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              Pilih satu — halaman input terbuka dengan sasarannya sudah terisi.
            </p> */}
          {/* </div> */}

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
                  {tinjauan.map((t) => (
                    <Baris
                      key={t.id}
                      href={t.href}
                      onPilih={tutup}
                      ikon={t.ikon}
                      judul={t.judul}
                      rinci={t.rinci}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

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
                      p.aspek.map((a) => a.kode).join(' ')
                    }
                    jumlah={p.kosong.toLocaleString('id-ID')}
                  />
                ))}
              </ul>
            </section>
          </div>

          <div className="border-t border-line bg-surface-2 px-4 py-3">
            <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-3">
              <IconInfo size={13} className="mt-px shrink-0" />
              {t('Angka di kanan adalah banyaknya nilai komponen yang masih kosong pada kelompok itu.')}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
