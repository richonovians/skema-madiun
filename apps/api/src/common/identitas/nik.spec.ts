import { samarkanNik } from './nik';

/**
 * PENYAMARAN NIK (1 Oktober 2026, permintaan pengguna: "samarkan data NIK di
 * halaman opd dan kabupaten").
 *
 * DI BACKEND, BUKAN DI TAMPILAN, dan itu keputusan yang menentukan. NIK pada
 * detail pengaduan milik ORANG LAIN, bukan milik petugas yang membukanya.
 * Kalau tampilan tak pernah menggambar nomor penuhnya, mengirimkannya ke
 * peramban petugas hanya memperbanyak tempat ia beredar: alat pengembang,
 * ekstensi peramban, singgahan respons. Di sini nomor penuhnya tak pernah
 * meninggalkan server.
 *
 * ADA PASANGANNYA DI FRONTEND (`samarkanNik` pada me.adapter.js) untuk halaman
 * profil sendiri, dan itu disengaja: di sana NIK milik pemilik sesinya, jadi
 * penyamaran memang urusan tampilan. Keduanya WAJIB menghasilkan bentuk yang
 * sama; berkas uji ini dan pasangannya sama-sama menuliskan bentuk itu
 * tersurat, sehingga mengubah salah satu tanpa yang lain akan memerah.
 */
describe('samarkanNik', () => {
  it('menyisakan empat digit awal dan empat digit akhir', () => {
    expect(samarkanNik('3520041502050002')).toBe('3520 04•• •••• 0002');
  });

  /**
   * DUA BELAS DIGIT TENGAH yang ditutup bukan pilihan sembarang: pada NIK,
   * segmen itu memuat sisa kode wilayah, TANGGAL LAHIR, dan nomor urut. Empat
   * digit pertama cukup bagi petugas untuk mengenali provinsi/kabupaten, dan
   * empat terakhir cukup untuk membedakan dua pelapor yang mirip.
   */
  it('menutup seluruh dua belas digit tengahnya', () => {
    const hasil = samarkanNik('3507123456789012');

    expect(hasil).toBe('3507 12•• •••• 9012');
    expect(hasil).not.toContain('3456');
  });

  it('nomor yang berbeda di tengah tetap tersamar sama', () => {
    // Bukti bahwa yang tertutup benar-benar tertutup: dua NIK yang hanya
    // berbeda pada bagian tengah tak dapat dibedakan dari hasil penyamarannya.
    expect(samarkanNik('3520041502050002')).toBe(samarkanNik('3520049909990002'));
  });

  /**
   * PANJANG YANG TAK DIKENALI DITUTUP SELURUHNYA. Helpdesk tak menjamin 16
   * digit, dan menyamarkan berdasarkan POSISI pada nilai yang panjangnya tak
   * dikenal dapat membuka justru bagian yang ingin ditutup.
   */
  it.each([
    ['terlalu pendek', '12345', '•••••'],
    ['terlalu panjang', '35200415020500021', '•'.repeat(17)],
    ['ada hurufnya', '3520X41502050002', '•'.repeat(16)],
  ])('bentuk %s ditutup seluruhnya', (_label, nik, harapan) => {
    expect(samarkanNik(nik)).toBe(harapan);
  });

  it('memangkas spasi di tepi sebelum menilai bentuknya', () => {
    expect(samarkanNik('  3520041502050002  ')).toBe('3520 04•• •••• 0002');
  });

  it('kosong tetap null, bukan deretan titik', () => {
    expect(samarkanNik(null)).toBeNull();
    expect(samarkanNik(undefined)).toBeNull();
    expect(samarkanNik('')).toBeNull();
    expect(samarkanNik('   ')).toBeNull();
  });

  it('bukan string ditolak, tidak dipaksa jadi string', () => {
    expect(samarkanNik(3520041502050002 as never)).toBeNull();
    expect(samarkanNik(['3520041502050002'] as never)).toBeNull();
  });
});
