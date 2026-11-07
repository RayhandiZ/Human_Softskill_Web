import { useState } from 'react'
import { flushSync } from 'react-dom'
import { IconAlert, IconChat, IconCheck, IconClock, IconPrint, IconX } from '../../components/Icons'
import { CatatanKaki, StatusTeks } from '../../components/Ui'
import { kelayakanSertifikat } from '../../lib/rules'
import { hurufMutu } from '../../lib/scoring'
import { catatCetakSertifikat, mintaSertifikat, segarkanData, sertifikatMilik, useStore } from '../../lib/store'
import { LANGKAH_SERTIFIKAT, LABEL_SERTIFIKAT, keadaanSertifikat } from '../../lib/duaLapis'
import { useBahasa } from '../../lib/bahasa'
import { boleh } from '../../lib/wewenang'
import { tautanWhatsapp } from '../../lib/layanan'
import { tanggalPendek } from '../../lib/tanggal'
import { useStudent } from './StudentLayout'
import LembarSertifikat from './LembarSertifikat'

/* Sertifikat mahasiswa. Sejak rapat 24 Okt 2026 memenuhi seluruh syarat saja belum cukup: mahasiswa meminta akses
   cetak, admin Kemahasiswaan meninjaunya, lalu Super Admin menyetujuinya, baru sertifikat bisa dicetak atau disimpan
   sebagai PDF dari halaman ini. Rekomendasi admin untuk Super Admin tidak dikirim ke mahasiswa (susunSertifikat di
   src/server/muat.js); yang terbaca di sini hanya keputusan akhirnya. Sertifikat tidak dikirim lewat surel. Akses yang sudah disetujui bisa dicabut Kemahasiswaan, dan
   setiap kali dibuka untuk dicetak tercatat. Lihat src/server/sertifikat.js dan README.md › Sertifikat. */

/* Halaman ini memisahkan dua hal: izin cetak (dikelola Kemahasiswaan) dan kelayakan akademik (syarat nilai dan aspek).
   Dulu keduanya bercampur, jadi akses yang dicabut terbaca bertentangan dengan syarat yang semuanya tercentang. */

const JUDUL_IZIN = {
  belum_layak: 'Belum bisa diminta',
  bisa_diminta: 'Belum diminta',
  menunggu_admin: 'Sedang ditinjau',
  menunggu_superadmin: 'Sedang ditinjau',
  siap_dicetak: 'Akses cetak disetujui',
  ditolak: 'Permintaan akses cetak ditolak',
  dicabut: 'Akses cetak dicabut',
}

const KALIMAT_IZIN = {
  belum_layak: 'Akses cetak bisa diminta setelah seluruh syarat di bawah terpenuhi, tanpa terlewat satu pun.',
  bisa_diminta: 'Semua syarat terpenuhi. Minta akses cetak untuk mendapatkan sertifikatmu.',
  siap_dicetak: 'Sertifikat siap dicetak atau disimpan sebagai PDF.',
}

const LANGKAH_BERIKUTNYA = {
  menunggu_admin: 'Admin Kemahasiswaan meninjau permintaanmu, lalu Super Admin memutuskannya.',
  menunggu_superadmin: 'Admin Kemahasiswaan sudah meninjau. Super Admin akan memutuskannya.',
}

const CATATAN_CETAK = {
  siap_dicetak:
    'Sertifikat dicetak, atau disimpan sebagai PDF lewat dialog cetak, dari tombol di halaman ini, dan setiap pembukaan dialog cetak tercatat. Sertifikat tidak dikirim lewat surel.',
  dicabut: 'Setelah akses dipulihkan, tombol Cetak / Simpan PDF akan tersedia di halaman ini. Sertifikat tidak dikirim lewat surel.',
}
const CATATAN_CETAK_BAWAAN =
  'Setelah akses disetujui, tombol Cetak / Simpan PDF akan tersedia di halaman ini. Sertifikat tidak dikirim lewat surel.'

export default function Sertifikat() {
  useStore()
  const { t: teks, bahasa } = useBahasa()
  const student = useStudent()
  const k = kelayakanSertifikat(student)
  const t = k.transkrip
  const permintaan = sertifikatMilik(student.nim)
  const keadaan = keadaanSertifikat(k.layak, permintaan)
  const bolehCetak = keadaan === 'siap_dicetak'
  const peringatan = keadaan === 'ditolak' || keadaan === 'dicabut'
  // Keadaan yang tombol permintaannya tampil, dan apakah Super Admin sedang menutup permintaan baru (sakelar
  // MINTA_SERTIFIKAT di Peran & Wewenang). Permintaan yang berjalan dan akses yang sudah disetujui tidak terpengaruh.
  const bisaMinta = keadaan === 'bisa_diminta' || peringatan
  const permintaanDitutup = bisaMinta && !boleh('MINTA_SERTIFIKAT')
  // Selama ditutup, kalimat "Minta akses cetak ..." tidak ditawarkan; syarat yang terpenuhi tetap disebut.
  const kalimatIzin =
    permintaanDitutup && keadaan === 'bisa_diminta' ? 'Semua syarat nilai dan aspek terpenuhi.' : KALIMAT_IZIN[keadaan]
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const [mencetak, setMencetak] = useState(false)

  async function minta() {
    setSibuk(true)
    setGalat('')
    try {
      await mintaSertifikat({ student })
    } catch (e) {
      setGalat(teks(e.message))
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
      setGalat(teks(e.message))
      segarkanData()
    } finally {
      setSibuk(false)
    }
  }

  return (
    <>
      {/* Lembar hanya dipasang selama dialog cetak yang dibuka tombol Cetak / Simpan PDF, jadi Ctrl+P biasa tidak
          menghasilkan sertifikat: setiap cetak tercatat, dan akses yang sudah dicabut tidak bisa dipakai. */}
      {bolehCetak && mencetak ? (
        <LembarSertifikat student={student} transkrip={t} />
      ) : (
        <p className="hidden p-8 text-[14px] text-black print:block">
          {teks('Sertifikat hanya bisa dicetak lewat tombol Cetak / Simpan PDF di halaman ini, setelah akses cetaknya disetujui.')}
        </p>
      )}

      <div className="space-y-6 print:hidden">
        <header className="pt-2">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">
            {teks('Sertifikat Pembinaan VIBE')}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            {teks('Sertifikat butuh dua hal: kelayakan akademik dari nilaimu, dan izin cetak dari Kemahasiswaan.')}
          </p>
        </header>

        {/* ------------------------------- izin cetak ------------------------------ */}
        {/* Peringatan memakai permukaan padat: statusnya harus terbaca sama di atas apa pun. */}
        <section aria-labelledby="judul-izin" className={'kartu px-6 py-5 sm:px-7 ' + (peringatan ? 'kartu-peringatan' : '')}>
          <p className="flex flex-wrap items-baseline gap-x-2 text-[13.5px]">
            <span id="judul-izin" className="font-bold text-ink">
              {teks('Izin cetak')}
            </span>
            <span className="text-ink-2">{teks('Dikelola Kemahasiswaan, terpisah dari kelayakan akademik.')}</span>
          </p>

          <div className="mt-3 flex items-start gap-3">
            <TandaIzin keadaan={keadaan} />
            <div className="min-w-0 flex-1">
              <h2
                className={
                  'text-[20px] font-extrabold leading-tight tracking-tight ' +
                  (peringatan ? 'text-[color:var(--teks-kritis)]' : 'text-ink')
                }
              >
                {teks(JUDUL_IZIN[keadaan])}
              </h2>
              {KALIMAT_IZIN[keadaan] ? (
                <p id="alasan-cetak" className="mt-1 text-[14px] leading-relaxed text-ink-2">
                  {teks(kalimatIzin)}
                </p>
              ) : null}
            </div>
          </div>

          {keadaan === 'dicabut' ? (
            <RincianAkses
              baris={[
                ['Alasan', permintaan?.dicabut?.alasan || teks('Alasannya belum dicatat.')],
                ['Dicabut oleh', jejak(permintaan?.dicabut, bahasa)],
                [
                  'Yang perlu dilakukan',
                  teks('Rincian langkahnya belum tersedia. Hubungi Kemahasiswaan untuk meminta penjelasan. Bila masalahnya sudah selesai, ajukan peninjauan akses.'),
                ],
              ]}
            />
          ) : null}

          {keadaan === 'ditolak' ? (
            <RincianAkses
              baris={[
                ['Alasan', permintaan?.ditolak?.catatan || teks('Alasannya belum dicatat.')],
                ['Ditolak oleh', jejak(permintaan?.ditolak, bahasa)],
                [
                  'Yang perlu dilakukan',
                  teks('Rincian langkahnya belum tersedia. Hubungi Kemahasiswaan untuk meminta penjelasan. Bila sudah sesuai, minta akses cetak lagi.'),
                ],
              ]}
            />
          ) : null}

          {LANGKAH_BERIKUTNYA[keadaan] ? (
            <RincianAkses
              baris={[
                ['Diajukan', tanggalPendek(permintaan?.diajukan, bahasa)],
                ['Langkah berikutnya', teks(LANGKAH_BERIKUTNYA[keadaan])],
              ]}
            />
          ) : null}

          {permintaanDitutup ? (
            <p className="mt-4 flex items-start gap-2 text-[14px] font-semibold leading-relaxed text-ink">
              <IconClock size={17} className="mt-0.5 shrink-0 text-ink-2" />
              {teks('Permintaan akses cetak sedang ditutup Super Admin untuk sementara. Tombolnya muncul lagi setelah dibuka.')}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {bisaMinta && !permintaanDitutup ? (
              <button type="button" onClick={minta} disabled={sibuk} className="btn-primary inline-flex min-h-[44px] items-center gap-2">
                <IconCheck size={17} />
                {teks(
                  keadaan === 'dicabut'
                    ? 'Ajukan peninjauan akses'
                    : keadaan === 'ditolak'
                      ? 'Minta akses cetak lagi'
                      : 'Minta akses cetak',
                )}
              </button>
            ) : null}
            {bolehCetak ? (
              <button type="button" onClick={cetak} disabled={sibuk} className="btn-primary inline-flex min-h-[44px] items-center gap-2">
                <IconPrint size={17} />
                {teks('Cetak / Simpan PDF')}
              </button>
            ) : null}
            {peringatan ? (
              <a
                href={tautanWhatsapp(
                  teks('Halo, saya {nama} (NIM {nim}). Saya ingin meminta penjelasan soal akses cetak sertifikat VIBE saya.', {
                    nama: student.name,
                    nim: student.nim,
                  }),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost inline-flex min-h-[44px] items-center gap-2"
              >
                <IconChat size={17} />
                {teks('Hubungi Kemahasiswaan')}
              </a>
            ) : null}
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

          {permintaan && LANGKAH_SERTIFIKAT.includes(keadaan) ? <LangkahAkses permintaan={permintaan} /> : null}

          <CatatanKaki>{teks(CATATAN_CETAK[keadaan] ?? CATATAN_CETAK_BAWAAN)}</CatatanKaki>
        </section>

        {/* --------------------------- kelayakan akademik --------------------------- */}
        <section aria-labelledby="judul-kelayakan" className="kartu px-6 py-5 sm:px-7">
          <h2 id="judul-kelayakan" className="text-[17px] font-extrabold text-ink">
            {teks('Kelayakan akademik')}
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
            {k.layak
              ? teks('Semua syarat nilai dan aspek terpenuhi.') +
                ' ' +
                teks('Nilai akhir {nilai}, predikat {huruf}.', { nilai: t.akhir.nilai, huruf: hurufMutu(t.akhir.nilai)?.huruf })
              : teks('{n} dari {total} syarat belum terpenuhi.', { n: k.gagal.length, total: k.syarat.length })}
          </p>
          <ul className="mt-2 divide-y divide-line">
            {k.syarat.map((s) => (
              <li key={s.id} className="flex items-start gap-3 py-3">
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

/** "Biro Kemahasiswaan, 25 Okt 2026" dari jejak keputusan { oleh, tanggal }. */
function jejak(keputusan, bahasa) {
  return [keputusan?.oleh, tanggalPendek(keputusan?.tanggal, bahasa)].filter(Boolean).join(', ')
}

function TandaIzin({ keadaan }) {
  const Ikon =
    keadaan === 'ditolak' || keadaan === 'dicabut'
      ? IconAlert
      : keadaan === 'siap_dicetak'
        ? IconCheck
        : keadaan === 'menunggu_admin' || keadaan === 'menunggu_superadmin'
          ? IconClock
          : null
  if (!Ikon) return null
  return (
    <span
      className={
        'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' +
        (Ikon === IconAlert ? 'tanda-peringatan' : 'bg-brand-soft text-brand-ink')
      }
    >
      <Ikon size={19} />
    </span>
  )
}

/** Baris berlabel di bawah judul status: alasan, siapa, tanggal, dan apa yang perlu dilakukan. `baris`: [kunci kamus label, isi]. */
function RincianAkses({ baris }) {
  const { t: teks } = useBahasa()
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2.5 border-t border-line pt-4 sm:grid-cols-[170px_minmax(0,1fr)]">
      {baris
        .filter(([, isi]) => isi)
        .map(([label, isi]) => (
          <div key={label} className="contents">
            <dt className="text-[14px] font-bold leading-relaxed text-ink">{teks(label)}</dt>
            <dd className="-mt-2 text-[14px] leading-relaxed text-ink sm:mt-0">{isi}</dd>
          </div>
        ))}
    </dl>
  )
}

/** Tiga langkah akses cetak: Menunggu Admin, Menunggu Super Admin, Siap dicetak; yang sudah lewat bertanda centang. */
function LangkahAkses({ permintaan }) {
  const { t: teks, bahasa } = useBahasa()
  const sekarang = LANGKAH_SERTIFIKAT.indexOf(permintaan.status)
  const keterangan = [
    permintaan.lapis1
      ? teks('Ditinjau {tanggal}', { tanggal: tanggalPendek(permintaan.lapis1.tanggal, bahasa) })
      : teks('Diajukan {tanggal}', { tanggal: tanggalPendek(permintaan.diajukan, bahasa) }),
    permintaan.lapis2
      ? teks('Disetujui {tanggal}', { tanggal: tanggalPendek(permintaan.lapis2.tanggal, bahasa) })
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
