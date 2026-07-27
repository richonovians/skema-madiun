/**
 * Template 9 unsur baku SKM sesuai PermenPANRB No. 14 Tahun 2017 (Lampiran A PRD).
 * Data referensi statis — dipakai oleh seed dan (nanti) endpoint GET /ref/unsur.
 */
export interface SkmUnsur {
  kode: string; // U1..U9
  teks: string;
}

export const SKM_UNSUR: readonly SkmUnsur[] = [
  { kode: 'U1', teks: 'Persyaratan' },
  { kode: 'U2', teks: 'Sistem, Mekanisme, dan Prosedur' },
  { kode: 'U3', teks: 'Waktu Penyelesaian' },
  { kode: 'U4', teks: 'Biaya/Tarif' },
  { kode: 'U5', teks: 'Produk Spesifikasi Jenis Pelayanan' },
  { kode: 'U6', teks: 'Kompetensi Pelaksana' },
  { kode: 'U7', teks: 'Perilaku Pelaksana' },
  { kode: 'U8', teks: 'Sarana dan Prasarana' },
  { kode: 'U9', teks: 'Penanganan Pengaduan, Saran, dan Masukan' },
];

/**
 * Kategori baku pengaduan masyarakat. Data referensi statis — dipakai endpoint
 * GET /ref/complaint-categories dan (nanti) validasi `complaints.kategori`.
 */
export interface ComplaintCategory {
  kode: string;
  nama: string;
}

export const COMPLAINT_CATEGORIES: readonly ComplaintCategory[] = [
  { kode: 'infrastruktur', nama: 'Infrastruktur' },
  { kode: 'pelayanan_administrasi', nama: 'Pelayanan Administrasi' },
  { kode: 'kesehatan', nama: 'Kesehatan' },
  { kode: 'pendidikan', nama: 'Pendidikan' },
  { kode: 'kebersihan_lingkungan', nama: 'Kebersihan & Lingkungan' },
  { kode: 'keamanan_ketertiban', nama: 'Keamanan & Ketertiban' },
  { kode: 'lainnya', nama: 'Lainnya' },
];
