import Link from 'next/link'
import { IconClock } from '../../components/Icons'
import { useAuth } from '../../lib/auth'
import { programSelesai } from '../../lib/data'
import { useTeks } from '../../lib/bahasa'

/* Bagian layar yang sama untuk setiap tindakan yang bisa menunggu persetujuan super admin;
   lihat src/server/persetujuan.js dan README.md › Persetujuan super admin. */

/** Admin biasa yang mengubah data angkatan ini (program sudah lewat Semester 3) harus menunggu super admin. */
export function usePerluPersetujuan(intake) {
  const { user } = useAuth()
  return Boolean(intake && user?.role === 'admin' && !user.superAdmin && programSelesai(intake))
}

/** Pemberitahuan sebelum menyimpan, supaya admin tahu perubahannya akan diantre. */
export function CatatanPersetujuan() {
  const t = useTeks()
  return (
    <p className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] px-3.5 py-3 text-[13px] leading-relaxed text-ink">
      <IconClock size={16} className="mt-px shrink-0" />
      {t('Angkatan ini sudah lewat Semester 3. Perubahan yang Anda simpan dikirim ke Super Admin sebagai permintaan dan baru berlaku setelah disetujui. Alasan wajib diisi.')}
    </p>
  )
}

/** Jawaban server { menunggu, permintaan }: datanya belum berubah, permintaannya sudah tercatat. */
export function PesanMenunggu({ hasil, keterangan = null }) {
  const t = useTeks()
  return (
    <div
      role="status"
      className="rounded-xl border border-line bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-4 py-3.5"
    >
      <p className="flex items-start gap-2 text-[13px] font-bold text-ink">
        <IconClock size={16} className="mt-px shrink-0" />
        {t('Permintaan {id} dikirim ke Super Admin.', { id: hasil?.permintaan?.id ?? '' })}
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
        {keterangan ??
          t('Perubahan ini menyentuh mahasiswa yang sudah lewat Semester 3, jadi baru berlaku setelah Super Admin menyetujuinya.')}{' '}
        <Link href="/admin/persetujuan" className="font-bold text-brand-ink hover:underline">
          {t('Lihat permintaan')}
        </Link>
      </p>
    </div>
  )
}
