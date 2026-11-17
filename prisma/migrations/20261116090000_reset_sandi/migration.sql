-- Tautan lupa kata sandi lewat email untuk mahasiswa dan dosen (16 Nov 2026), selama VIBE belum memakai SSO.
-- Hanya hash SHA-256 tokennya yang disimpan. Baris ikut terhapus bila akunnya dihapus.

-- CreateTable
CREATE TABLE `ResetSandi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penggunaId` INTEGER NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `kedaluwarsa` DATETIME(3) NOT NULL,
    `dipakai` DATETIME(3) NULL,
    `dibuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ResetSandi_tokenHash_key`(`tokenHash`),
    INDEX `ResetSandi_penggunaId_dibuat_idx`(`penggunaId`, `dibuat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResetSandi` ADD CONSTRAINT `ResetSandi_penggunaId_fkey` FOREIGN KEY (`penggunaId`) REFERENCES `Pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
