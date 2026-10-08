-- CreateTable
CREATE TABLE `Pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `peran` ENUM('MAHASISWA', 'DOSEN', 'ADMIN') NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Pengguna_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profil` (
    `penggunaId` INTEGER NOT NULL,
    `telepon` VARCHAR(191) NULL,
    `ponsel` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,
    `foto` LONGTEXT NULL,
    `fotoSumber` LONGTEXT NULL,

    PRIMARY KEY (`penggunaId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fakultas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Fakultas_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProgramStudi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `jenjang` VARCHAR(2) NOT NULL,
    `fakultasId` INTEGER NOT NULL,

    UNIQUE INDEX `ProgramStudi_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Angkatan` (
    `id` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `periodeTahun` VARCHAR(191) NOT NULL,
    `periodeSemester` ENUM('GANJIL', 'GENAP') NOT NULL,
    `status` ENUM('AKTIF', 'TERKUNCI') NOT NULL DEFAULT 'AKTIF',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mahasiswa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nim` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `penggunaId` INTEGER NOT NULL,
    `prodiId` INTEGER NOT NULL,
    `angkatanId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Mahasiswa_nim_key`(`nim`),
    UNIQUE INDEX `Mahasiswa_penggunaId_key`(`penggunaId`),
    INDEX `Mahasiswa_angkatanId_prodiId_idx`(`angkatanId`, `prodiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dosen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nip` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `jabatan` VARCHAR(191) NOT NULL,
    `sumber` ENUM('PDP', 'MK', 'ENGAGEMENT') NOT NULL,
    `semester` INTEGER NOT NULL,
    `penggunaId` INTEGER NOT NULL,
    `prodiId` INTEGER NOT NULL,

    UNIQUE INDEX `Dosen_nip_key`(`nip`),
    UNIQUE INDEX `Dosen_penggunaId_key`(`penggunaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Komponen` (
    `id` VARCHAR(191) NOT NULL,
    `aspekId` VARCHAR(191) NOT NULL,
    `sumber` ENUM('PDP', 'MK', 'ENGAGEMENT') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `jenis` VARCHAR(191) NULL,
    `resmi` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Batch` (
    `id` VARCHAR(191) NOT NULL,
    `sumber` ENUM('PDP', 'MK', 'ENGAGEMENT') NOT NULL,
    `semester` INTEGER NOT NULL,
    `angkatanId` VARCHAR(191) NOT NULL,
    `aktorId` INTEGER NOT NULL,
    `cara` VARCHAR(191) NOT NULL,
    `status` ENUM('DIPROSES', 'DIBATALKAN', 'DIKUNCI') NOT NULL DEFAULT 'DIPROSES',
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Nilai` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `komponenId` VARCHAR(191) NOT NULL,
    `nilai` DOUBLE NOT NULL,
    `penilaiId` INTEGER NOT NULL,
    `batchId` VARCHAR(191) NULL,
    `diperbarui` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Nilai_mahasiswaId_komponenId_key`(`mahasiswaId`, `komponenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `aktorId` INTEGER NOT NULL,
    `mahasiswaId` INTEGER NOT NULL,
    `komponenId` VARCHAR(191) NOT NULL,
    `nilaiLama` DOUBLE NULL,
    `nilaiBaru` DOUBLE NULL,
    `batchId` VARCHAR(191) NULL,

    INDEX `AuditLog_mahasiswaId_idx`(`mahasiswaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Penguncian` (
    `mahasiswaId` INTEGER NOT NULL,
    `aspekId` VARCHAR(191) NOT NULL,
    `status` ENUM('FINAL', 'SEMENTARA') NOT NULL,
    `olehId` INTEGER NOT NULL,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`mahasiswaId`, `aspekId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengajuanKoreksi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `komponenId` VARCHAR(191) NOT NULL,
    `alasan` TEXT NOT NULL,
    `nilaiDiharapkan` DOUBLE NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `diajukan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diputuskanOleh` INTEGER NULL,
    `diputuskanPada` DATETIME(3) NULL,
    `catatan` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengumpulan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mahasiswaId` INTEGER NOT NULL,
    `komponenId` VARCHAR(191) NOT NULL,
    `dosenId` INTEGER NOT NULL,
    `bentuk` VARCHAR(191) NOT NULL,
    `berkas` VARCHAR(191) NOT NULL,
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `terlambat` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Pengumpulan_mahasiswaId_komponenId_key`(`mahasiswaId`, `komponenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usulan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dosenId` INTEGER NOT NULL,
    `cara` VARCHAR(191) NOT NULL,
    `catatan` TEXT NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `waktu` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `batchId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsulanEntri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usulanId` INTEGER NOT NULL,
    `nim` VARCHAR(191) NOT NULL,
    `komponenId` VARCHAR(191) NOT NULL,
    `nilai` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Konfigurasi` (
    `kunci` VARCHAR(191) NOT NULL,
    `nilai` JSON NOT NULL,

    PRIMARY KEY (`kunci`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Profil` ADD CONSTRAINT `Profil_penggunaId_fkey` FOREIGN KEY (`penggunaId`) REFERENCES `Pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProgramStudi` ADD CONSTRAINT `ProgramStudi_fakultasId_fkey` FOREIGN KEY (`fakultasId`) REFERENCES `Fakultas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_penggunaId_fkey` FOREIGN KEY (`penggunaId`) REFERENCES `Pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `ProgramStudi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_angkatanId_fkey` FOREIGN KEY (`angkatanId`) REFERENCES `Angkatan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dosen` ADD CONSTRAINT `Dosen_penggunaId_fkey` FOREIGN KEY (`penggunaId`) REFERENCES `Pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dosen` ADD CONSTRAINT `Dosen_prodiId_fkey` FOREIGN KEY (`prodiId`) REFERENCES `ProgramStudi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Nilai` ADD CONSTRAINT `Nilai_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Nilai` ADD CONSTRAINT `Nilai_komponenId_fkey` FOREIGN KEY (`komponenId`) REFERENCES `Komponen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Nilai` ADD CONSTRAINT `Nilai_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Penguncian` ADD CONSTRAINT `Penguncian_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanKoreksi` ADD CONSTRAINT `PengajuanKoreksi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengumpulan` ADD CONSTRAINT `Pengumpulan_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsulanEntri` ADD CONSTRAINT `UsulanEntri_usulanId_fkey` FOREIGN KEY (`usulanId`) REFERENCES `Usulan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
