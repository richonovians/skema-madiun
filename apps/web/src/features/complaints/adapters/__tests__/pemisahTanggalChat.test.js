import { kelompokkanPesanPerTanggal } from '../pemisahTanggalChat';

/**
 * PEMISAH TANGGAL PADA PERCAKAPAN PENGADUAN (21 September 2026, permintaan
 * pengguna).
 *
 * Percakapan tiket bisa menggantung berhari-hari, dan gelembungnya hanya
 * menampilkan jam. Tanpa pemisah, "08.14" hari ini berdempetan dengan "16.02"
 * tiga minggu lalu tanpa satu pun tanda bahwa di antaranya ada jeda.
 *
 * Yang diuji di sini SEMATA penolongnya, sebab di situlah seluruh keputusan
 * sulitnya berada: di mana batas satu hari, dan apa yang terjadi pada pesan
 * yang tanggalnya tak terbaca.
 */
const pesan = (createdAt, text = 'halo') => ({ type: 'chat', text, createdAt });

/** 21 September 2026, 10.00 waktu lokal. */
const SEKARANG = new Date(2026, 8, 21, 10, 0, 0);

describe('kelompokkanPesanPerTanggal', () => {
  it('menyatukan pesan pada tanggal yang sama ke dalam satu kelompok', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [
        pesan(new Date(2026, 8, 21, 8, 14).toISOString(), 'pertama'),
        pesan(new Date(2026, 8, 21, 9, 30).toISOString(), 'kedua'),
      ],
      SEKARANG,
    );

    expect(hasil).toHaveLength(1);
    expect(hasil[0].label).toBe('Hari ini');
    expect(hasil[0].items.map((p) => p.text)).toEqual(['pertama', 'kedua']);
  });

  /**
   * INTI SELURUH BERKAS INI. Kedua pesan berjarak dua menit -- jauh di bawah
   * 24 jam -- tetapi bagi pembacanya itu dua hari yang berbeda. Penggolongan
   * berdasarkan selisih jam akan menyatukan keduanya dan salah.
   */
  it('memisahkan pukul 23.59 dari pukul 00.01 esok harinya', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [
        pesan(new Date(2026, 8, 20, 23, 59).toISOString(), 'malam'),
        pesan(new Date(2026, 8, 21, 0, 1).toISOString(), 'dini hari'),
      ],
      SEKARANG,
    );

    expect(hasil.map((k) => k.label)).toEqual(['Kemarin', 'Hari ini']);
    expect(hasil[0].items.map((p) => p.text)).toEqual(['malam']);
    expect(hasil[1].items.map((p) => p.text)).toEqual(['dini hari']);
  });

  it('menulis tanggal penuh untuk apa pun yang lebih lama dari kemarin', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [pesan(new Date(2026, 8, 15, 16, 2).toISOString())],
      SEKARANG,
    );

    expect(hasil[0].label).toBe('15 September 2026');
  });

  it('tidak pernah mengubah urutan pesan', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [
        pesan(new Date(2026, 8, 15, 16, 2).toISOString(), 'a'),
        pesan(new Date(2026, 8, 20, 9, 0).toISOString(), 'b'),
        pesan(new Date(2026, 8, 21, 9, 0).toISOString(), 'c'),
      ],
      SEKARANG,
    );

    expect(hasil.flatMap((k) => k.items).map((p) => p.text)).toEqual(['a', 'b', 'c']);
  });

  /**
   * Pesan bertanggal rusak TIDAK melahirkan pemisah sendiri. Pita berbunyi
   * "Tanpa tanggal" di tengah percakapan lebih membingungkan daripada
   * menolong, dan membuang pesannya jauh lebih buruk lagi -- isinya justru
   * mungkin yang sedang dicari.
   */
  it('menempelkan pesan tanpa tanggal ke kelompok yang sedang berjalan', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [
        pesan(new Date(2026, 8, 21, 8, 0).toISOString(), 'bertanggal'),
        pesan(null, 'tanpa tanggal'),
        pesan('bukan tanggal', 'rusak'),
      ],
      SEKARANG,
    );

    expect(hasil).toHaveLength(1);
    expect(hasil[0].label).toBe('Hari ini');
    expect(hasil[0].items.map((p) => p.text)).toEqual(['bertanggal', 'tanpa tanggal', 'rusak']);
  });

  /**
   * Bila justru pesan PERTAMA yang tanggalnya tak terbaca, tak ada kelompok
   * berjalan untuk menampungnya. Kelompoknya tetap dibuat, tetapi tanpa label
   * -- perender melewatkan pilnya, bukan menggambar pil kosong.
   */
  it('pesan pertama tanpa tanggal menghasilkan kelompok tanpa label', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [pesan(null, 'awal'), pesan(new Date(2026, 8, 21, 8, 0).toISOString(), 'lalu')],
      SEKARANG,
    );

    expect(hasil).toHaveLength(2);
    expect(hasil[0].label).toBeNull();
    expect(hasil[0].items.map((p) => p.text)).toEqual(['awal']);
    expect(hasil[1].label).toBe('Hari ini');
  });

  it('daftar kosong menghasilkan kelompok kosong, bukan galat', () => {
    expect(kelompokkanPesanPerTanggal([], SEKARANG)).toEqual([]);
    expect(kelompokkanPesanPerTanggal(undefined, SEKARANG)).toEqual([]);
  });

  /**
   * Jam server yang melenceng beberapa menit tak boleh melahirkan pemisah
   * "besok" -- sebutan yang mustahil dipahami di dalam percakapan yang sudah
   * terjadi.
   */
  it('pesan bertanggal masa depan tetap disebut "Hari ini"', () => {
    // BESOK, bukan sekadar jam yang lebih larut hari ini. Versi pertama uji ini
    // memakai pukul 23.50 pada tanggal yang sama, sehingga selisih harinya nol
    // dan cabang masa depan tak pernah tersentuh -- ketahuan saat mutasi
    // `<= 0` menjadi `=== 0` tetap hijau.
    const hasil = kelompokkanPesanPerTanggal(
      [pesan(new Date(2026, 8, 22, 9, 0).toISOString())],
      SEKARANG,
    );

    expect(hasil[0].label).toBe('Hari ini');
  });

  /**
   * PENJAGA EKSPOR. `chatHistory` yang sama diteruskan ke ComplaintExportMenu
   * untuk menyusun baris PDF & Excel. Kalau penolong ini menyisipkan pemisah
   * ke dalam lariknya -- atau mengubahnya dengan cara apa pun -- setiap ekspor
   * tiket akan memuat baris hantu berbunyi "Kemarin" di tengah percakapan.
   * Itulah sebabnya ia mengelompokkan, bukan menyisipkan.
   */
  it('KONTROL: larik masukan tidak diubah sama sekali', () => {
    const masukan = [
      pesan(new Date(2026, 8, 20, 9, 0).toISOString(), 'a'),
      pesan(new Date(2026, 8, 21, 9, 0).toISOString(), 'b'),
    ];
    const salinan = JSON.parse(JSON.stringify(masukan));

    kelompokkanPesanPerTanggal(masukan, SEKARANG);

    expect(masukan).toHaveLength(2);
    expect(masukan).toEqual(salinan);
  });

  it('kunci kelompok berbeda untuk tanggal berbeda, supaya aman dipakai sebagai key React', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [
        pesan(new Date(2026, 8, 20, 9, 0).toISOString()),
        pesan(new Date(2026, 8, 21, 9, 0).toISOString()),
      ],
      SEKARANG,
    );

    expect(new Set(hasil.map((k) => k.kunci)).size).toBe(2);
  });
});

/**
 * KUNCINYA HARUS UNIK WALAU MASUKANNYA TAK URUT.
 *
 * Hari ini mustahil: API mengurutkan balasan `createdAt: 'asc'`
 * (complaints.service.ts) dan klien hanya menambah di ekor. Tapi kedua
 * perender memakai `kunci` sebagai key React, dan invarian yang menjaganya
 * ditegakkan tiga lapis jauhnya di Prisma. Begitu ada yang menambahkan "muat
 * pesan lama" atau sisipan optimistis, dua kelompok bertanggal sama akan
 * berbagi key dan React menggambar percakapan yang salah -- tanpa satu pun
 * uji memerah. Jaminannya karena itu tinggal di sini, bukan di ingatan
 * penulis perender berikutnya.
 */
describe('kunci kelompok', () => {
  it('tetap unik saat tanggal yang sama muncul lagi sesudah tanggal lain', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [
        pesan(new Date(2026, 8, 21, 8, 0).toISOString(), 'a'),
        pesan(new Date(2026, 8, 20, 9, 0).toISOString(), 'b'),
        pesan(new Date(2026, 8, 21, 10, 0).toISOString(), 'c'),
      ],
      SEKARANG,
    );

    const kunci = hasil.map((g) => g.kunci);
    expect(hasil).toHaveLength(3);
    expect(new Set(kunci).size).toBe(3);
  });

  /**
   * Pesan `d` ada supaya uji ini menangkap kesalahan yang mengintai di balik
   * imbuhan itu: bila kelompoknya dibandingkan memakai kunci berimbuhan alih-
   * alih kunci dasar, `c` dan `d` akan terpisah menjadi dua kelompok sehari
   * sendiri-sendiri. Tanpa `d`, pemisahannya tak pernah terlihat.
   */
  it('menyatukan lagi pesan-pesan pada tanggal yang berulang', () => {
    const hasil = kelompokkanPesanPerTanggal(
      [
        pesan(new Date(2026, 8, 21, 8, 0).toISOString(), 'a'),
        pesan(new Date(2026, 8, 20, 9, 0).toISOString(), 'b'),
        pesan(new Date(2026, 8, 21, 10, 0).toISOString(), 'c'),
        pesan(new Date(2026, 8, 21, 11, 0).toISOString(), 'd'),
      ],
      SEKARANG,
    );

    expect(hasil.map((g) => g.label)).toEqual(['Hari ini', 'Kemarin', 'Hari ini']);
    expect(hasil.map((g) => g.items.map((p) => p.text))).toEqual([['a'], ['b'], ['c', 'd']]);
  });
});
