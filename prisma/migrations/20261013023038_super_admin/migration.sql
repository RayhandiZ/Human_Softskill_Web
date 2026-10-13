-- Super admin (Tahap 1): tanda wewenang tertinggi pada akun admin, dan antrean permintaan admin
-- yang nanti disetujui super admin. Murni penambahan; tidak ada kolom atau tabel lama yang diubah.

-- AlterTable
ALTER TABLE `Pengguna` ADD COLUMN `superAdmin` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `PermintaanAdmin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aksi` VARCHAR(60) NOT NULL,
    `isi` JSON NOT NULL,
    `ringkasan` JSON NULL,
    `alasan` TEXT NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN', 'GAGAL') NOT NULL DEFAULT 'MENUNGGU',
    `diajukanOleh` INTEGER NOT NULL,
    `diajukanPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diputuskanOleh` INTEGER NULL,
    `diputuskanPada` DATETIME(3) NULL,
    `catatanKeputusan` TEXT NULL,
    `hasil` JSON NULL,

    INDEX `PermintaanAdmin_status_idx`(`status`),
    INDEX `PermintaanAdmin_diajukanPada_idx`(`diajukanPada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
