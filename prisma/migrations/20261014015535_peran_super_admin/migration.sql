-- Super admin menjadi peran sendiri (SUPER_ADMIN), menggantikan tanda Pengguna.superAdmin.
-- Urutannya penting: nilai enum ditambah dulu, akun bertanda super admin dipindahkan ke peran
-- baru, baru kolom lamanya dibuang. Tanpa UPDATE di tengah, tanda super admin ikut terhapus.

-- AlterTable
ALTER TABLE `Pengguna` MODIFY `peran` ENUM('MAHASISWA', 'DOSEN', 'ADMIN', 'SUPER_ADMIN') NOT NULL;

-- Pindahkan data
UPDATE `Pengguna` SET `peran` = 'SUPER_ADMIN' WHERE `peran` = 'ADMIN' AND `superAdmin` = true;

-- AlterTable
ALTER TABLE `Pengguna` DROP COLUMN `superAdmin`;
