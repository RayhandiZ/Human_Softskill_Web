import { useState } from 'react'
import { Badge, Card, CatatanKaki, EmptyState, JudulHalaman, TabSaring } from '../../components/Ui'
import { IconAlert, IconCheck, IconInbox, IconUndo, IconX } from '../../components/Icons'
import { PERMINTAAN, batalkanPermintaan, putuskanPermintaan, useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'

/* Permintaan admin kepada super admin; lihat src/server/persetujuan.js dan README.md › Persetujuan super admin.
   Super admin melihat semua permintaan dan memutuskannya; admin biasa melihat miliknya dan bisa menariknya.
   Susunannya mengikuti halaman daftar lain: kepala halaman, lalu satu kartu dengan tab berjumlah. */

export const LABEL_AKSI = {
  SIMPAN_NILAI: 'Simpan nilai',
  ROLLBACK_NILAI: 'Batalkan batch nilai',
  UBAH_PENGUNCIAN: 'Ubah tanda final/sementara',
  PUTUSKAN_USULAN: 'Setujui usulan nilai dosen',
  KUNCI_ANGKATAN: 'Sahkan nilai angkatan',
  UBAH_BOBOT: 'Ubah bobot',
  UBAH_PENILAIAN: 'Ubah penilaian aspek',
  KELOLA_ASPEK: 'Kelola aspek CPMK',
}

const RUPA = {
  menunggu: { label: 'Menunggu', tone: 'warning' },
  disetujui: { label: 'Disetujui', tone: 'good' },
  ditolak: { label: 'Ditolak', tone: 'critical' },
  dibatalkan: { label: 'Ditarik', tone: 'neutral' },
  gagal: { label: 'Gagal dijalankan', tone: 'serious' },
}

export default function PersetujuanAdmin() {
  const t = useTeks()
  useStore()
  const { user } = useAuth()
  const superAdmin = Boolean(user?.superAdmin)
  const [tab, setTab] = useState('menunggu')

  const menunggu = PERMINTAAN.filter((p) => p.status === 'menunggu')
  const riwayat = PERMINTAAN.filter((p) => p.status !== 'menunggu')
  const daftar = tab === 'menunggu' ? menunggu : riwayat

  return (
    <div className="space-y-6">
      <JudulHalaman
        judul={t(superAdmin ? 'Persetujuan Admin' : 'Permintaan Saya')}
        keterangan={t(
          superAdmin
            ? 'Permintaan admin untuk mengubah data mahasiswa yang sudah lewat Semester 3. Setujui untuk menjalankannya persis seperti yang diajukan, atau tolak dengan catatan.'
            : 'Perubahan pada mahasiswa yang sudah lewat Semester 3 menunggu persetujuan Super Admin sebelum berlaku. Selama masih menunggu, permintaan bisa Anda tarik.',
        )}
      />

      <Card className="overflow-hidden">
        <TabSaring
          label={t(superAdmin ? 'Persetujuan Admin' : 'Permintaan Saya')}
          nilai={tab}
          onPilih={setTab}
          pilihan={[
            { nilai: 'menunggu', label: t('Menunggu'), n: menunggu.length },
            { nilai: 'riwayat', label: t('Riwayat'), n: riwayat.length },
          ]}
        />
        {daftar.length ? (
          <ul className="divide-y divide-line">
            {daftar.map((p) => (
              <BarisPermintaan key={p.id} p={p} superAdmin={superAdmin} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={t(tab === 'menunggu' ? 'Tidak ada permintaan yang menunggu' : 'Belum ada riwayat permintaan')}
          >
            {t(
              tab === 'menunggu'
                ? 'Permintaan baru muncul di sini begitu perubahan pada mahasiswa yang sudah lewat Semester 3 diajukan.'
                : 'Permintaan yang sudah diputuskan atau ditarik tercatat di sini.',
            )}
          </EmptyState>
        )}
      </Card>

      <CatatanKaki>
        {t('Permintaan yang disetujui dijalankan dengan isi yang sama seperti saat diajukan, atas nama admin pengaju, dan diperiksa ulang lebih dulu. Bila datanya sudah berubah, statusnya gagal dan perlu diajukan ulang. Setiap pengajuan dan keputusan tercatat di log aktivitas.')}
      </CatatanKaki>
    </div>
  )
}

function BarisPermintaan({ p, superAdmin }) {
  const t = useTeks()
  const [catatan, setCatatan] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const r = RUPA[p.status] ?? RUPA.menunggu
  const ringkas = p.ringkasan ?? {}
  const mahasiswa = ringkas.mahasiswa ?? []

  async function putuskan(keputusan) {
    setGalat('')
    if (keputusan === 'ditolak' && !catatan.trim()) {
      setGalat(t('Catatan penolakan wajib diisi. Admin perlu tahu alasannya.'))
      return
    }
    setSibuk(true)
    try {
      const hasil = await putuskanPermintaan(p.id, keputusan, catatan.trim())
      if (!hasil.ok && hasil.status !== 'gagal') setGalat(t('Permintaan ini sudah diputuskan sebelumnya.'))
      else setCatatan('')
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  async function tarik() {
    setGalat('')
    setSibuk(true)
    try {
      if (!(await batalkanPermintaan(p.id))) setGalat(t('Permintaan ini sudah diputuskan sebelumnya.'))
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <li className="space-y-3 px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <IconInbox size={18} />
        </span>
        <div className="min-w-[220px] flex-1">
          <p className="text-[14.5px] font-bold leading-snug text-ink">{ringkas.judul ?? '-'}</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
            <span className="font-mono">{p.id}</span> · {t(LABEL_AKSI[p.aksi] ?? p.aksi)} ·{' '}
            {t('Diajukan {oleh} pada {waktu}', { oleh: p.diajukanOleh ?? '-', waktu: p.diajukanPada ?? '-' })}
          </p>
        </div>
        <Badge tone={r.tone}>{t(r.label)}</Badge>
      </div>

      <div className="space-y-3 sm:pl-14">
        <p className="text-[13.5px] leading-relaxed text-ink">
          <span className="font-bold">{t('Alasan')}:</span> {p.alasan || '-'}
        </p>

        {ringkas.baris?.length ? (
          <ul className="space-y-0.5 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed tabular-nums text-ink-2">
            {ringkas.baris.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : null}

        {ringkas.jumlahMahasiswa ? (
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            {p.aksi === 'UBAH_PENILAIAN'
              ? t('{n} mahasiswa terdampak', { n: ringkas.jumlahMahasiswa })
              : t('{n} mahasiswa yang sudah lewat Semester 3 tersentuh', { n: ringkas.jumlahMahasiswa })}
            :{' '}
            {mahasiswa
              .slice(0, 8)
              .map((m) => m.nama + ' (' + m.angkatan + ')')
              .join(', ')}
            {ringkas.jumlahMahasiswa > 8 ? ', …' : ''}
          </p>
        ) : null}

        {p.status !== 'menunggu' ? (
          <div className="rounded-xl border border-line px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
            <p>
              {t(p.status === 'dibatalkan' ? 'Ditarik {oleh} pada {waktu}' : 'Diputuskan {oleh} pada {waktu}', {
                oleh: p.diputuskanOleh ?? '-',
                waktu: p.diputuskanPada ?? '-',
              })}
            </p>
            {p.catatanKeputusan ? (
              <p className="mt-0.5">
                <span className="font-bold text-ink">{t('Catatan')}:</span> {p.catatanKeputusan}
              </p>
            ) : null}
            {p.hasil?.batchId ? <p className="mt-0.5">{t('Tersimpan sebagai batch {id}.', { id: p.hasil.batchId })}</p> : null}
            {p.hasil?.galat ? (
              <p className="mt-0.5 font-semibold text-[color:var(--teks-kritis,var(--critical))]">{p.hasil.galat}</p>
            ) : null}
          </div>
        ) : null}

        {p.status === 'menunggu' && superAdmin ? (
          <div className="space-y-3">
            <label className="block max-w-xl">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink">{t('Catatan keputusan (wajib bila ditolak)')}</span>
              <input className="field !py-2.5" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" className="btn-primary" disabled={sibuk} onClick={() => putuskan('disetujui')}>
                <IconCheck size={16} />
                {t('Setujui dan jalankan')}
              </button>
              <button type="button" className="btn-ghost" disabled={sibuk} onClick={() => putuskan('ditolak')}>
                <IconX size={16} />
                {t('Tolak')}
              </button>
            </div>
          </div>
        ) : null}

        {p.status === 'menunggu' && !superAdmin && p.milikSaya ? (
          <button type="button" className="btn-ghost" disabled={sibuk} onClick={tarik}>
            <IconUndo size={16} />
            {t('Tarik permintaan')}
          </button>
        ) : null}

        {galat ? (
          <p
            role="alert"
            className="flex animate-rise items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]"
          >
            <IconAlert size={16} className="mt-px shrink-0" />
            {galat}
          </p>
        ) : null}
      </div>
    </li>
  )
}
