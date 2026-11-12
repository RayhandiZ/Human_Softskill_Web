import { useMemo, useState } from 'react'
import { JudulHalaman, KartuAngka } from '../../components/Ui'
import MutuDonut from '../../components/charts/MutuDonut'
import PerkembanganAngkatan from '../../components/charts/PerkembanganAngkatan'
import { IconCheck, IconChevronDown, IconList, IconTarget, IconUsers } from '../../components/Icons'
import { CONFIG } from '../../lib/config'
import { useTeks } from '../../lib/bahasa'
import { STUDENTS, kelengkapanMatriks, ringkas } from '../../lib/data'
import { useStore } from '../../lib/store'

/* Sengaja tenang; lihat README.md › Ringkasan admin sengaja dibuat tenang. Empat kartu angka di atas, lalu dua grafik
   selebar halaman. Pekerjaan yang menunggu ada di lonceng bilah atas (LoncengKemahasiswaan.jsx): kartu "Perlu dikerjakan"
   yang dulu menempel di kanan grafik dihapus pada 11 Nov 2026 atas permintaan pemilik produk, karena isinya sama dengan
   lonceng dan mengganggu. Navigasi ada di menu samping, jadi tidak ada kartu "Halaman lain". */

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
    // Tanpa nilai yang wajib masuk, kelengkapannya belum ada; bukan 0%.
    return total ? Math.round((terisi / total) * 100) : null
  }, [rows])

  return (
    <div className="space-y-5">
      {/* --------------------------------- kepala -------------------------------- */}
      <JudulHalaman
        judul="Overview"
        keterangan={teks('Capaian mahasiswa periode ini. Pekerjaan yang menunggu Anda ada di lonceng di kanan atas.')}
      />

      {/* --------------------------------- angka --------------------------------- */}
      <section aria-label={teks('Ringkasan angka')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Angka
          ikon={IconUsers}
          judul={teks('Mahasiswa terpantau')}
          nilai={angka.total.toLocaleString('id-ID')}
          keterangan={teks('Mahasiswa pada angkatan yang bisa Anda lihat.')}
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
        <div id="angka-lain" className={(bukaAngka ? 'grid ' : 'hidden ') + 'gap-4 sm:contents'}>
          <Angka
            ikon={IconTarget}
            judul={teks('Rata-rata nilai')}
            nilai={angka.rata ?? '-'}
            satuan={teks('dari 100')}
            persen={bagi(angka.diAtasAmbang)}
            persenLabel={teks('Di atas batas {ambang}', { ambang: CONFIG.AMBANG_SERTIFIKAT })}
          />
          <Angka
            ikon={IconCheck}
            judul={teks('Nilai sudah final')}
            nilai={angka.final.toLocaleString('id-ID')}
            satuan={teks('dari {n}', { n: angka.total.toLocaleString('id-ID') })}
            persen={bagi(angka.final)}
            persenLabel={teks('Sudah final')}
          />
          <Angka
            ikon={IconList}
            judul={teks('Kelengkapan nilai')}
            nilai={persenLengkap == null ? '–' : persenLengkap + '%'}
            keterangan={teks('Nilai yang sudah masuk') + '. ' + teks('Dihitung dari tugas sampai semester berjalan tiap mahasiswa.')}
          />
        </div>
      </section>

      {/* ------------------------- grafik, selebar halaman ------------------------- */}
      <PerkembanganAngkatan rows={rows} />
      <MutuDonut huruf={angka.huruf} totalMahasiswa={angka.total} />
    </div>
  )
}
