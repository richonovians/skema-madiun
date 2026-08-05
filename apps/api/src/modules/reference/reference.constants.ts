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

/**
 * Sub-kategori pengaduan (INT-42, D12: "keduanya, bertingkat") -- level LEBIH
 * SPESIFIK di bawah `COMPLAINT_CATEGORIES`, BUKAN pengganti. 7 kategori umum
 * dipertahankan untuk agregasi/pelaporan lintas kabupaten; 18 kode ini
 * (diadaptasi dari daftar per-instansi di form pengaduan frontend lama --
 * PUPR/Dishub/Dinkes/Dukcapil/15 Kecamatan) dikelompokkan ULANG di bawah
 * kategori umum yang relevan (bukan per-instansi) supaya TIDAK bergantung pada
 * identitas OPD spesifik yang kini dinamis dari sinkronisasi Helpdesk.
 */
export interface ComplaintSubCategory {
  kode: string;
  nama: string;
  kategoriKode: string; // FK logis ke ComplaintCategory.kode
}

export const COMPLAINT_SUB_CATEGORIES: readonly ComplaintSubCategory[] = [
  // infrastruktur
  {
    kode: 'infrastruktur_jalan',
    nama: 'Infrastruktur Jalan & Jembatan',
    kategoriKode: 'infrastruktur',
  },
  { kode: 'infrastruktur_air', nama: 'Infrastruktur Pengairan', kategoriKode: 'infrastruktur' },
  { kode: 'tata_ruang', nama: 'Tata Ruang & Bangunan', kategoriKode: 'infrastruktur' },
  { kode: 'parkir', nama: 'Pelayanan Parkir', kategoriKode: 'infrastruktur' },
  { kode: 'angkutan', nama: 'Angkutan Umum', kategoriKode: 'infrastruktur' },
  // keamanan_ketertiban
  { kode: 'rambu', nama: 'Rambu Lalu Lintas & PJU', kategoriKode: 'keamanan_ketertiban' },
  // kesehatan
  { kode: 'pelayanan_puskesmas', nama: 'Pelayanan Puskesmas', kategoriKode: 'kesehatan' },
  { kode: 'fasilitas_kesehatan', nama: 'Fasilitas Kesehatan', kategoriKode: 'kesehatan' },
  { kode: 'bpjs', nama: 'Layanan BPJS/Jaminan Kesehatan', kategoriKode: 'kesehatan' },
  // pelayanan_administrasi
  { kode: 'ktp_kk', nama: 'Pelayanan KTP & KK', kategoriKode: 'pelayanan_administrasi' },
  {
    kode: 'akta',
    nama: 'Pelayanan Akta Kelahiran/Kematian',
    kategoriKode: 'pelayanan_administrasi',
  },
  {
    kode: 'pindah_datang',
    nama: 'Pelayanan Pindah Datang',
    kategoriKode: 'pelayanan_administrasi',
  },
  {
    kode: 'adm_kependudukan',
    nama: 'Administrasi Kependudukan',
    kategoriKode: 'pelayanan_administrasi',
  },
  { kode: 'surat_pengantar', nama: 'Surat Pengantar', kategoriKode: 'pelayanan_administrasi' },
  { kode: 'legalisasi', nama: 'Legalisasi', kategoriKode: 'pelayanan_administrasi' },
  {
    kode: 'perizinan_tertentu',
    nama: 'Perizinan Tertentu',
    kategoriKode: 'pelayanan_administrasi',
  },
  {
    kode: 'pengaduan_masyarakat',
    nama: 'Pengaduan Masyarakat (Kecamatan)',
    kategoriKode: 'pelayanan_administrasi',
  },
  { kode: 'pembinaan_desa', nama: 'Pembinaan Desa', kategoriKode: 'pelayanan_administrasi' },
];
