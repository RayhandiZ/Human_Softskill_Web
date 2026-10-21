import { useMemo, useState } from 'react'
import Link from 'next/link'
import { JudulHalaman, KartuAngka } from '../../components/Ui'
import MutuDonut from '../../components/charts/MutuDonut'
import PerkembanganAngkatan from '../../components/charts/PerkembanganAngkatan'
import { IconCheck, IconCheckShield, IconChevronDown, IconChevronRight, IconPencil, IconUndo } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { SUMBER } from '../../lib/curriculum'
import { useTeks } from '../../lib/bahasa'
import { STUDENTS, kelengkapanMatriks, ringkas } from '../../lib/data'
import { useStore } from '../../lib/store'
import { daftarKode, tautanInput, tautanKoreksi, usePekerjaanKemahasiswaan } from './LoncengKemahasiswaan'

/* Sengaja tenang; lihat README.md › Ringkasan admin sengaja dibuat tenang. Pekerjaan yang menunggu dibuka
   paling atas, lalu tiga angka dan dua grafik. Navigasi ada di menu samping, jadi tidak ada lagi kartu
   "Halaman lain". */

const PEKERJAAN_TAMPIL = 3

// Kartu angka kini KartuAngka di components/Ui.jsx, dipakai juga Program Studi dan Persetujuan Nilai Dosen.
const Angka = KartuAngka

function KakiLipat({ buka, onToggle, idIsi, ringkas }) {
  const t = useTeks()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={buka}
      aria-controls={idIsi}
      className="mt-4 flex w-full items-center gap-2 border-t border-line pt-3.5 text-left sm:hidden"
    >
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">{ringkas}</span>
      <span className="shrink-0 text-[13.5px] font-bold text-brand-ink">
        {t(buka ? 'Tutup' : 'Rincian')}
      </span>
      <IconChevronDown
        size={17}
        className={'shrink-0 text-brand-ink transition-transform ' + (buka ? 'rotate-180' : '')}
      />
    </button>
  )
}

/** Nama pertama dan kedua, lalu "dan n lainnya". */
function namaRingkas(t, nama) {
  if (nama.length <= 2) return nama.join(', ')
  return nama.slice(0, 2).join(', ') + ' ' + t('dan {n} lainnya', { n: nama.length - 2 })
}

/* Pekerjaan yang menunggu, ditulis sebagai kalimat utuh dengan tautan yang menyebut tujuannya. Sumbernya sama
   dengan lonceng di bilah atas (usePekerjaanKemahasiswaan); bila tidak ada apa-apa, satu baris tenang saja. */
function PerluDikerjakan() {
  const t = useTeks()
  const { usulan, koreksi, pekerjaan, tinjauan } = usePekerjaanKemahasiswaan()

  const baris = [
    usulan.length
      ? {
          id: 'usulan',
          ikon: IconCheckShield,
          ke: '/admin/usulan',
          judul: t('{n} usulan nilai dari dosen menunggu persetujuan', { n: usulan.length }),
          rinci: namaRingkas(t, usulan.map((u) => u.dosenNama)),
          aksi: t('Tinjau usulan'),
        }
      : null,
    koreksi.length
      ? {
          id: 'koreksi',
          ikon: IconUndo,
          ke: tautanKoreksi(koreksi[0]),
          judul: t('{n} pengajuan koreksi nilai dari mahasiswa belum diputuskan', { n: koreksi.length }),
          rinci: namaRingkas(t, koreksi.map((k) => k.nama)),
          aksi: t('Tinjau koreksi'),
        }
      : null,
    ...tinjauan.map((x) => ({
      id: x.id,
      ikon: x.ikon,
      ke: x.href,
      judul: x.judul,
      rinci: x.rinci,
      aksi: t(x.id === 'kunci' ? 'Buka Angkatan' : 'Lihat mahasiswa'),
    })),
    ...pekerjaan.slice(0, PEKERJAAN_TAMPIL).map((p) => ({
      id: p.id,
      ikon: IconPencil,
      ke: tautanInput({
        semester: p.semester,
        sumber: p.sumber,
        angkatanId: p.angkatan.id,
        aspekId: p.aspek[0]?.id,
        nim: p.nimTunggal,
      }),
      judul: t('{n} nilai {sumber} Semester {semester} belum diisi', {
        n: p.kosong.toLocaleString('id-ID'),
        sumber: SUMBER[p.sumber]?.label ?? p.sumber,
        semester: p.semester,
      }),
      rinci:
        t('Angkatan {label}', { label: p.angkatan.label }) +
        ', ' +
        t('{n} mahasiswa', { n: p.mahasiswa }) +
        ' · ' +
        daftarKode(p.aspek),
      aksi: t('Masukkan nilai'),
    })),
  ].filter(Boolean)
  const sisa = Math.max(0, pekerjaan.length - PEKERJAAN_TAMPIL)

  if (!baris.length) {
    return (
      <section aria-labelledby="judul-perlu" className="kartu flex items-center gap-4 px-5 py-4 sm:px-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
          <IconCheck size={20} />
        </span>
        <div>
          <h2 id="judul-perlu" className="text-[16px] font-extrabold text-ink">
            {t('Tidak ada pekerjaan yang menunggu')}
          </h2>
          <p className="mt-0.5 text-[14.5px] text-ink-2">
            {t('Usulan dosen, koreksi mahasiswa, dan nilai yang wajib diisi sudah tertangani.')}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="judul-perlu" className="kartu overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 id="judul-perlu" className="text-[18px] font-extrabold text-ink">
            {t('Perlu dikerjakan')}
          </h2>
          <p className="mt-0.5 text-[14px] text-ink-2">
            {t('Urut dari yang menunggu keputusan Anda, lalu nilai yang belum diisi.')}
          </p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-[13px] font-bold text-brand-ink">
          {t('{n} hal', { n: baris.length + sisa })}
        </span>
      </div>
      <ul className="divide-y divide-line">
        {baris.map((b) => (
          <li key={b.id}>
            <Link
              href={b.ke}
              className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-surface-2 sm:flex-nowrap sm:px-6"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <b.ikon size={19} />
              </span>
              <span className="min-w-0 flex-1 basis-[200px]">
                <span className="block text-[15.5px] font-bold leading-snug text-ink">{b.judul}</span>
                {b.rinci ? <span className="mt-0.5 block text-[14px] leading-snug text-ink-2">{b.rinci}</span> : null}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 pl-14 text-[14.5px] font-bold text-brand-ink underline underline-offset-4 sm:pl-0">
                {b.aksi}
                <IconChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {sisa ? (
        <p className="border-t border-line bg-surface-2 px-5 py-3 text-[14px] text-ink-2 sm:px-6">
          {t('{n} kelompok nilai lain juga belum lengkap; semuanya ada di lonceng di kanan atas.', { n: sisa })}
        </p>
      ) : null}
    </section>
  )
}

export default function Overview() {
  const teks = useTeks()
  const versi = useStore()

  const rows = useMemo(() => [...STUDENTS], [versi])
  const angka = useMemo(() => ringkas(rows), [rows])
  const [bukaAngka, setBukaAngka] = useState(false)

  const bagi = (n) => (angka.total ? Math.round((n / angka.total) * 100) : 0)
  const persenLengkap = useMemo(() => {
    let terisi = 0
    let total = 0
    for (const b of kelengkapanMatriks(rows)) {
      for (const x of Object.values(b.sumber)) {
        terisi += x.terisi
        total += x.total
      }
    }
    return total ? Math.round((terisi / total) * 100) : 0
  }, [rows])

  return (
    <div className="space-y-7">
      {/* --------------------------------- kepala -------------------------------- */}
      <JudulHalaman judul="Overview" keterangan={teks('Pekerjaan yang menunggu Anda dan capaian mahasiswa periode ini.')} />

      <PerluDikerjakan />

      {/* --------------------------------- angka --------------------------------- */}
      <section aria-label={teks('Ringkasan angka')} className="grid gap-5 md:grid-cols-3">
        <Angka
          judul={teks('Mahasiswa terpantau')}
          nilai={angka.total.toLocaleString('id-ID')}
          persen={persenLengkap}
          persenLabel={teks('Nilai yang sudah masuk')}
          kaki={
            <KakiLipat
              buka={bukaAngka}
              onToggle={() => setBukaAngka((v) => !v)}
              idIsi="angka-lain"
              ringkas={
                teks('rata-rata {n}', { n: angka.rata ?? '-' }) +
                ' · ' +
                teks('{n} final', { n: angka.final.toLocaleString('id-ID') })
              }
            />
          }
        />

        {/* sm:contents melebur pembungkus ini di layar lebar. */}
        <div id="angka-lain" className={(bukaAngka ? 'grid ' : 'hidden ') + 'gap-5 sm:contents'}>
          <Angka
            judul={teks('Rata-rata nilai')}
            nilai={angka.rata ?? '-'}
            satuan={teks('dari 100')}
            persen={bagi(angka.diAtasAmbang)}
            persenLabel={teks('Di atas batas {ambang}', { ambang: CONFIG.AMBANG_SERTIFIKAT })}
          />
          <Angka
            judul={teks('Nilai sudah final')}
            nilai={angka.final.toLocaleString('id-ID')}
            satuan={teks('dari {n}', { n: angka.total.toLocaleString('id-ID') })}
            persen={bagi(angka.final)}
            persenLabel={teks('Sudah dikunci')}
          />
        </div>
      </section>

      <section>
        <PerkembanganAngkatan rows={rows} />
      </section>

      {/* -------------------------------- sebaran -------------------------------- */}
      <section>
        <MutuDonut huruf={angka.huruf} totalMahasiswa={angka.total} />
      </section>
    </div>
  )
}
