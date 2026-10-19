import {
  TEMPLATE_ADMIN,
  TEMPLATE_WARGA,
  gabungPesan,
  terapkanTemplate,
} from '../templatePesan';

/**
 * TEMPLATE PESAN PERCAKAPAN PENGADUAN (17 September 2026, permintaan pengguna).
 *
 * Aturan penggabungannya diuji di sini, terpisah dari tampilan, karena justru
 * di aturan itulah kerusakan yang paling mahal bisa terjadi: template yang
 * menimpa kalimat yang sedang diketik orang menghapus pekerjaan yang tak bisa
 * dikembalikan, dan kerusakan seperti itu tak akan terlihat pada uji yang hanya
 * memastikan panelnya terbuka.
 */
describe('terapkanTemplate', () => {
  it('mengganti kata kunci tiket dengan nomor pengaduan sungguhan', () => {
    expect(terapkanTemplate('Pengaduan {tiket} sedang diproses.', 'PGD20260917ABCD')).toBe(
      'Pengaduan PGD20260917ABCD sedang diproses.',
    );
  });

  it('mengganti seluruh kemunculannya, bukan yang pertama saja', () => {
    expect(terapkanTemplate('{tiket} dan {tiket}', 'PGD1')).toBe('PGD1 dan PGD1');
  });

  /**
   * Nomor tiket datang dari alamat halaman, dan halaman yang belum selesai
   * memuat belum memilikinya. Kurung kurawal yang lolos ke kotak pesan akan
   * ikut terkirim ke warga -- kalimat "Pengaduan {tiket} sudah kami terima"
   * yang muncul apa adanya lebih buruk daripada kalimat tanpa nomor.
   */
  it.each([
    [undefined, 'Pengaduan ini sudah kami terima.'],
    ['', 'Pengaduan ini sudah kami terima.'],
    ['   ', 'Pengaduan ini sudah kami terima.'],
  ])('tanpa nomor tiket (%p) kalimatnya tetap utuh', (nomor, harapan) => {
    expect(terapkanTemplate('Pengaduan {tiket} sudah kami terima.', nomor)).toBe(harapan);
  });
});

describe('gabungPesan', () => {
  it('mengisi kotak yang masih kosong', () => {
    expect(gabungPesan('', 'Mohon informasi perkembangannya.')).toBe(
      'Mohon informasi perkembangannya.',
    );
  });

  it('menganggap kotak berisi spasi saja sebagai kosong', () => {
    expect(gabungPesan('  \n ', 'Halo.')).toBe('Halo.');
  });

  /**
   * INTI ATURANNYA. Mengganti isi kotak akan menghapus ketikan orang tanpa
   * peringatan dan tanpa jalan kembali.
   */
  it('menyambung di baris baru tanpa menghapus ketikan yang sudah ada', () => {
    expect(gabungPesan('Selamat pagi.', 'Mohon informasi perkembangannya.')).toBe(
      'Selamat pagi.\nMohon informasi perkembangannya.',
    );
  });

  it('tidak menumpuk baris kosong ketika ketikannya berakhir dengan enter', () => {
    expect(gabungPesan('Selamat pagi.\n\n', 'Terima kasih.')).toBe(
      'Selamat pagi.\nTerima kasih.',
    );
  });
});

/**
 * Kedua daftar harus benar-benar berbeda isi. Inilah permintaan aslinya:
 * warga dan admin tidak boleh ditawari kalimat yang sama, sebab kalimat admin
 * berbicara atas nama instansi ("sudah kami terima") dan akan terbaca aneh --
 * bahkan menyesatkan -- bila keluar dari mulut pelapor.
 */
describe('daftar template', () => {
  const semua = [...TEMPLATE_WARGA, ...TEMPLATE_ADMIN];

  it('tidak ada satu pun kalimat yang dipakai kedua peran', () => {
    const isiWarga = TEMPLATE_WARGA.map((t) => t.isi);
    const isiAdmin = TEMPLATE_ADMIN.map((t) => t.isi);

    expect(isiWarga.filter((isi) => isiAdmin.includes(isi))).toEqual([]);
  });

  it('setiap template punya id unik, judul, dan isi', () => {
    const id = semua.map((t) => t.id);

    expect(new Set(id).size).toBe(semua.length);
    semua.forEach((t) => {
      expect(t.judul.trim()).not.toBe('');
      expect(t.isi.trim()).not.toBe('');
    });
  });

  /**
   * KONTROL. Kata kunci yang salah tulis -- `{tiketNo}`, `{ticket}` -- lolos
   * tanpa satu pun uji memerah, lalu terkirim apa adanya kepada warga.
   */
  it('KONTROL: tak ada kurung kurawal tersisa sesudah template diterapkan', () => {
    semua.forEach((t) => {
      expect(terapkanTemplate(t.isi, 'PGD20260917ABCD')).not.toMatch(/[{}]/);
    });
  });
});
