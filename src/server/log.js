// Catatan tindakan admin selain perubahan nilai (yang sudah punya AuditLog): kunci angkatan, perubahan
// data terkunci beserta alasannya, dan perubahan tanda penguncian aspek.
//
// Dipanggil DI DALAM transaksi `tx` yang sama dengan perubahan datanya, supaya catatan dan perubahan
// selalu berhasil atau gagal bersama: tidak ada perubahan tanpa jejak, tidak ada jejak tanpa perubahan.

export async function catatLog(tx, { aktorId, aksi, target, rincian }) {
  await tx.logAktivitas.create({
    data: { aktorId, aksi, target, rincian: rincian ?? undefined },
  })
}
