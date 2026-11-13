-- CreateTable
CREATE TABLE `Kelas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(30) NOT NULL,
    `prodiId` INTEGER NOT NULL,

    UNIQUE INDEX `Kelas_prodiId_nama_key`(`prodiId`, `nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Kelas` ADD CONSTRAINT `Kelas_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `ProgramStudi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Contoh dua kelas, A dan B, untuk setiap prodi yang sudah ada (12 Nov 2026). Basis data baru yang prodinya ditanam
-- sesudah migrasi ini mendapat contoh yang sama dari prisma/seed.js.
INSERT INTO `Kelas` (`nama`, `prodiId`)
SELECT k.`nama`, p.`id` FROM `ProgramStudi` p CROSS JOIN (SELECT 'A' AS `nama` UNION ALL SELECT 'B') k ORDER BY p.`id`, k.`nama`;
