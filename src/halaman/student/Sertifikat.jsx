import { useState } from 'react'
import { flushSync } from 'react-dom'
import { IconAlert, IconCheck, IconClock, IconPrint, IconX } from '../../components/Icons'
import { CatatanKaki, StatusTeks } from '../../components/Ui'
import { kelayakanSertifikat } from '../../lib/rules'
import { hurufMutu } from '../../lib/scoring'
import { catatCetakSertifikat, mintaSertifikat, segarkanData, sertifikatMilik, useStore } from '../../lib/store'
import { LANGKAH_SERTIFIKAT, LABEL_SERTIFIKAT, keadaanSertifikat } from '../../lib/duaLapis'
import { useBahasa } from '../../lib/bahasa'
import { useStudent } from './StudentLayout'
import LembarSertifikat from './LembarSertifikat'

/* Sertifikat mahasiswa. Sejak rapat 24 Okt 2026 memenuhi seluruh syarat saja belum cukup: mahasiswa meminta akses
   cetak, admin Kemahasiswaan lalu Super Admin menyetujuinya, baru sertifikat bisa dicetak atau disimpan sebagai PDF
   dari halaman ini. Sertifikat tidak dikirim lewat surel. Akses yang sudah disetujui bisa dicabut Kemahasiswaan, dan
   setiap kali dibuka untuk dicetak tercatat. Lihat src/server/sertifikat.js dan README.md › Sertifikat. */

const KALIMAT_KEADAAN = {
  bisa_diminta: 'Semua syarat terpenuhi. Minta akses cetak untuk mendapatkan sertifikatmu.',
  menunggu_admin: 'Permintaan akses cetak sedang ditinjau admin Kemahasiswaan.',
  menunggu_superadmin: 'Admin Kemahasiswaan sudah menyetujui. Menunggu persetujuan Super Admin.',
  siap_dicetak: 'Akses cetak sudah disetujui. Sertifikat siap dicetak.',
  ditolak: 'Permintaan akses cetak ditolak. Periksa alasannya, lalu ajukan lagi bila sudah sesuai.',
  dicabut: 'Akses cetak sertifikatmu dicabut. Baca alasannya, lalu minta lagi bila masalahnya sudah selesai.',
}

export default function Sertifikat() {
  useStore()
  const { t: teks } = useBahasa()
  const student = useStudent()
  const k = kelayakanSertifikat(student)
  const t = k.transkrip
  const permintaan = sertifikatMilik(student.nim)
  const keadaan = keadaanSertifikat(k.layak, permintaan)
  const bolehCetak = keadaan === 'siap_dicetak'
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const [mencetak, setMencetak] = useState(false)

  async function minta() {
    setSibuk(true)
    setGalat('')
    try {
      await mintaSertifikat({ student })
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  async function cetak() {
    setSibuk(true)
    setGalat('')
    try {
      // Server mencatat dan memeriksa dulu: akses yang baru dicabut ditolak walau halaman ini dimuat sebelumnya.
      await catatCetakSertifikat(permintaan.id, { aktor: student.name })
      flushSync(() => setMencetak(true))
      const selesai = () => {
        window.removeEventListener('afterprint', selesai)
        setMencetak(false)
      }
      window.addEventListener('afterprint', selesai)
      window.print()
    } catch (e) {
      setGalat(e.message)
      segarkanData()
    } finally {
      setSibuk(false)
    }
  }

  return (
    <>
      {/* Lembar hanya dipasang selama dialog cetak yang dibuka tombol Cetak sertifikat, jadi Ctrl+P biasa tidak
          menghasilkan sertifikat: setiap cetak tercatat, dan akses yang sudah dicabut tidak bisa dipakai. */}
      {bolehCetak && mencetak ? (
        <LembarSertifikat student={student} transkrip={t} />
      ) : (
        <p className="hidden p-8 text-[14px] text-black print:block">
          {teks('Sertifikat hanya bisa dicetak lewat tombol Cetak sertifikat di halaman ini, setelah akses cetaknya disetujui.')}
        </p>
      )}

      <div className="space-y-6 print:hidden">
        <section className="kartu px-6 py-6 sm:px-7">
          <p className="text-[13px] font-semibold text-ink-2">{teks('Sertifikat')}</p>
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">{teks('Sertifikat Pembinaan VIBE')}</h1>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            {/* Lebar minimum supaya di HP tombolnya turun ke baris berikut, bukan menjepit kalimat jadi satu kata per baris. */}
            <div className="min-w-[min(100%,18rem)] flex-1">
              <p className="text-[15px] font-bold text-ink">
                {keadaan === 'belum_layak'
                  ? teks('{n} dari {total} syarat belum terpenuhi.', { n: k.gagal.length, total: k.syarat.length })
                  : teks(KALIMAT_KEADAAN[keadaan])}
              </p>
              <p id="alasan-cetak" className="mt-1 text-[13px] text-ink-2">
                {keadaan === 'belum_layak'
                  ? teks('Akses cetak bisa diminta setelah seluruh syarat di bawah terpenuhi, tanpa terlewat satu pun.')
                  : teks('Nilai akhir {nilai}, predikat {huruf}.', { nilai: t.akhir.nilai, huruf: hurufMutu(t.akhir.nilai)?.huruf })}
              </p>
            </div>

            {keadaan === 'bisa_diminta' || keadaan === 'ditolak' || keadaan === 'dicabut' ? (
              <button type="button" onClick={minta} disabled={sibuk} className="btn-primary inline-flex min-h-[44px] items-center gap-2">
                <IconCheck size={17} />
                {keadaan === 'bisa_diminta' ? teks('Minta akses cetak') : teks('Minta akses cetak lagi')}
              </button>
            ) : (
              <button
                type="button"
                onClick={cetak}
                disabled={!bolehCetak || sibuk}
                aria-describedby="alasan-cetak"
                // Opasitas penuh: tulisan tombol mati ini status ("Menunggu persetujuan"), dan opacity-50 bawaan .btn
                // menurunkan kontrasnya dari 6,5:1 menjadi 2,2:1. Rupa abunya tetap menandai tombol tidak bisa ditekan.
                className="btn-primary inline-flex min-h-[44px] items-center gap-2 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-2 disabled:opacity-100 disabled:shadow-none"
              >
                {bolehCetak || keadaan === 'belum_layak' ? <IconPrint size={17} /> : <IconClock size={17} />}
                {bolehCetak || keadaan === 'belum_layak' ? teks('Cetak sertifikat') : teks('Menunggu persetujuan')}
              </button>
            )}
          </div>

          {galat ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]"
            >
              <IconAlert size={16} className="mt-px shrink-0" />
              {galat}
            </p>
          ) : null}

          {keadaan === 'ditolak' && permintaan?.ditolak ? (
            <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-[13.5px] leading-relaxed text-ink">
              <span className="font-bold">{teks('Alasan penolakan')}:</span> {permintaan.ditolak.catatan}
              <span className="mt-1 block text-[12.5px] text-ink-2">
                {teks('{oleh}, {tanggal}', { oleh: permintaan.ditolak.oleh ?? '', tanggal: permintaan.ditolak.tanggal })}
              </span>
            </p>
          ) : null}

          {keadaan === 'dicabut' && permintaan?.dicabut ? (
            <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-[13.5px] leading-relaxed text-ink">
              <span className="font-bold">{teks('Alasan pencabutan')}:</span> {permintaan.dicabut.alasan}
              <span className="mt-1 block text-[12.5px] text-ink-2">
                {teks('{oleh}, {tanggal}', { oleh: permintaan.dicabut.oleh ?? '', tanggal: permintaan.dicabut.tanggal })}
              </span>
            </p>
          ) : null}

          {permintaan && !['belum_layak', 'ditolak', 'dicabut'].includes(keadaan) ? (
            <LangkahAkses permintaan={permintaan} />
          ) : null}

          <CatatanKaki>
            {teks('Sertifikat dicetak, atau disimpan sebagai PDF lewat dialog cetak, dari tombol di halaman ini, dan setiap pembukaan dialog cetak tercatat. Sertifikat tidak dikirim lewat surel.')}
          </CatatanKaki>
        </section>

        <section className="kartu px-6 py-5 sm:px-7">
          <h2 className="text-[17px] font-extrabold text-ink">{teks('Syarat kelayakan')}</h2>
          <ul className="mt-3 divide-y divide-line">
            {k.syarat.map((s) => (
              <li key={s.id} className="flex items-start gap-3 py-3.5">
                <span className="mt-0.5 text-ink-2">{s.lolos ? <IconCheck size={18} /> : <IconX size={18} />}</span>
                <div className="min-w-0 flex-1">
                  {/* labelT/alasanT, bukan label/alasan: kalimat jadi yang berisi angka tidak ada di kamus, jadi dulu
                      tetap berbahasa Indonesia di mode Inggris. Sama seperti StudentDetail admin. */}
                  <p className="text-[14.5px] font-semibold text-ink">{teks(...s.labelT)}</p>
                  {!s.lolos && s.alasanT ? (
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{teks(...s.alasanT)}</p>
                  ) : null}
                </div>
                <StatusTeks kuat={!s.lolos}>{teks(s.lolos ? 'Terpenuhi' : 'Belum terpenuhi')}</StatusTeks>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

/** Tiga langkah akses cetak: Menunggu Admin, Menunggu Super Admin, Siap dicetak; yang sudah lewat bertanda centang. */
function LangkahAkses({ permintaan }) {
  const { t: teks } = useBahasa()
  const sekarang = LANGKAH_SERTIFIKAT.indexOf(permintaan.status)
  const keterangan = [
    permintaan.lapis1
      ? teks('Disetujui {tanggal}', { tanggal: permintaan.lapis1.tanggal })
      : teks('Diajukan {tanggal}', { tanggal: permintaan.diajukan }),
    permintaan.lapis2
      ? teks('Disetujui {tanggal}', { tanggal: permintaan.lapis2.tanggal })
      : permintaan.status === 'menunggu_superadmin'
        ? teks('Sedang ditinjau')
        : teks('Belum'),
    permintaan.status === 'siap_dicetak' ? teks('Bisa dicetak sekarang') : teks('Belum'),
  ]
  return (
    <ol aria-label={teks('Langkah akses cetak')} className="mt-5 grid gap-3 sm:grid-cols-3">
      {LANGKAH_SERTIFIKAT.map((s, i) => {
        const selesai = i < sekarang || permintaan.status === 'siap_dicetak'
        const aktif = i === sekarang && permintaan.status !== 'siap_dicetak'
        return (
          <li
            key={s}
            aria-current={aktif ? 'step' : undefined}
            className={
              'flex items-start gap-3 rounded-2xl border px-4 py-3 ' +
              (aktif ? 'border-brand-ink bg-brand-soft' : 'border-line bg-surface')
            }
          >
            <span
              className={
                'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ' +
                (selesai ? 'bg-brand-ink text-[var(--surface)]' : aktif ? 'bg-surface text-brand-ink' : 'bg-surface-2 text-ink-2')
              }
            >
              {selesai ? <IconCheck size={15} /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold text-ink">{teks(LABEL_SERTIFIKAT[s])}</span>
              <span className="block text-[12.5px] text-ink-2">{keterangan[i]}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
