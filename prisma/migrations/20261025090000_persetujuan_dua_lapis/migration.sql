-- Persetujuan dua lapis (rapat 24 Okt 2026): pengajuan ubah nilai dan akses cetak sertifikat diputuskan admin
-- Kemahasiswaan lebih dulu, lalu super admin.
--
-- Status pengajuan koreksi pindah dari StatusPersetujuan (MENUNGGU/DISETUJUI/DITOLAK) ke StatusKoreksi. Enum MySQL
-- diubah dalam tiga langkah, bukan satu MODIFY: tanpa mode strict, MODIFY langsung mengubah 'MENUNGGU' yang tidak ada
-- di daftar baru menjadi string kosong, dan pengajuan yang masih menunggu hilang statusnya.

-- 1. Kolom lapis pertama dan hasil penerapan, serta enum gabungan lama dan baru.
ALTER TABLE `PengajuanKoreksi` ADD COLUMN `adminCatatan` TEXT NULL,
    ADD COLUMN `adminOleh` INTEGER NULL,
    ADD COLUMN `adminPada` DATETIME(3) NULL,
    ADD COLUMN `batchId` VARCHAR(191) NULL,
    ADD COLUMN `nilaiUsulan` DOUBLE NULL,
    MODIFY `status` ENUM('MENUNGGU', 'MENUNGGU_ADMIN', 'MENUNGGU_SUPERADMIN', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU_ADMIN';

-- 2. Pengajuan yang masih menunggu kini menunggu lapis pertama.
UPDATE `PengajuanKoreksi` SET `status` = 'MENUNGGU_ADMIN' WHERE `status` = 'MENUNGGU';

-- 3. Enum akhir, sama dengan StatusKoreksi di schema.prisma.
ALTER TABLE `PengajuanKoreksi` MODIFY `status` ENUM('MENUNGGU_ADMIN', 'MENUNGGU_SUPERADMIN', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU_ADMIN';

-- CreateTable
CREATE TABLE `PermintaanSertifikat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `status` ENUM('MENUNGGU_ADMIN', 'MENUNGGU_SUPERADMIN', 'SIAP_DICETAK', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU_ADMIN',
    `diajukan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminOleh` INTEGER NULL,
    `adminPada` DATETIME(3) NULL,
    `superOleh` INTEGER NULL,
    `superPada` DATETIME(3) NULL,
    `ditolakOleh` INTEGER NULL,
    `ditolakPada` DATETIME(3) NULL,
    `catatan` TEXT NULL,

    INDEX `PermintaanSertifikat_status_idx`(`status`),
    INDEX `PermintaanSertifikat_mahasiswaId_idx`(`mahasiswaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PermintaanSertifikat` ADD CONSTRAINT `PermintaanSertifikat_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
