/* --------------------------------------------------------------------------
   Persetujuan dua lapis (rapat 24 Okt 2026): pengajuan ubah nilai dan akses cetak sertifikat diputuskan admin
   Kemahasiswaan lebih dulu (lapis 1), lalu super admin (lapis 2). Status dari server ditulis huruf kecil, sama
   dengan enum StatusKoreksi dan StatusSertifikat di prisma/schema.prisma. Label di sini kalimat kamus; layar
   menerjemahkannya lewat t().
   -------------------------------------------------------------------------- */

export const LABEL_KOREKSI = {
  menunggu_admin: 'Menunggu Admin',
  menunggu_superadmin: 'Menunggu Super Admin',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

export const LABEL_SERTIFIKAT = {
  menunggu_admin: 'Menunggu Admin',
  menunggu_superadmin: 'Menunggu Super Admin',
  siap_dicetak: 'Siap dicetak',
  ditolak: 'Ditolak',
  // Akses yang sudah disetujui lalu ditarik admin atau super admin; mahasiswa boleh meminta lagi.
  dicabut: 'Dicabut',
}

/** Urutan langkah akses cetak untuk penanda langkah di layar mahasiswa. */
export const LANGKAH_SERTIFIKAT = ['menunggu_admin', 'menunggu_superadmin', 'siap_dicetak']

export const masihMenunggu = (status) => status === 'menunggu_admin' || status === 'menunggu_superadmin'

/** Status yang menunggu keputusan akun ini: admin biasa lapis 1, super admin lapis 2. */
export const statusGiliran = (user) => (user?.superAdmin ? 'menunggu_superadmin' : 'menunggu_admin')

/** Pengajuan atau permintaan yang menunggu keputusan akun ini. */
export const giliranSaya = (daftar, user) => daftar.filter((x) => x.status === statusGiliran(user))

/**
 * Keadaan sertifikat seorang mahasiswa dari kelayakannya dan permintaan terbarunya: 'belum_layak' | 'bisa_diminta' |
 * 'menunggu_admin' | 'menunggu_superadmin' | 'siap_dicetak' | 'ditolak' | 'dicabut'. Kelayakan selalu didahulukan: akses yang
 * sudah disetujui tidak bisa dipakai mencetak bila nilainya berubah dan syaratnya tidak lagi terpenuhi.
 */
export function keadaanSertifikat(layak, permintaan) {
  if (!layak) return 'belum_layak'
  return permintaan?.status ?? 'bisa_diminta'
}
