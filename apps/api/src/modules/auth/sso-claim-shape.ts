/**
 * Bentuk payload klaim Helpdesk, TANPA isinya (9 September 2026).
 *
 * MENGAPA ADA. Tiga pertanyaan tentang SSO Helpdesk belum terjawab dan
 * menghalangi pekerjaan lain: bentuk nilai `groups` dan `role` (yang menentukan
 * isi `HELPDESK_SSO_OPD_CLAIM`, sampai kini kosong sehingga sinkronisasi OPD
 * mati), dan ada atau tidaknya `email_verified` (yang menentukan apakah
 * penautan akun admin akan ditolak pada login pertama). Dokumen penemuan
 * penyedia menjawab nama-nama klaimnya tetapi tidak bentuk nilainya, dan
 * `claims_supported` menurut spesifikasi OIDC hanya petunjuk, bukan jaminan
 * tertutup. Satu payload `userinfo` sungguhan menjawab ketiganya sekaligus.
 *
 * MENGAPA BENTUK, BUKAN ISI. Payload itu data pribadi seorang ASN. Yang
 * dibutuhkan untuk menjawab ketiga pertanyaan di atas adalah STRUKTURNYA, dan
 * struktur dapat dilaporkan tanpa satu pun nilainya. Menyalin payload apa
 * adanya ke log akan menggandakan data pribadi ke tempat yang tak punya masa
 * retensi, tak terenkripsi, dan biasanya terbaca lebih banyak orang daripada
 * basis datanya sendiri.
 *
 * YANG DIIZINKAN KELUAR: nama klaim, tipe nilainya, panjang string, jumlah
 * unsur larik, nama kunci objek, dan nilai boolean. Boolean dikecualikan dengan
 * sengaja: satu bit tak dapat mengenali seseorang, dan justru nilai
 * `email_verified` itulah salah satu yang dicari.
 *
 * YANG TIDAK PERNAH KELUAR: isi string, nilai angka, dan isi unsur larik.
 * Angka ikut dirahasiakan walau tampak tak berbahaya, sebab angka pada payload
 * identitas lazimnya justru pengenal (id pegawai, id tenant).
 *
 * SISA RISIKO YANG DISADARI: nama kunci ikut keluar, jadi penyedia yang
 * memakai nilai sebagai nama kunci (mis. `{"budi@contoh.go.id": 1}`) akan
 * membocorkannya. Bentuk itu tak lazim pada payload OIDC dan kuncinya berasal
 * dari skema penyedia, bukan dari masukan pengguna, jadi dibiarkan apa adanya
 * dan dicatat di sini alih-alih dijaga dengan kode yang menebak-nebak.
 */

/**
 * Klaim yang jawabannya sedang dicari. Ketiadaannya dilaporkan TERSURAT sebagai
 * `TIDAK ADA`, bukan dihilangkan dari keluaran: "tidak disebut" dan "tidak ada"
 * adalah dua keadaan berbeda, dan justru keadaan kedua yang menjadi jawaban.
 *
 * Daftar ini mengikuti `claims_supported` penyedia (diukur 9 September 2026)
 * ditambah `email_verified` yang JUSTRU tidak dicantumkannya.
 */
const KLAIM_YANG_DICARI: readonly string[] = [
  'sub',
  'email',
  'email_verified',
  'name',
  'preferred_username',
  'nickname',
  'groups',
  'role',
];

// Batas supaya satu payload tak wajar tak dapat membanjiri log. Bukan
// pengamanan, hanya kewarasan ukuran.
const BATAS_KUNCI = 12;
const BATAS_KEDALAMAN = 2;

function bentukNilai(nilai: unknown, kedalaman = 0): string {
  if (nilai === undefined) return 'TIDAK ADA';
  if (nilai === null) return 'null';
  if (typeof nilai === 'boolean') return `boolean(${nilai})`;
  if (typeof nilai === 'number') return 'number';
  if (typeof nilai === 'string') return `string(${nilai.length})`;

  if (Array.isArray(nilai)) {
    if (nilai.length === 0) return 'array[0]';
    // Unsur PERTAMA saja yang diperiksa. Larik klaim OIDC homogen, dan
    // memeriksa seluruhnya hanya memperbesar keluaran tanpa menambah jawaban.
    const unsur = kedalaman >= BATAS_KEDALAMAN ? '?' : bentukNilai(nilai[0], kedalaman + 1);
    return `array[${nilai.length}] of ${unsur}`;
  }

  if (typeof nilai === 'object') {
    if (kedalaman >= BATAS_KEDALAMAN) return 'object{...}';
    const kunci = Object.keys(nilai as Record<string, unknown>);
    const dipakai = kunci.slice(0, BATAS_KUNCI);
    const sisa = kunci.length - dipakai.length;
    return `object{${dipakai.join(',')}${sisa > 0 ? `,+${sisa}` : ''}}`;
  }

  // function, symbol, bigint. Tak pernah muncul pada JSON, tetapi tipenya
  // dilaporkan alih-alih dibuang diam-diam.
  return typeof nilai;
}

/**
 * Satu baris yang menggambarkan struktur payload klaim.
 *
 * Urutannya TETAP: klaim yang dicari lebih dahulu menurut urutan daftarnya,
 * lalu sisanya menurut abjad. Keluaran yang urutannya tetap dapat dibandingkan
 * antar login dan antar lingkungan, dan membuat ujinya tak bergantung pada
 * urutan kunci milik penyedia.
 *
 * @example
 *   sub=string(36) email=string(24) email_verified=TIDAK ADA name=string(12)
 *   preferred_username=string(8) nickname=TIDAK ADA groups=array[2] of string
 *   role=string(5)
 */
export function bentukKlaim(klaim: Record<string, unknown> | null | undefined): string {
  const sumber =
    klaim && typeof klaim === 'object' && !Array.isArray(klaim)
      ? (klaim as Record<string, unknown>)
      : {};

  const dicari = KLAIM_YANG_DICARI.map((nama) => `${nama}=${bentukNilai(sumber[nama])}`);
  const tambahan = Object.keys(sumber)
    .filter((nama) => !KLAIM_YANG_DICARI.includes(nama))
    .sort()
    .map((nama) => `${nama}=${bentukNilai(sumber[nama])}`);

  return [...dicari, ...tambahan].join(' ');
}
