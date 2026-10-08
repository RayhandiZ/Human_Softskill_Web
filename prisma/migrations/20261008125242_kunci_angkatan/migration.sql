-- AlterTable
ALTER TABLE `angkatan` ADD COLUMN `dikunciOleh` INTEGER NULL,
    ADD COLUMN `dikunciPada` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `LogAktivitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `aktorId` INTEGER NOT NULL,
    `aksi` VARCHAR(60) NOT NULL,
    `target` VARCHAR(120) NOT NULL,
    `rincian` JSON NULL,

    INDEX `LogAktivitas_waktu_idx`(`waktu`),
    INDEX `LogAktivitas_aksi_idx`(`aksi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
