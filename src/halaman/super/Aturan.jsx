import Link from 'next/link'
import { Badge, Card, CatatanKaki } from '../../components/Ui'
import { IconChevronRight } from '../../components/Icons'
import { CONFIG, DARI_BASIS_DATA, KUNCI_DAPAT_DIUBAH, MENUNGGU_KONFIRMASI, nilaiBawaan } from '../../lib/config'
import { useStore } from '../../lib/store'
import { useTeks } from '../../lib/bahasa'

/* Aturan perhitungan yang sedang berlaku: CONFIG, yaitu bawaan kode yang bisa ditimpa tabel Konfigurasi.
   Hanya bacaan. Lihat README.md › Panel Super Admin. */

const NAMA_SUMBER = { PDP: 'PDP', MK: 'MK Humaniora', ENGAGEMENT: 'Kemahasiswaan' }
const NAMA_JENIS = { TUGAS: 'Tugas', SIKAP: 'Sikap', UTS: 'UTS', UAS: 'UAS' }
const NAMA_AGREGASI = { 'per-aspek': 'Per aspek', 'per-semester': 'Per semester' }
const daftar = (isi, nama = (k) => k) =>
  Object.entries(isi ?? {})
    .map(([k, v]) => nama(k) + ' ' + v)
    .join(' · ')

const ATURAN = {
  ASPEK_A3_SEMESTER: { label: 'Semester aspek A.3', tampil: (v, t) => t('Semester {n}', { n: v }) },
  ASPEK_C1_SEMESTER: { label: 'Semester aspek C.1', tampil: (v, t) => t('Semester {n}', { n: v }) },
  MODE_BOBOT_KOMPONEN: {
    label: 'Pembagian bobot komponen',
    tampil: (v, t) => t(v === 'merata' ? 'Dibagi rata ke semua komponen' : 'Per sumber penilaian'),
  },
  BOBOT_SUMBER: {
    label: 'Bobot per sumber',
    catatan: 'Dipakai bila pembagian bobotnya per sumber.',
    tampil: (v, t) => daftar(v, (k) => t(NAMA_SUMBER[k] ?? k)),
  },
  BOBOT_KOMPONEN_MK: {
    label: 'Bobot komponen MK Humaniora',
    catatan: 'Dipakai bila pembagian bobotnya per sumber.',
    tampil: (v, t) => daftar(v, (k) => t(NAMA_JENIS[k] ?? k)),
  },
  BOBOT_ASPEK: {
    label: 'Bobot antaraspek',
    tampil: (v, t) => t(v === 'merata' ? 'Sama untuk semua aspek' : 'Kustom per aspek'),
  },
  BOBOT_ASPEK_KUSTOM: {
    label: 'Bobot aspek kustom',
    catatan: 'Dipakai bila bobot antaraspeknya kustom.',
    tampil: (v) => daftar(v),
  },
  MODE_AGREGASI: { label: 'Cara menggabungkan nilai', tampil: (v, t) => t(NAMA_AGREGASI[v] ?? String(v)) },
  AMBANG_SERTIFIKAT: { label: 'Nilai minimum sertifikat', tampil: (v) => String(v) },
  PENGUNCIAN_ASPEK: {
    label: 'Kapan aspek menjadi final',
    tampil: (v, t) =>
      t(
        { otomatis: 'Otomatis saat komponennya lengkap', manual: 'Ditandai manual oleh admin', semester: 'Saat semester ditutup' }[v] ??
          String(v),
      ),
  },
  IZINKAN_FINAL_DRAFT: { label: 'Aspek berkomponen draft boleh final', tampil: (v, t) => t(v ? 'Ya' : 'Tidak') },
}

export default function Aturan() {
  useStore()
  const t = useTeks()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{t('Aturan Sistem')}</h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          {t(
            'Aturan perhitungan yang sedang berlaku. Halaman ini hanya bacaan: aturan diubah lewat tabel Konfigurasi di basis data, sedangkan bobot dan penilaian aspek lewat halaman Kurikulum CPMK.',
          )}
        </p>
        <Link
          href="/admin/kurikulum"
          className="mt-3 inline-flex items-center gap-1 text-[14px] font-bold text-brand-ink hover:underline"
        >
          {t('Buka Kurikulum CPMK')}
          <IconChevronRight size={16} />
        </Link>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-line text-[12px] font-bold uppercase tracking-[.06em] text-ink-3">
                <th className="px-5 py-3 sm:px-6">{t('Aturan')}</th>
                <th className="px-3 py-3">{t('Yang berlaku')}</th>
                <th className="px-3 py-3">{t('Sumber')}</th>
                <th className="px-5 py-3 sm:px-6">{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {KUNCI_DAPAT_DIUBAH.map((k) => {
                const a = ATURAN[k] ?? { label: k, tampil: (v) => JSON.stringify(v) }
                const dariBasisData = DARI_BASIS_DATA.has(k)
                const beda = JSON.stringify(CONFIG[k]) !== JSON.stringify(nilaiBawaan(k))
                return (
                  <tr key={k} className="border-b border-line align-top">
                    <th scope="row" className="px-5 py-3 sm:px-6">
                      <span className="block text-[13.5px] font-semibold text-ink">{t(a.label)}</span>
                      {a.catatan ? <span className="mt-0.5 block text-[12.5px] font-normal text-ink-3">{t(a.catatan)}</span> : null}
                    </th>
                    <td className="px-3 py-3 text-[13.5px] font-semibold text-ink">{a.tampil(CONFIG[k], t)}</td>
                    <td className="px-3 py-3 text-[13px] text-ink-2">
                      {t(dariBasisData ? 'Basis data' : 'Bawaan kode')}
                      {dariBasisData && beda ? (
                        <span className="mt-0.5 block text-[12px] text-ink-3">
                          {t('bawaan: {nilai}', { nilai: a.tampil(nilaiBawaan(k), t) })}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 sm:px-6">
                      {MENUNGGU_KONFIRMASI.includes(k) ? (
                        <Badge tone="warning">{t('Menunggu konfirmasi')}</Badge>
                      ) : (
                        <Badge tone="neutral">{t('Ditetapkan')}</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr className="align-top">
                <th scope="row" className="px-5 py-3 sm:px-6">
                  <span className="block text-[13.5px] font-semibold text-ink">{t('Lama program')}</span>
                  <span className="mt-0.5 block text-[12.5px] font-normal text-ink-3">
                    {t('Struktur program, tidak bisa ditimpa dari basis data.')}
                  </span>
                </th>
                <td className="px-3 py-3 text-[13.5px] font-semibold text-ink">
                  {t('{n} semester', { n: CONFIG.TOTAL_SEMESTER_PROGRAM })}
                </td>
                <td className="px-3 py-3 text-[13px] text-ink-2">{t('Bawaan kode')}</td>
                <td className="px-5 py-3 sm:px-6">
                  <Badge tone="neutral">{t('Ditetapkan')}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <CatatanKaki>
        {t('Menunggu konfirmasi: angka usulan tim yang belum dikonfirmasi unit pengelola, jadi masih bisa berubah.')}
      </CatatanKaki>
    </div>
  )
}
