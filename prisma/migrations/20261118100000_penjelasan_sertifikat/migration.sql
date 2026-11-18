-- Penjelasan pengajuan peninjauan cetak sertifikat (18 Nov 2026). Mahasiswa yang permintaannya ditolak atau aksesnya
-- dicabut mengajukan lagi dengan penjelasan wajib (minimal 10, maksimal 1000 karakter, diperiksa server) yang dibaca
-- admin dan super admin. Permintaan pertama dan permintaan lama tetap NULL; tidak ada data yang diubah.

-- AlterTable
ALTER TABLE `PermintaanSertifikat` ADD COLUMN `penjelasan` TEXT NULL;
