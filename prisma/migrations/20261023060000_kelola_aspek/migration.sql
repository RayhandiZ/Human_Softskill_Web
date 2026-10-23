-- AlterTable
ALTER TABLE `angkatan` ADD COLUMN `aspekSaatKunci` JSON NULL;

-- AlterTable
ALTER TABLE `aspek` ADD COLUMN `aktif` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cluster` VARCHAR(10) NULL,
    ADD COLUMN `kode` VARCHAR(10) NULL,
    ADD COLUMN `semester` INTEGER NULL;

-- Angkatan yang sudah terkunci memakai sepuluh aspek yang berlaku saat migrasi ini dibuat.
UPDATE `angkatan` SET `aspekSaatKunci` = JSON_ARRAY('A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2') WHERE `status` = 'TERKUNCI';
