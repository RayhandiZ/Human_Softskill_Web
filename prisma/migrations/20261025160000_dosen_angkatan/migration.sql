-- Angkatan yang diampu seorang dosen, dipilih Super Admin. Kelas dosen = mahasiswa prodinya pada angkatan itu, termasuk
-- angkatan yang programnya sudah selesai; nilai untuk angkatan seperti itu diajukan ke Super Admin. Dosen tanpa baris
-- di tabel ini tetap memakai aturan lama: angkatan yang sedang di semesternya dan programnya belum selesai.

-- CreateTable
CREATE TABLE `DosenAngkatan` (
    `dosenId` INTEGER NOT NULL,
    `angkatanId` VARCHAR(191) NOT NULL,

    INDEX `DosenAngkatan_angkatanId_idx`(`angkatanId`),
    PRIMARY KEY (`dosenId`, `angkatanId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DosenAngkatan` ADD CONSTRAINT `DosenAngkatan_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DosenAngkatan` ADD CONSTRAINT `DosenAngkatan_angkatanId_fkey` FOREIGN KEY (`angkatanId`) REFERENCES `Angkatan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
