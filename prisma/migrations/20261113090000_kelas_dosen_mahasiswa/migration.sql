-- Kelas dosen dan anggota kelas (13 Nov 2026). Mahasiswa.kelasId: kelas mahasiswa di prodinya, boleh kosong (belum
-- dimasukkan ke kelas); kelas yang terhapus bersama prodinya mengosongkan kolom ini. DosenKelas: kelas yang diampu
-- seorang dosen, boleh di beberapa prodi; dosen tanpa baris di sini tetap memegang semua mahasiswa prodinya, jadi dosen
-- yang sudah ada tidak berubah kelasnya. Tidak ada data yang dipindah.

-- AlterTable
ALTER TABLE `Mahasiswa` ADD COLUMN `kelasId` INTEGER NULL;

-- CreateTable
CREATE TABLE `DosenKelas` (
    `dosenId` INTEGER NOT NULL,
    `kelasId` INTEGER NOT NULL,

    INDEX `DosenKelas_kelasId_idx`(`kelasId`),
    PRIMARY KEY (`dosenId`, `kelasId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Mahasiswa_kelasId_idx` ON `Mahasiswa`(`kelasId`);

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DosenKelas` ADD CONSTRAINT `DosenKelas_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DosenKelas` ADD CONSTRAINT `DosenKelas_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `Kelas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
