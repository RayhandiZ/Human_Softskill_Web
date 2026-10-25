-- Pencabutan akses cetak sertifikat dan catatan cetak. Admin atau super admin bisa mencabut akses yang sudah
-- SIAP_DICETAK, misalnya karena ada laporan sikap sesudah disetujui; mahasiswa lalu boleh meminta lagi lewat dua lapis.
-- Setiap kali sertifikat dibuka untuk dicetak dihitung, supaya admin tahu apakah sudah sempat tercetak sebelum dicabut.
-- Enum hanya bertambah satu nilai di ujung, jadi baris yang sudah ada tidak berubah.

-- AlterTable
ALTER TABLE `PermintaanSertifikat` ADD COLUMN `alasanCabut` TEXT NULL,
    ADD COLUMN `cetakTerakhir` DATETIME(3) NULL,
    ADD COLUMN `cetakTerakhirOleh` INTEGER NULL,
    ADD COLUMN `dicabutOleh` INTEGER NULL,
    ADD COLUMN `dicabutPada` DATETIME(3) NULL,
    ADD COLUMN `jumlahCetak` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('MENUNGGU_ADMIN', 'MENUNGGU_SUPERADMIN', 'SIAP_DICETAK', 'DITOLAK', 'DICABUT') NOT NULL DEFAULT 'MENUNGGU_ADMIN';
