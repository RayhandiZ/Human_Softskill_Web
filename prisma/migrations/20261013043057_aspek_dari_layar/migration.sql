-- Teks aspek CPMK (nama, deskripsi, PDP, MK, kegiatan) yang diubah super admin dari layar.
-- Murni penambahan; aspek tanpa baris di tabel ini tetap memakai teks di src/lib/curriculum.js.

-- CreateTable
CREATE TABLE `Aspek` (
    `id` VARCHAR(10) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `pdp` VARCHAR(191) NULL,
    `mk` VARCHAR(191) NULL,
    `engagement` VARCHAR(191) NULL,
    `diubahOleh` INTEGER NULL,
    `diubahPada` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
