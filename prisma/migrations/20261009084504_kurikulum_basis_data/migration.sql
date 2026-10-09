-- AlterTable
ALTER TABLE `komponen` ADD COLUMN `aktif` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `bobot` DOUBLE NULL,
    ADD COLUMN `diubahOleh` INTEGER NULL,
    ADD COLUMN `diubahPada` DATETIME(3) NULL,
    ADD COLUMN `ranah` VARCHAR(10) NOT NULL DEFAULT 'kognitif',
    ADD COLUMN `urutan` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Indikator` (
    `id` VARCHAR(40) NOT NULL,
    `aspekId` VARCHAR(10) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `ranah` VARCHAR(10) NOT NULL,
    `sumber` JSON NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `diubahOleh` INTEGER NULL,
    `diubahPada` DATETIME(3) NULL,

    INDEX `Indikator_aspekId_idx`(`aspekId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
