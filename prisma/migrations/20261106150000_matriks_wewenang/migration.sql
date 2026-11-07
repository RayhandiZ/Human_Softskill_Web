-- CreateTable
CREATE TABLE `TindakanWewenang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tindakan` VARCHAR(150) NOT NULL,
    `izin` JSON NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `dibuatOleh` INTEGER NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diubahOleh` INTEGER NULL,
    `diubahPada` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KeteranganWewenang` (
    `baris` VARCHAR(40) NOT NULL,
    `peran` VARCHAR(20) NOT NULL,
    `teks` VARCHAR(300) NOT NULL,
    `diubahOleh` INTEGER NOT NULL,
    `diubahPada` DATETIME(3) NOT NULL,

    PRIMARY KEY (`baris`, `peran`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

