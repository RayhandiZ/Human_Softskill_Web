-- Tanda syarat sertifikat tambahan per mahasiswa (23 Nov 2026). Super Admin bisa menambah syarat kelayakan cetak
-- sertifikat; daftar syaratnya ada di Konfigurasi SYARAT_TAMBAHAN, dan syarat berjenis manual ditandai per mahasiswa di
-- tabel ini. Tabelnya baru dan kosong, jadi tidak ada data lama yang diubah. Barisnya ikut terhapus bila mahasiswanya dihapus.

-- CreateTable
CREATE TABLE `SyaratMahasiswa` (
    `syaratId` VARCHAR(32) NOT NULL,
    `mahasiswaId` INTEGER NOT NULL,
    `ditandaiOleh` INTEGER NOT NULL,
    `ditandaiPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SyaratMahasiswa_mahasiswaId_idx`(`mahasiswaId`),
    PRIMARY KEY (`syaratId`, `mahasiswaId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SyaratMahasiswa` ADD CONSTRAINT `SyaratMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
