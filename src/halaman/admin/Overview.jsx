import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '../../components/Ui'
import MutuDonut from '../../components/charts/MutuDonut'
import PerkembanganAngkatan from '../../components/charts/PerkembanganAngkatan'
import {
  IconBuilding,
  IconCertificate,
  IconCheckShield,
  IconChevronDown,
  IconChevronRight,
  IconDocument,
  IconList,
  IconUpload,
  IconUsers,
} from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { useTeks } from '../../lib/bahasa'
import {
  PERIODE_AKTIF,
  STUDENTS,
  kelengkapanMatriks,
  labelPeriode,
  ringkas,
} from '../../lib/data'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'

/* --------------------------------------------------------------------------
   Halaman pertama yang dilihat dosen dan staf kemahasiswaan.

   Sengaja dibuat tenang: sedikit angka, huruf besar, kalimat biasa, dan tautan
   yang menyebut tujuannya. Grafiknya SATU saja — sebaran huruf mutu — karena
   itulah pertanyaan yang paling sering ditanyakan sekilas. Filter bertingkat,
   tabel padat, dan grafik lainnya tinggal di halaman rincian masing-masing.
   Halaman ini hanya menjawab dua hal: bagaimana keadaannya, dan apa yang perlu
   saya kerjakan.
   -------------------------------------------------------------------------- */

/* Satu angka besar, satu kalimat penjelas, dan — bila bermakna — satu
   persentase dengan bilah tipis. Persentasenya selalu ditulis angkanya, bilah
   hanya membantu membandingkan sekilas. */
function Angka({ nilai, satuan, judul, keterangan, persen, persenLabel, kaki }) {
  const t = useTeks()
  return (
    <Card className="px-6 py-7">
      <p className="text-[15px] font-semibold text-ink-2">{t(judul)}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[46px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
          {nilai}
        </span>
        {satuan ? <span className="text-[18px] font-semibold text-ink-2">{t(satuan)}</span> : null}
      </p>

      {typeof persen === 'number' ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14px] text-ink-2">{t(persenLabel)}</span>
            <span className="text-[18px] font-extrabold tabular-nums text-ink">{persen}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--grid)]">
            <div
              className="h-full rounded-full bg-brand-ink"
              style={{ width: Math.max(2, Math.min(100, persen)) + '%' }}
            />
          </div>
        </div>
      ) : null}

      {/* Bersyarat: tanpa ini, kartu yang keterangannya kosong tetap menyisakan
          satu baris kosong beserta jaraknya. */}
      {keterangan ? (
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{t(keterangan)}</p>
      ) : null}

      {/* Kaki kartu — tempat tombol lipat, mengikuti pola kartu "Nilai akhir"
          di panel mahasiswa. Hanya kartu pertama yang memilikinya. */}
      {kaki}
    </Card>
  )
}

/* Baris kaki di dalam kartu: ringkasan di kiri, tombol lipat di kanan. Hanya
   muncul di ponsel; di layar lebar seluruh kartu memang sudah terlihat. */
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

/* Tautan ke halaman lain — judul besar, satu kalimat, dan "Lihat selengkapnya". */
function Pintu({ ke, judul, keterangan, icon: Icon, sembunyi = false }) {
  const t = useTeks()
  return (
    /* Kelas sembunyi dipasang pada <li>-nya sendiri, bukan pada pembungkus
       tambahan: <li> di dalam <li> bukan markup yang sah. */
    <li className={sembunyi ? 'hidden sm:block' : undefined}>
      <Link
        href={ke}
        className="flex h-full flex-col rounded-2xl border border-line bg-surface px-6 py-6 transition hover:border-brand-ink hover:bg-surface-2"
      >
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <Icon size={24} />
        </span>
        <span className="mt-4 text-[17px] font-bold text-ink">{t(judul)}</span>
        <span className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{t(keterangan)}</span>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-bold text-brand-ink underline underline-offset-4">
          {t('Lihat selengkapnya')}
          <IconChevronRight size={17} />
        </span>
      </Link>
    </li>
  )
}

export default function Overview() {
  const teks = useTeks()
  // Ikut menghitung ulang begitu ada nilai yang masuk dari panel Kemahasiswaan.
  const versi = useStore()
  const { admin } = useAuth()

  const rows = useMemo(() => [...STUDENTS], [versi])

  const angka = useMemo(() => ringkas(rows), [rows])

  /* Dua bagian yang paling memanjangkan gulir di ponsel. Di layar >= 640px
     keduanya terbentang sendiri dan tombolnya tidak dirender sama sekali. */
  const [bukaAngka, setBukaAngka] = useState(false)
  const [bukaHalaman, setBukaHalaman] = useState(false)

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
    <div className="space-y-8">
      {/* --------------------------------- kepala -------------------------------- */}
      <header>
        <h1 className="text-[25px] font-extrabold leading-tight tracking-tight text-ink">Overview</h1>
      </header>

      {/* --------------------------------- angka --------------------------------- */}
      <section className="grid gap-5 md:grid-cols-3">
        <Angka
          judul="Mahasiswa terpantau"
          nilai={angka.total.toLocaleString('id-ID')}
          persen={persenLengkap}
          persenLabel="Nilai yang sudah masuk"
          // keterangan="Tersebar di empat fakultas, angkatan 2024 sampai 2026."
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

        {/* sm:contents melebur pembungkus ini di layar lebar, sehingga kedua
            kartu kembali menjadi anggota grid induknya seperti biasa. */}
        <div
          id="angka-lain"
          className={(bukaAngka ? 'grid ' : 'hidden ') + 'gap-5 sm:contents'}
        >
        <Angka
          judul="Rata-rata nilai softskill"
          nilai={angka.rata ?? '—'}
          satuan="dari 100"
          persen={bagi(angka.diAtasAmbang)}
          persenLabel={teks('Di atas batas {ambang}', { ambang: CONFIG.AMBANG_SERTIFIKAT })}
          // keterangan={'Batas kelulusan pembinaan adalah ' + CONFIG.AMBANG_SERTIFIKAT + '.'}
        />
        <Angka
          judul="Nilai sudah final"
          nilai={angka.final.toLocaleString('id-ID')}
          satuan={teks('dari {n}', { n: angka.total.toLocaleString('id-ID') })}
          persen={bagi(angka.final)}
          persenLabel="Sudah dikunci"
          // keterangan="Mahasiswa yang seluruh sepuluh aspeknya sudah dinilai dan dikunci."
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

      {/* ------------------------------ halaman lain ----------------------------- */}
      <section>
        <h2 className="mb-3 text-[25px] font-extrabold tracking-tight text-ink">
          {teks('Halaman lain')}
        </h2>
        <ul id="halaman-lain" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Pintu
            ke="/admin/nilai"
            icon={IconUpload}
            judul="Input &amp; Import Nilai"
            keterangan="Masukkan nilai satu per satu, atau unggah rekap dari Excel."
          />
          <Pintu
            sembunyi={!bukaHalaman}
            ke="/admin/usulan"
            icon={IconCheckShield}
            judul="Persetujuan Nilai Dosen"
            keterangan="Setujui atau tolak nilai yang dikirim dosen pengampu."
          />
          <Pintu
            sembunyi={!bukaHalaman}
            ke="/admin/mahasiswa"
            icon={IconUsers}
            judul="Data Mahasiswa"
            keterangan="Cari mahasiswa, lihat nilainya, dan buka transkrip lengkapnya."
          />
          <Pintu
            sembunyi={!bukaHalaman}
            ke="/admin/program-studi"
            icon={IconBuilding}
            judul="Program Studi"
            keterangan="Bandingkan capaian antar program studi, fakultas, dan angkatan."
          />
          <Pintu
            sembunyi={!bukaHalaman}
            ke="/admin/angkatan"
            icon={IconCertificate}
            judul="Angkatan &amp; Sertifikat"
            keterangan="Kunci angkatan yang sudah selesai, lalu terbitkan sertifikatnya."
          />
          <Pintu
            sembunyi={!bukaHalaman}
            ke="/admin/kurikulum"
            icon={IconDocument}
            judul="Kurikulum CPMK"
            keterangan="Sepuluh aspek penilaian, komponen asesmen, dan bobotnya."
          />
          <Pintu
            sembunyi={!bukaHalaman}
            ke="/admin/log"
            icon={IconList}
            judul="Log Aktivitas"
            keterangan="Catatan setiap perubahan nilai beserta siapa yang mengubahnya."
          />
          {/* Tombol berbentuk kartu, jadi ia terbaca sebagai bagian dari
              daftar — bukan kendali yang melayang di atasnya. */}
          <li className="sm:hidden">
            <button
              type="button"
              onClick={() => setBukaHalaman((v) => !v)}
              aria-expanded={bukaHalaman}
              aria-controls="halaman-lain"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-4 text-[14px] font-bold text-brand-ink transition hover:border-brand-ink"
            >
              {teks(bukaHalaman ? 'Sembunyikan' : 'Tampilkan 6 halaman lainnya')}
              <IconChevronDown
                size={17}
                className={'transition-transform ' + (bukaHalaman ? 'rotate-180' : '')}
              />
            </button>
          </li>
        </ul>
      </section>
    </div>
  )
}
