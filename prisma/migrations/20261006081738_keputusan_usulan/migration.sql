-- AlterTable
ALTER TABLE `usulan` ADD COLUMN `catatanKeputusan` TEXT NULL,
    ADD COLUMN `diputuskanOleh` INTEGER NULL,
    ADD COLUMN `diputuskanPada` DATETIME(3) NULL,
    ADD COLUMN `ditolakSistem` JSON NULL;
