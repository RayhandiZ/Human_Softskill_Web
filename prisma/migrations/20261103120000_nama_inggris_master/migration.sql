-- Padanan Inggris nama fakultas, program studi, dan angkatan yang diketik dari layar. Kosong berarti memakai kamus
-- src/lib/teks.js; lihat src/lib/kamusData.js.

-- AlterTable
ALTER TABLE `Fakultas` ADD COLUMN `namaEn` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ProgramStudi` ADD COLUMN `namaEn` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Angkatan` ADD COLUMN `labelEn` VARCHAR(191) NULL;
