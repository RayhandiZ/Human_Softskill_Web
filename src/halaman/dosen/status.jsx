import { StatusTeks } from '../../components/Ui'
import { useTeks } from '../../lib/bahasa'

// Rupa keempat status pengumpulan, dipakai tiga halaman. Teks saja seperti panel mahasiswa:
// yang menunggu tindakan dosen ditebalkan, sisanya biasa. Tanpa warna, ikon, atau kapsul.

export const RUPA_STATUS = {
  masuk: {
    label: 'Belum dinilai',
    perluTindakan: true,
    rinci: 'Berkasnya sudah masuk, menunggu Anda menilai.',
  },
  menunggu: {
    label: 'Menunggu persetujuan',
    rinci: 'Sudah Anda usulkan; Kemahasiswaan belum memutuskan.',
  },
  dinilai: {
    label: 'Tercatat',
    rinci: 'Disetujui dan sudah masuk transkrip mahasiswa.',
  },
  ditolak: {
    label: 'Ditolak',
    perluTindakan: true,
    rinci: 'Usulan terakhirnya ditolak. Perlu diusulkan ulang.',
  },
}

export function LencanaStatus({ id }) {
  const t = useTeks()
  const r = RUPA_STATUS[id] ?? RUPA_STATUS.masuk
  return (
<StatusTeks kuat={Boolean(r.perluTindakan)}>{t(r.label)}</StatusTeks>
  )
}

export const URUTAN_STATUS = ['masuk', 'menunggu', 'ditolak', 'dinilai']
