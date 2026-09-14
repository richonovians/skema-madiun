/**
 * Susunan kolom bagi ekspor PDF tabel.
 *
 * Dipisahkan dari komponen pemanggilnya supaya lebarnya dapat diuji dengan
 * jsPDF sungguhan tanpa ikut merender halaman. Angkanya bukan selera: ia
 * ditetapkan dari lebar huruf isi terpanjang yang mungkin muncul di kolomnya,
 * sesudah cacat 12 September 2026 ketika Status dan Tanggal masing-masing hanya
 * kebagian 73,6pt sehingga setiap baris terpotong dua.
 *
 * Bobot di bawah dinormalisasi ke lebar tabel, dan totalnya sengaja dibuat 515
 * yaitu lebar isi A4 bermargin 40pt, sehingga tiap angka terbaca langsung
 * sebagai poin.
 */
export const KOLOM_DAFTAR_PENGADUAN = [
  { header: 'No. Tiket', width: 50 },
  { header: 'Judul Keluhan', width: 175 },
  { header: 'Pelapor', width: 100 },
  // Muat "Menunggu Verifikasi", label status terpanjang (enumLabels.js).
  { header: 'Status', width: 100 },
  // Muat "12 September 2026", bentuk terpanjang dari formatDateId.
  { header: 'Tanggal', width: 90 },
];

export const KOLOM_LAPORAN_RINGKAS = [
  { header: 'Indikator', width: 3 },
  { header: 'Nilai', width: 2 },
];

/**
 * Tabel ringkasan hanya berisi beberapa baris pendek. Dibiarkan selebar halaman,
 * nilai seperti "82,44" duduk sendirian di sel selebar 206pt dan tabelnya
 * terbaca kosong melompong.
 */
export const LEBAR_TABEL_RINGKAS = 320;

/**
 * Monitoring pengaduan tingkat kabupaten. SATU-SATUNYA laporan yang dicetak
 * mendatar: tujuh kolomnya butuh sekitar 760pt sedangkan A4 tegak hanya
 * menyediakan 515pt, dan membuang kolom demi muat tegak berarti mengurangi isi
 * laporannya. Bobot di bawah dijumlahkan ke 760, yaitu lebar isi A4 mendatar
 * bermargin 40pt (761,9pt).
 */
export const KOLOM_MONITORING_PENGADUAN = [
  { header: 'No. Tiket', width: 100 },
  // Muat "Dinas Komunikasi dan Informatika", nama OPD terpanjang.
  { header: 'OPD Tujuan', width: 160 },
  { header: 'Kategori', width: 65 },
  { header: 'Judul Keluhan', width: 160 },
  { header: 'Pelapor', width: 85 },
  { header: 'Status', width: 100 },
  { header: 'Tanggal', width: 90 },
];

/** Monitoring survei tingkat kabupaten, A4 tegak (515pt). */
export const KOLOM_MONITORING_SURVEI = [
  { header: 'Judul Survei', width: 105 },
  { header: 'OPD', width: 155 },
  // Muat "Triwulan III - 2026", bentuk terpanjang formatPeriodeLabel.
  { header: 'Periode', width: 100 },
  { header: 'Status', width: 45 },
  // Dua kolom angka di bawah ditentukan oleh KEPALANYA, bukan isinya: angkanya
  // pendek, tetapi kata "Responden" sendiri butuh 48,8pt. Sebelumnya 50 dan 45,
  // dan kepalanya melimpah ke kolom sebelah (laporan 13 September 2026).
  { header: 'Responden', width: 60 },
  { header: 'Nilai IKM', width: 50 },
];

/** Daftar survei milik satu OPD. Tanpa kolom OPD, sebab seluruhnya OPD sendiri. */
export const KOLOM_SURVEI_OPD = [
  { header: 'Judul Survei', width: 195 },
  { header: 'Periode', width: 100 },
  { header: 'Status', width: 70 },
  { header: 'Responden', width: 75 },
  { header: 'Nilai IKM', width: 75 },
];
