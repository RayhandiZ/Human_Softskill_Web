-- Akses angkatan untuk admin biasa (permintaan 30-31 Okt 2026), diatur super admin per admin dan per angkatan
-- (src/server/akses.js aturAksesAngkatan, src/server/muat.js angkatanTersembunyi). Tanpa baris berlaku bawaan:
-- angkatan Semester 1-3 terlihat, angkatan yang sudah lewat Semester 3 tersembunyi. terlihat = 1: angkatan lewat
-- yang dibuka; terlihat = 0: angkatan Semester 1-3 yang dinonaktifkan. Super admin selalu melihat semuanya.

-- CreateTable
CREATE TABLE `AdminAngkatan` (
    `penggunaId` INTEGER NOT NULL,
    `angkatanId` VARCHAR(191) NOT NULL,
    `terlihat` BOOLEAN NOT NULL,
    `olehId` INTEGER NOT NULL,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAngkatan_angkatanId_idx`(`angkatanId`),
    PRIMARY KEY (`penggunaId`, `angkatanId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminAngkatan` ADD CONSTRAINT `AdminAngkatan_penggunaId_fkey` FOREIGN KEY (`penggunaId`) REFERENCES `Pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminAngkatan` ADD CONSTRAINT `AdminAngkatan_angkatanId_fkey` FOREIGN KEY (`angkatanId`) REFERENCES `Angkatan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

