/*
  Warnings:

  - You are about to alter the column `telepon` on the `profil` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `profil` MODIFY `telepon` VARCHAR(191) NULL,
    MODIFY `alamat` VARCHAR(500) NULL;
