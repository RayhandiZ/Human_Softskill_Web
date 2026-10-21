import { Card, CardHeader } from '../../components/Ui'
import {
  IconBook,
  IconBuilding,
  IconCheck,
  IconCheckShield,
  IconClock,
  IconMinus,
  IconPencil,
} from '../../components/Icons'
import { useTeks } from '../../lib/bahasa'

/* Matriks wewenang tiap peran, diturunkan dari aturan server (src/server/persetujuan.js, tangani() di api.js).
   Hanya bacaan: peran diubah lewat basis data. Lihat README.md › Panel Super Admin. */

const PERAN = ['Mahasiswa', 'Dosen', 'Kemahasiswaan', 'Super Admin']
const SUPER = PERAN.indexOf('Super Admin')

// Ikon per peran, menurut pekerjaan utamanya: melihat capaian, mengusulkan nilai, mengelola, mengawasi.
const IKON_PERAN = { Mahasiswa: IconBook, Dosen: IconPencil, Kemahasiswaan: IconBuilding, 'Super Admin': IconCheckShield }

const RINGKAS_PERAN = {
  Mahasiswa: 'Melihat capaiannya sendiri dan mengajukan koreksi bila nilainya keliru.',
  Dosen: 'Mengusulkan nilai mahasiswa di kelasnya sampai program angkatannya selesai.',
  Kemahasiswaan: 'Mengelola nilai, angkatan, kurikulum, dan sertifikat sehari-hari.',
  'Super Admin': 'Wewenang tertinggi: menyetujui permintaan admin, mengatur penilaian dan akses, dan mengawasi seluruh jejak.',
}

// ya: boleh langsung · syarat: boleh, kecuali yang ditulis di catatan · minta: selalu lewat persetujuan Super Admin.
const LEWAT_S3 = 'kecuali mahasiswa yang sudah lewat Semester 3: perlu persetujuan'
const MATRIKS = [
  { tindakan: 'Melihat capaian mahasiswa', izin: [['syarat', 'hanya miliknya'], ['syarat', 'mahasiswa di kelasnya'], ['ya'], ['ya']] },
  { tindakan: 'Mengajukan koreksi nilai', izin: [['ya'], ['tidak'], ['tidak'], ['tidak']] },
  { tindakan: 'Mengusulkan nilai', izin: [['tidak'], ['syarat', 'sampai program angkatan selesai'], ['tidak'], ['tidak']] },
  { tindakan: 'Menyetujui usulan nilai dosen', izin: [['tidak'], ['tidak'], ['syarat', LEWAT_S3], ['ya']] },
  { tindakan: 'Menyimpan dan mengimpor nilai', izin: [['tidak'], ['tidak'], ['syarat', LEWAT_S3], ['ya']] },
  { tindakan: 'Membatalkan batch nilai', izin: [['tidak'], ['tidak'], ['syarat', LEWAT_S3], ['ya']] },
  { tindakan: 'Mengubah tanda final/sementara', izin: [['tidak'], ['tidak'], ['syarat', LEWAT_S3], ['ya']] },
  { tindakan: 'Mengubah bobot kurikulum', izin: [['tidak'], ['tidak'], ['syarat', 'perlu persetujuan bila nilai mahasiswa yang sudah lewat Semester 3 ikut berubah'], ['ya']] },
  { tindakan: 'Mengubah penilaian aspek', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { tindakan: 'Mengunci angkatan', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { tindakan: 'Memutuskan permintaan admin', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  { tindakan: 'Menarik permintaan yang belum diputuskan', izin: [['tidak'], ['tidak'], ['syarat', 'hanya miliknya'], ['tidak']] },
  { tindakan: 'Membaca Log Aktivitas', izin: [['tidak'], ['tidak'], ['ya'], ['ya']] },
  // /api/periode, hanya super admin (src/server/periode.js).
  { tindakan: 'Memindahkan periode akademik', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/akses/ubah, hanya super admin; akun Super Admin dan akun sendiri ditolak (src/server/akses.js).
  { tindakan: 'Mencabut dan memulihkan akses mahasiswa, dosen, dan admin', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // Peran SUPER_ADMIN hanya dipasang langsung di basis data; tidak ada tombolnya di website.
  { tindakan: 'Mengangkat Super Admin dari website', izin: [['tidak'], ['tidak'], ['tidak'], ['tidak']] },
]

const PRINSIP = [
  ['Wewenang secukupnya', 'Setiap peran hanya bisa melakukan yang dibutuhkan tugasnya.'],
  ['Yang meminta tidak menyetujui', 'Admin mengajukan, Super Admin memutuskan. Tidak ada yang menyetujui permintaannya sendiri.'],
  ['Dijaga di server', 'Setiap pintu API memeriksa ulang peran pengirimnya. Menyembunyikan tombol saja tidak cukup.'],
  ['Semua tercatat', 'Pengajuan, keputusan, dan penarikan masuk Log Aktivitas dan tidak bisa dihapus dari website.'],
]

/** Jumlah tindakan yang boleh dilakukan peran ke-`i` (langsung atau bersyarat) dan yang harus lewat persetujuan. */
function hitungIzin(i) {
  const jenis = MATRIKS.map((m) => m.izin[i][0])
  return {
    boleh: jenis.filter((j) => j === 'ya' || j === 'syarat').length,
    minta: jenis.filter((j) => j === 'minta').length,
  }
}

function Sel({ izin }) {
  const t = useTeks()
  const [jenis, catatan] = izin
  // Setiap keadaan punya ikon dan tulisannya sendiri, jadi tidak bergantung pada warna saja.
  if (jenis === 'tidak') {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] text-ink-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3 ring-1 ring-line">
          <IconMinus size={12} />
        </span>
        {t('Tidak')}
      </span>
    )
  }
  if (jenis === 'minta') {
    return (
      <span className="inline-flex items-start gap-2 text-[13px] font-semibold text-[var(--warning-ink)]">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--warning)_22%,transparent)]">
          <IconClock size={12} />
        </span>
        {t('Selalu perlu persetujuan')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-start gap-2 text-[13px] font-semibold text-ink">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--good)_16%,transparent)] text-[var(--good)]">
        <IconCheck size={12} strokeWidth={2.4} />
      </span>
      <span>
        {t('Ya')}
        {catatan ? <span className="block font-normal text-ink-2">{t(catatan)}</span> : null}
      </span>
    </span>
  )
}

export default function Wewenang() {
  const t = useTeks()
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Peran & Wewenang')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t('Siapa boleh melakukan apa di VIBE. Halaman ini hanya bacaan: peran diatur lewat basis data, bukan dari website.')}
        </p>
      </header>

      {/* Kartu Super Admin navy seperti di rantai pengawasan Pusat Kendali: peran pembaca halaman ini. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PERAN.map((p, i) => {
          const Ikon = IKON_PERAN[p]
          const anda = i === SUPER
          const { boleh, minta } = hitungIzin(i)
          return (
            <div
              key={p}
              className={
                'flex flex-col rounded-2xl p-5 sm:p-6 ' +
                (anda ? 'kartu-aurora relative text-white dark:ring-1 dark:ring-white/10' : 'card')
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' +
                    (anda ? 'bg-white/10 text-[var(--accent)]' : 'bg-brand-soft text-brand-ink')
                  }
                >
                  <Ikon size={18} />
                </span>
                <p className={'text-[15px] font-extrabold ' + (anda ? '' : 'text-ink')}>
                  {t(p)}
                  {anda ? (
                    <span className="ml-2 text-[11px] font-bold uppercase tracking-[.1em] text-[var(--accent)]">{t('Anda')}</span>
                  ) : null}
                </p>
              </div>
              <p className={'mt-3 text-[13px] leading-snug ' + (anda ? 'text-white/80' : 'text-ink-2')}>{t(RINGKAS_PERAN[p])}</p>
              <p className={'mt-auto pt-4 text-[12.5px] font-semibold ' + (anda ? 'text-white/85' : 'text-ink-2')}>
                {t('Boleh {n} dari {total} tindakan', { n: boleh, total: MATRIKS.length })}
                {minta ? (
                  <span className={'block font-normal ' + (anda ? 'text-white/75' : 'text-ink-2')}>
                    {t('{n} lainnya lewat persetujuan Super Admin', { n: minta })}
                  </span>
                ) : null}
              </p>
            </div>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          icon={IconCheckShield}
          title={t('Matriks wewenang')}
          subtitle={t('Mengikuti aturan yang dijaga server saat ini.')}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-[12px] font-bold uppercase tracking-[.06em] text-ink-2">
                <th className="px-5 py-3 sm:px-6">{t('Tindakan')}</th>
                {PERAN.map((p, i) => (
                  <th key={p} className={'px-3 py-3 ' + (i === SUPER ? 'bg-brand-soft text-brand-ink' : '')}>
                    {t(p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIKS.map((m) => (
                <tr key={m.tindakan} className="border-b border-line align-top last:border-b-0">
                  <th scope="row" className="px-5 py-3 text-[13.5px] font-semibold text-ink sm:px-6">
                    {t(m.tindakan)}
                  </th>
                  {/* Kolom Super Admin diberi latar merek tipis: itu kolom pembaca halaman ini. */}
                  {m.izin.map((izin, i) => (
                    <td
                      key={PERAN[i]}
                      className={'px-3 py-3 ' + (i === SUPER ? 'bg-[color-mix(in_srgb,var(--brand-soft)_60%,transparent)]' : '')}
                    >
                      <Sel izin={izin} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="card-pad">
        <h2 className="text-[15px] font-bold text-ink">{t('Prinsip yang dipakai')}</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {PRINSIP.map(([judul, isi]) => (
            <li key={judul}>
              <p className="text-[14px] font-bold text-ink">{t(judul)}</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{t(isi)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
