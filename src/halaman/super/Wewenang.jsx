import { Card, CardHeader } from '../../components/Ui'
import { IconCheck, IconCheckShield, IconClock, IconMinus } from '../../components/Icons'
import { useTeks } from '../../lib/bahasa'

/* Matriks wewenang tiap peran, diturunkan dari aturan server (src/server/persetujuan.js, tangani() di api.js).
   Hanya bacaan: peran diubah lewat basis data. Lihat README.md › Panel Super Admin. */

const PERAN = ['Mahasiswa', 'Dosen', 'Kemahasiswaan', 'Super Admin']

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
  // Menunggu /api/akses/ubah di back-end, yang wajib menolak semua kecuali super admin.
  { tindakan: 'Mencabut dan memulihkan akses dosen dan admin', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // Peran SUPER_ADMIN hanya dipasang langsung di basis data; tidak ada tombolnya di website.
  { tindakan: 'Mengangkat Super Admin dari website', izin: [['tidak'], ['tidak'], ['tidak'], ['tidak']] },
]

const PRINSIP = [
  ['Wewenang secukupnya', 'Setiap peran hanya bisa melakukan yang dibutuhkan tugasnya.'],
  ['Yang meminta tidak menyetujui', 'Admin mengajukan, Super Admin memutuskan. Tidak ada yang menyetujui permintaannya sendiri.'],
  ['Dijaga di server', 'Setiap pintu API memeriksa ulang peran pengirimnya. Menyembunyikan tombol saja tidak cukup.'],
  ['Semua tercatat', 'Pengajuan, keputusan, dan penarikan masuk Log Aktivitas dan tidak bisa dihapus dari website.'],
]

function Sel({ izin }) {
  const t = useTeks()
  const [jenis, catatan] = izin
  if (jenis === 'tidak') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
        <IconMinus size={14} className="shrink-0" />
        {t('Tidak')}
      </span>
    )
  }
  if (jenis === 'minta') {
    return (
      <span className="inline-flex items-start gap-1.5 text-[13px] font-semibold text-[var(--warning-ink)]">
        <IconClock size={14} className="mt-0.5 shrink-0" />
        {t('Selalu perlu persetujuan')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-start gap-1.5 text-[13px] font-semibold text-ink">
      <IconCheck size={14} className="mt-0.5 shrink-0 text-[var(--good)]" />
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
          {t('Siapa boleh melakukan apa di Human Skill. Halaman ini hanya bacaan: peran diatur lewat basis data, bukan dari website.')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PERAN.map((p) => (
          <div key={p} className={'card card-pad ' + (p === 'Super Admin' ? 'ring-2 ring-[var(--accent)]' : '')}>
            <p className="text-[15px] font-extrabold text-ink">{t(p)}</p>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{t(RINGKAS_PERAN[p])}</p>
          </div>
        ))}
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
              <tr className="border-b border-line text-[12px] font-bold uppercase tracking-[.06em] text-ink-3">
                <th className="px-5 py-3 sm:px-6">{t('Tindakan')}</th>
                {PERAN.map((p) => (
                  <th key={p} className="px-3 py-3">
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
                  {m.izin.map((izin, i) => (
                    <td key={PERAN[i]} className="px-3 py-3">
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
