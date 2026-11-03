-- Padanan Inggris isi kurikulum yang diketik dari layar (rapat 24 Okt 2026: nama tugas dan deskripsi CPMK ikut
-- diterjemahkan). Kosong berarti memakai kamus src/lib/teks.js; lihat src/lib/kamusData.js.

-- AlterTable
ALTER TABLE `Komponen` ADD COLUMN `labelEn` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Aspek` ADD COLUMN `namaEn` VARCHAR(191) NULL,
    ADD COLUMN `deskripsiEn` TEXT NULL,
    ADD COLUMN `pdpEn` VARCHAR(191) NULL,
    ADD COLUMN `mkEn` VARCHAR(191) NULL,
    ADD COLUMN `engagementEn` VARCHAR(191) NULL;
