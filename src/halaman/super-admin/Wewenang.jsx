import { Card, CardHeader, GulirTabel } from '../../components/Ui'
import {
  IconBook,
  IconBuilding,
  IconCheck,
  IconCheckShield,
  IconClock,
  IconMinus,
  IconUpload,
} from '../../components/Icons'
import { useTeks } from '../../lib/bahasa'

/* Matriks wewenang tiap peran, diturunkan dari aturan server (src/server/persetujuan.js, tangani() di api.js).
   Hanya bacaan: peran diubah lewat basis data. Lihat README.md › Panel Super Admin. */

const PERAN = ['Mahasiswa', 'Dosen', 'Kemahasiswaan', 'Super Admin']
const SUPER = PERAN.indexOf('Super Admin')

// Ikon per peran, menurut pekerjaan utamanya: melihat capaian, mengunggah nilai, mengelola, mengawasi.
const IKON_PERAN = { Mahasiswa: IconBook, Dosen: IconUpload, Kemahasiswaan: IconBuilding, 'Super Admin': IconCheckShield }

// Susunan sejak rapat 24 Okt 2026: dosen mengunggah nilai kelasnya, admin hanya membaca nilai dan data master, super
// admin memegang keduanya.
const RINGKAS_PERAN = {
  Mahasiswa: 'Melihat capaiannya sendiri, mengajukan koreksi bila nilainya keliru, dan meminta akses cetak sertifikat.',
  Dosen: 'Mengunggah nilai angkatan yang diampunya lewat Excel dan memantau hasilnya; perbaikan untuk angkatan yang sudah disahkan diajukan ke Super Admin.',
  Kemahasiswaan:
    'Membaca nilai dan memantau kelengkapannya, memutuskan lapis pertama pengajuan koreksi dan akses cetak sertifikat, serta mengurus angkatan dan kurikulum.',
  'Super Admin':
    'Wewenang tertinggi: memegang nilai dan data master, memutuskan lapis kedua koreksi dan akses cetak sertifikat, menyetujui permintaan admin, mengatur penilaian dan akses, dan mengawasi seluruh jejak.',
}

// ya: boleh langsung · syarat: boleh, kecuali yang ditulis di catatan · minta: selalu lewat persetujuan Super Admin.
const MATRIKS = [
  // Admin biasa: angkatan Semester 1–3 kecuali dinonaktifkan, dan angkatan lewat Semester 3 yang dibuka Super Admin
  // (angkatanTersembunyi di src/server/muat.js).
  {
    tindakan: 'Melihat capaian mahasiswa',
    izin: [
      ['syarat', 'hanya miliknya'],
      ['syarat', 'mahasiswa di kelasnya'],
      ['syarat', 'angkatan Semester 1–3 kecuali dinonaktifkan Super Admin; angkatan yang sudah lewat bila dibuka Super Admin'],
      ['ya'],
    ],
  },
  { tindakan: 'Mengajukan koreksi nilai', izin: [['ya'], ['tidak'], ['tidak'], ['tidak']] },
  // Dua lapis sejak rapat 24 Okt 2026 (putuskanKoreksi di src/server/pengajuan.js).
  {
    tindakan: 'Memutuskan pengajuan koreksi nilai',
    izin: [['tidak'], ['tidak'], ['syarat', 'lapis pertama: meneruskan atau menolak'], ['syarat', 'lapis kedua: menyetujui dan menerapkan nilai, atau menolak']],
  },
  // /api/sertifikat dan /api/sertifikat/keputusan (src/server/sertifikat.js).
  { tindakan: 'Meminta akses cetak sertifikat', izin: [['syarat', 'bila seluruh syarat terpenuhi'], ['tidak'], ['tidak'], ['tidak']] },
  {
    tindakan: 'Menyetujui akses cetak sertifikat',
    izin: [['tidak'], ['tidak'], ['syarat', 'lapis pertama'], ['syarat', 'lapis kedua, sesudah admin']],
  },
  // /api/sertifikat/cabut: akses yang sudah Siap dicetak, satu orang cukup; mahasiswa boleh meminta lagi lewat dua lapis.
  {
    tindakan: 'Mencabut akses cetak sertifikat',
    izin: [['tidak'], ['tidak'], ['syarat', 'langsung, wajib beralasan'], ['syarat', 'langsung, wajib beralasan']],
  },
  { tindakan: 'Mencetak sertifikat', izin: [['syarat', 'sesudah akses cetaknya disetujui'], ['tidak'], ['syarat', 'sesudah akses cetaknya disetujui'], ['syarat', 'sesudah akses cetaknya disetujui']] },
  // /api/nilai/dosen (unggahNilaiDosen di src/server/pengajuan.js); kelasnya angkatan yang diampu (/api/akses/kelas).
  {
    tindakan: 'Mengunggah nilai kelasnya dari Excel',
    izin: [['tidak'], ['syarat', 'langsung tersimpan untuk angkatan berjalan'], ['tidak'], ['tidak']],
  },
  {
    tindakan: 'Memperbaiki nilai angkatan yang sudah disahkan atau selesai, atau aspek final',
    izin: [['tidak'], ['minta'], ['tidak'], ['ya']],
  },
  { tindakan: 'Mengatur kelas dosen dan angkatan yang diampu', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // Usulan dari sebelum unggahan langsung yang masih menunggu.
  { tindakan: 'Memutuskan usulan nilai dosen yang tersisa', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/nilai dan /api/nilai/rollback, penjaga ['superadmin']: admin hanya membaca nilai.
  { tindakan: 'Menyimpan dan mengimpor nilai', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  { tindakan: 'Membatalkan batch nilai, termasuk unggahan dosen', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  { tindakan: 'Mengubah tanda final/sementara', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { tindakan: 'Mengubah bobot kurikulum', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { tindakan: 'Mengubah penilaian aspek', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { tindakan: 'Mengesahkan nilai angkatan', izin: [['tidak'], ['tidak'], ['minta'], ['ya']] },
  { tindakan: 'Memutuskan permintaan admin', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  { tindakan: 'Menarik permintaan yang belum diputuskan', izin: [['tidak'], ['tidak'], ['syarat', 'hanya miliknya'], ['tidak']] },
  // /api/log (bacaLog di src/server/log.js): admin biasa tanpa tindakan Super Admin; yang berkaitan dengan akunnya
  // sampai lewat lonceng (src/server/notifikasi.js).
  {
    tindakan: 'Membaca Log Aktivitas',
    izin: [['tidak'], ['tidak'], ['syarat', 'tanpa tindakan Super Admin'], ['ya']],
  },
  // /api/periode, hanya super admin (src/server/periode.js).
  { tindakan: 'Memindahkan periode akademik', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/akses/ubah, hanya super admin; akun Super Admin dan akun sendiri ditolak (src/server/akses.js).
  { tindakan: 'Mencabut dan memulihkan akses mahasiswa, dosen, dan admin', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/master/*, penjaga ['superadmin'] (src/server/dataMaster.js).
  { tindakan: 'Menambah dan mengubah angkatan, fakultas, prodi, dan data mahasiswa', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // Halaman Data Master tanpa tombol ubah; izinnya dari Akses Pengguna atau permintaan AKSES_DATA_MASTER.
  {
    tindakan: 'Melihat halaman Data Master',
    izin: [['tidak'], ['tidak'], ['syarat', 'bila diberi izin atau permintaannya disetujui Super Admin'], ['ya']],
  },
  // /api/akses/izin, hanya super admin, dan hanya untuk akun admin (aturIzinMaster di src/server/akses.js).
  { tindakan: 'Memberi dan mencabut izin lihat data master', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
  // /api/akses/angkatan, hanya super admin, dan hanya untuk akun admin (aturAksesAngkatan di src/server/akses.js).
  { tindakan: 'Mengatur angkatan yang terlihat oleh admin (membuka atau menonaktifkan)', izin: [['tidak'], ['tidak'], ['tidak'], ['ya']] },
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
        <GulirTabel>
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
        </GulirTabel>
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
