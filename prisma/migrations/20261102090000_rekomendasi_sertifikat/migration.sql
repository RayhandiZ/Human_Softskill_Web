-- Rekomendasi admin Kemahasiswaan pada akses cetak sertifikat (keputusan 26 Okt 2026). Admin biasa tidak lagi
-- menyetujui atau menolak sendiri: ia selalu meneruskan ke super admin dengan rekomendasi disarankan (adminSaran = 1)
-- atau tidak disarankan (0) beserta alasan wajib (adminCatatan), lalu super admin yang memutuskan. Hanya menambah dua
-- kolom kosong. Permintaan yang sudah diteruskan sebelum ini dulu diteruskan dengan "menyetujui", jadi dianggap
-- disarankan, tanpa alasan tertulis.

-- AlterTable
ALTER TABLE `PermintaanSertifikat` ADD COLUMN `adminCatatan` TEXT NULL,
    ADD COLUMN `adminSaran` BOOLEAN NULL;

UPDATE `PermintaanSertifikat` SET `adminSaran` = true WHERE `adminOleh` IS NOT NULL;
