-- Penanda baca lonceng admin: id LogAktivitas terakhir yang sudah ditandai dibaca oleh akun itu (src/server/notifikasi.js).
-- Kosong berarti akun itu belum pernah menandai; pembaruannya dihitung sejak akunnya dibuat.

-- AlterTable
ALTER TABLE `Pengguna` ADD COLUMN `notifDibacaId` INTEGER NULL;
