import { useState } from 'react'
import { Badge, EmptyState } from '../../components/Ui'
import { IconAlert, IconCheck, IconClock, IconX } from '../../components/Icons'
import { getAspek } from '../../lib/curriculum'
import { PENGAJUAN_KOREKSI, getStudentByNim } from '../../lib/data'
import { putuskanKoreksi, useStore } from '../../lib/store'
import { LABEL_KOREKSI, masihMenunggu, statusGiliran } from '../../lib/duaLapis'
import { bacaAngka } from '../../lib/ingest'
import { useAuth } from '../../lib/auth'
import { useTeks } from '../../lib/bahasa'
import { daftarKode } from './LoncengKemahasiswaan'

/* Pengajuan ubah nilai dari mahasiswa, dua lapis (rapat 24 Okt 2026): admin Kemahasiswaan meneruskan ke super admin
   beserta nilai usulannya atau menolak; super admin menyetujui, dan nilainya langsung diterapkan sebagai satu batch,
   atau menolak. Tiap akun hanya memutuskan lapisnya sendiri; lapis lain tampil sebagai keterangan. Dipakai tab
   Pengajuan koreksi di Input Nilai dan halaman Persetujuan super admin (`hanyaGiliran`). Server memeriksa ulang
   semuanya; lihat putuskanKoreksi di src/server/pengajuan.js. */

const NADA = { menunggu_admin: 'warning', menunggu_superadmin: 'warning', disetujui: 'good', ditolak: 'critical' }
const IKON = { menunggu_admin: IconClock, menunggu_superadmin: IconClock, disetujui: IconCheck, ditolak: IconX }

export default function DaftarKoreksi({ aktor, hanyaGiliran = false }) {
  const t = useTeks()
  useStore()
  const { user } = useAuth()
  const giliran = statusGiliran(user)

  // Yang menunggu akun ini di atas, lalu yang menunggu lapis lain, lalu yang sudah diputuskan.
  const peringkat = (k) => (k.status === giliran ? 0 : masihMenunggu(k.status) ? 1 : 2)
  const daftar = PENGAJUAN_KOREKSI.filter((k) => !hanyaGiliran || k.status === giliran).sort(
    (a, b) => peringkat(a) - peringkat(b),
  )

  if (!daftar.length) {
    return (
      <EmptyState
        title={t(hanyaGiliran ? 'Tidak ada pengajuan ubah nilai yang menunggu Anda' : 'Belum ada pengajuan koreksi dari mahasiswa.')}
      />
    )
  }

  return (
    <ul className="divide-y divide-line">
      {/* Status ikut di kunci: isian nilai dibaca sekali saat kartu dipasang, jadi kartu yang sudah terbuka saat
          admin meneruskan harus dipasang ulang supaya nilai usulannya terisi untuk super admin. */}
      {daftar.map((k) => (
        <KartuKoreksi
          key={k.id + ':' + k.status}
          k={k}
          aktor={aktor}
          superAdmin={Boolean(user?.superAdmin)}
          giliranSaya={k.status === giliran}
        />
      ))}
    </ul>
  )
}

function KartuKoreksi({ k, aktor, superAdmin, giliranSaya }) {
  const t = useTeks()
  const usulanAwal = superAdmin ? k.nilaiUsulan : k.nilaiDiharapkan
  const [nilai, setNilai] = useState(usulanAwal == null ? '' : String(usulanAwal).replace('.', ','))
  const [catatan, setCatatan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const sekarang = getStudentByNim(k.nim)?.nilai?.[k.aspekId]?.komponen?.[k.komponenId]?.nilai ?? null
  const idNilai = 'nilai-' + k.id
  const idCatatan = 'catatan-' + k.id

  async function putuskan(keputusan) {
    setGalat('')
    const angka = bacaAngka(nilai)
    if (keputusan === 'disetujui' && (angka == null || angka < 0 || angka > 100)) {
      setGalat(t('Isi nilai baru 0 sampai 100 sebelum menyetujui.'))
      return
    }
    if (keputusan === 'ditolak' && catatan.trim().length < 10) {
      setGalat(t('Alasan penolakan wajib diisi, minimal 10 karakter, supaya mahasiswa tahu sebabnya.'))
      return
    }
    setSibuk(true)
    try {
      const ok = await putuskanKoreksi(k.id, keputusan, { aktor, catatan: catatan.trim(), nilaiBaru: angka, superAdmin })
      if (!ok) setGalat(t('Pengajuan ini sudah diputuskan, mungkin di jendela lain.'))
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[240px] flex-1">
          <p className="text-[14px] font-bold text-ink">{k.komponenLabel}</p>
          <p className="mt-1 text-[12.5px] text-ink-2">
            {k.nama} · {k.nim} · {t('aspek {kode}', { kode: daftarKode([getAspek(k.aspekId) ?? k.aspekId]) })} ·{' '}
            {t('diajukan {tanggal}', { tanggal: k.diajukan })}
          </p>
          <p className="mt-2 max-w-2xl rounded-lg bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
            “{k.alasan}”
            <span className="mt-1 block text-[12.5px] font-semibold text-ink-2">
              {t('Nilai sekarang')}: {sekarang ?? t('belum ada')}
              {k.nilaiDiharapkan != null ? ' · ' + t('Nilai yang diharapkan') + ': ' + k.nilaiDiharapkan : ''}
            </span>
          </p>
        </div>
        <Badge tone={NADA[k.status] ?? 'neutral'} icon={IKON[k.status] ?? IconAlert}>
          {t(LABEL_KOREKSI[k.status] ?? k.status)}
        </Badge>
      </div>

      {k.lapis1 ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
          {t('Diteruskan {oleh} pada {tanggal} dengan nilai usulan {nilai}.', {
            oleh: k.lapis1.oleh ?? '',
            tanggal: k.lapis1.tanggal,
            nilai: k.nilaiUsulan,
          })}
          {k.lapis1.catatan ? ' ' + k.lapis1.catatan : ''}
        </p>
      ) : null}

      {giliranSaya ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2.5">
            <label htmlFor={idNilai} className="w-[150px]">
              <span className="mb-1.5 block label">{t(superAdmin ? 'Nilai baru' : 'Nilai usulan')}</span>
              <input
                id={idNilai}
                className="field !py-2.5 tabular-nums"
                inputMode="decimal"
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                placeholder="0–100"
              />
            </label>
            <label htmlFor={idCatatan} className="min-w-[240px] flex-1">
              <span className="mb-1.5 block label">{t('Catatan (wajib bila menolak)')}</span>
              <input
                id={idCatatan}
                className="field !py-2.5"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder={t(superAdmin ? 'Alasan menyetujui atau menolak…' : 'Alasan meneruskan atau menolak…')}
              />
            </label>
          </div>
          {galat ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--critical)_10%,transparent)] px-3.5 py-3 text-[13px] font-semibold text-[color:var(--teks-kritis,var(--critical))]"
            >
              <IconAlert size={16} className="mt-px shrink-0" />
              {galat}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className="btn-primary min-h-[44px]" disabled={sibuk} onClick={() => putuskan('disetujui')}>
              <IconCheck size={16} />
              {t(superAdmin ? 'Setujui dan terapkan nilai' : 'Teruskan ke Super Admin')}
            </button>
            <button
              type="button"
              disabled={sibuk}
              onClick={() => putuskan('ditolak')}
              className="btn-ghost min-h-[44px] hover:border-[var(--critical)] hover:text-[color:var(--teks-kritis,var(--critical))]"
            >
              <IconX size={15} />
              {t('Tolak')}
            </button>
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            {t(
              superAdmin
                ? 'Setelah disetujui, nilai baru langsung masuk transkrip sebagai satu batch yang tercatat di Riwayat Batch.'
                : 'Meneruskan belum mengubah nilai. Super Admin yang memutuskan dan menerapkan nilai barunya.',
            )}
          </p>
        </div>
      ) : masihMenunggu(k.status) ? (
        <p className="mt-2 text-[12.5px] text-ink-2">
          {k.status === 'menunggu_admin'
            ? t('Menunggu keputusan admin Kemahasiswaan (lapis pertama).')
            : t('Menunggu keputusan Super Admin.')}
        </p>
      ) : k.keputusan ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
          {k.status === 'disetujui'
            ? t('Disetujui {oleh} pada {tanggal}.', { oleh: k.keputusan.oleh ?? '', tanggal: k.keputusan.tanggal })
            : t('Ditolak {oleh} pada {tanggal}.', { oleh: k.keputusan.oleh ?? '', tanggal: k.keputusan.tanggal })}
          {k.status === 'disetujui' && k.nilaiUsulan != null ? ' ' + t('Nilai baru {nilai}.', { nilai: k.nilaiUsulan }) : ''}
          {k.keputusan.catatan ? ' ' + k.keputusan.catatan : ''}
        </p>
      ) : null}
    </li>
  )
}
