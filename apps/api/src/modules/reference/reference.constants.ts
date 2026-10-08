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
 * Nama resmi sebuah unsur menurut kodenya, atau `null` bila kodenya tidak
 * dikenal (survei lama berkode kustom) atau kosong.
 *
 * Sejak 8 Oktober 2026 kolom `questions.teks` pada pertanyaan unsur berisi
 * KALIMAT pertanyaan buatan OPD, bukan lagi nama unsur. Laporan IKM, tabel
 * analitik, dan ekspor tetap harus menyebut nama resminya, jadi namanya
 * diambil dari kode lewat tabel ini.
 */
export function namaUnsur(kode: string | null | undefined): string | null {
  if (!kode) {
    return null;
  }
  return SKM_UNSUR.find((unsur) => unsur.kode === kode)?.teks ?? null;
}

/**
 * Kategori baku pengaduan masyarakat. Data referensi statis — dipakai endpoint
 * GET /ref/complaint-categories dan validasi `complaints.kategori`.
 *
 * DISEDERHANAKAN 4 September 2026 (keputusan pengguna): 7 kategori topik + 18
 * sub-kategori (D12/INT-42) diganti tiga kategori umum. Konsekuensi yang
 * diterima secara sadar: rincian kategori di dashboard tinggal tiga batang,
 * dan laporan tak lagi dapat menjawab "pengaduan terbanyak soal apa".
 */
export interface ComplaintCategory {
  kode: string;
  nama: string;
}

export const COMPLAINT_CATEGORIES: readonly ComplaintCategory[] = [
  { kode: 'aduan', nama: 'Aduan' },
  { kode: 'lapor', nama: 'Lapor' },
  { kode: 'lainnya', nama: 'Lainnya' },
];
