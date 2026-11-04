import { TingkatPengaduan } from '@prisma/client';

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
 * RIWAYAT DUA KALI BERUBAH, dan arahnya berlawanan:
 *
 * 1. 4 September 2026 — 7 kategori topik + 18 sub-kategori (D12/INT-42)
 *    disederhanakan menjadi tiga kategori umum ('aduan'/'lapor'/'lainnya').
 *    Konsekuensinya diterima sadar: laporan tak lagi dapat menjawab "pengaduan
 *    terbanyak soal apa".
 * 2. 4 November 2026 — ketiga kategori itu diganti taksonomi PER TINGKAT
 *    (8 kecamatan + 21 kabupaten) atas permintaan pengguna, justru supaya
 *    pertanyaan itu terjawab kembali. Migrasi
 *    `20261104090000_tingkat_pengaduan` memetakan 19 pengaduan lama ke
 *    "Lainnya" pada tingkatnya masing-masing, sehingga ketiga kode lama
 *    TIDAK lagi ada di basis data dan sengaja tak disisakan di sini.
 *
 * `tingkat` BUKAN sekadar penyaring tampilan: ia bagian dari identitas
 * kategori. Awalan kodenya (`kec_`/`kab_`) mengulang hal yang sama supaya
 * ketidaksesuaian terlihat di data mentah, bukan hanya lewat tabel ini --
 * dan supaya dua "Lainnya" yang berbeda tingkat tak pernah bertabrakan kode.
 */
export interface ComplaintCategory {
  kode: string;
  nama: string;
  tingkat: TingkatPengaduan;
}

/**
 * Kategori tingkat KECAMATAN. Urutannya mengikuti daftar yang diberikan
 * pengguna dan dipakai apa adanya oleh dropdown — jangan diurut ulang secara
 * alfabetis, "Lainnya" harus tetap terakhir.
 */
const KATEGORI_KECAMATAN: readonly ComplaintCategory[] = [
  { kode: 'kec_administrasi', nama: 'Pelayanan Administrasi Kecamatan' },
  { kode: 'kec_aparatur', nama: 'Kinerja & Perilaku Aparatur Kecamatan' },
  { kode: 'kec_sarana', nama: 'Sarana & Prasarana Kantor Kecamatan' },
  { kode: 'kec_informasi', nama: 'Informasi & Transparansi Pelayanan Kecamatan' },
  { kode: 'kec_pengaduan', nama: 'Pengelolaan Pengaduan & Tindak Lanjut' },
  { kode: 'kec_desa', nama: 'Koordinasi & Fasilitasi Pemerintahan Desa/Kelurahan' },
  { kode: 'kec_ketenteraman', nama: 'Ketenteraman & Ketertiban Wilayah' },
  { kode: 'kec_lainnya', nama: 'Lainnya' },
].map((k) => ({ ...k, tingkat: TingkatPengaduan.kecamatan }));

/** Kategori tingkat KABUPATEN. Catatan urutan sama seperti di atas. */
const KATEGORI_KABUPATEN: readonly ComplaintCategory[] = [
  { kode: 'kab_kependudukan', nama: 'Kependudukan & Pencatatan Sipil' },
  { kode: 'kab_infrastruktur', nama: 'Infrastruktur & Pekerjaan Umum' },
  { kode: 'kab_transportasi', nama: 'Transportasi & Lalu Lintas' },
  { kode: 'kab_kesehatan', nama: 'Kesehatan' },
  { kode: 'kab_sosial', nama: 'Sosial & Bantuan Sosial' },
  { kode: 'kab_pendidikan', nama: 'Pendidikan & Kebudayaan' },
  { kode: 'kab_lingkungan', nama: 'Lingkungan Hidup & Persampahan' },
  { kode: 'kab_ketertiban', nama: 'Ketertiban Umum & Perlindungan Masyarakat' },
  { kode: 'kab_perizinan', nama: 'Perizinan & Penanaman Modal' },
  { kode: 'kab_aparatur', nama: 'Pelayanan Aparatur & Pengawasan Pemerintahan' },
  { kode: 'kab_pertanian', nama: 'Pertanian, Peternakan & Perikanan' },
  { kode: 'kab_ketenagakerjaan', nama: 'Ketenagakerjaan' },
  { kode: 'kab_desa', nama: 'Pemerintahan & Pemberdayaan Desa' },
  { kode: 'kab_pariwisata', nama: 'Pariwisata, Kepemudaan & Olahraga' },
  { kode: 'kab_perdagangan', nama: 'Perdagangan & Ketahanan Pangan' },
  { kode: 'kab_kominfo', nama: 'Komunikasi, Informatika & Informasi Publik' },
  { kode: 'kab_bencana', nama: 'Penanggulangan Bencana & Kedaruratan' },
  { kode: 'kab_perumahan', nama: 'Perumahan & Kawasan Permukiman' },
  { kode: 'kab_perencanaan', nama: 'Perencanaan Pembangunan & Keuangan Daerah' },
  { kode: 'kab_hukum', nama: 'Hukum, Pemerintahan & Administrasi Daerah' },
  { kode: 'kab_lainnya', nama: 'Lainnya' },
].map((k) => ({ ...k, tingkat: TingkatPengaduan.kabupaten }));

export const COMPLAINT_CATEGORIES: readonly ComplaintCategory[] = [
  ...KATEGORI_KECAMATAN,
  ...KATEGORI_KABUPATEN,
];

/** Kategori pada satu tingkat saja, urutan daftar dipertahankan. */
export function kategoriPengaduan(tingkat: TingkatPengaduan): readonly ComplaintCategory[] {
  return COMPLAINT_CATEGORIES.filter((k) => k.tingkat === tingkat);
}

/**
 * Tingkat yang memiliki kode kategori ini, atau `null` bila kodenya tak dikenal.
 *
 * Dipakai `assertKategoriSesuaiTingkat` di jalur tulis pengaduan. Sengaja
 * MEMBACA TABEL, bukan memeriksa awalan `kec_`/`kab_`: awalan itu konvensi
 * penamaan yang membantu manusia membaca data mentah, sementara daftar inilah
 * kebenarannya. Kode mengarang berawalan `kab_` tetap harus ditolak.
 */
export function tingkatKategoriPengaduan(kode: string | null | undefined): TingkatPengaduan | null {
  if (!kode) {
    return null;
  }
  return COMPLAINT_CATEGORIES.find((k) => k.kode === kode)?.tingkat ?? null;
}
