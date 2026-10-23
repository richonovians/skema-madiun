/**
 * Aturan lampiran pengaduan, satu tempat untuk ketiga unggahannya.
 *
 * Diangkat dari `components/ui/FileDropzone.jsx` pada 23 Oktober 2026, ketika
 * separuh BUG-007 yang tersisa dikerjakan. Sebelum itu aturannya hidup di
 * dalam satu komponen, dan dua unggahan lain -- `AdminResolutionWorkspace.jsx`
 * serta `ChatReplyForm.jsx` -- tak memeriksa apa pun. Menyalin aturannya ke
 * sana akan menjadikannya TIGA salinan batas backend yang tak ada
 * penyinkronnya.
 *
 * Pemakainya tiga, dan dua bentuk: `saringBerkas` untuk jalur berlarik
 * (formulir pengaduan warga, sampai lima berkas) dan `periksaSatuBerkas` untuk
 * jalur satu berkas (kedua panel percakapan). Keduanya memakai aturan yang
 * sama persis, bukan dua aturan yang mirip.
 *
 * ====================================================================
 * INI SALINAN BATAS BACKEND, BUKAN SUMBERNYA.
 *
 * Sumbernya `attachment.util.ts` (daftar izin + pemeriksaan angka ajaib),
 * `complaints.constants.ts:32` (5 MB), dan `complaints.controller.ts:66`
 * (`files: 5`). Bila daftar di sana berubah, daftar di sini harus menyusul;
 * tak ada yang menyinkronkannya otomatis.
 *
 * DAN INI BUKAN LAPISAN KEAMANAN. Backend memeriksa ANGKA AJAIB isi berkas,
 * bukan `Content-Type` yang dikirim peramban, sehingga `.exe` bernama `.png`
 * tetap tertolak di sana. Yang dikerjakan berkas ini hanya menghemat waktu dan
 * kuota pengguna: tanpa ia, warga di ponsel berkuota terbatas mengunggah 6 MB
 * sampai tuntas lalu ditolak. Itulah BUG-007.
 * ====================================================================
 */

/*
 * TANPA PROTOTIPE, dan itu bukan kerapian (BUG-033, 23 Oktober 2026).
 *
 * Objek ini dipakai sebagai HIMPUNAN KEANGGOTAAN, lewat
 * `JENIS_DITERIMA[file.type]`. Pada objek literal biasa, pencarian kunci bukan
 * uji keanggotaan: ia ikut menemukan anggota `Object.prototype`. Terukur --
 * `JENIS_DITERIMA['constructor']` bernilai fungsi `Object` dan
 * `JENIS_DITERIMA['__proto__']` bernilai `Object.prototype`, keduanya truthy,
 * jadi berkas ber-`type` demikian LOLOS gerbang jenis.
 *
 * Hanya dua untai itu yang lolos, sebab konstruktor `File` membakukan `type`
 * ke huruf kecil: `'toString'` tersimpan sebagai `'tostring'`, yang bukan
 * anggota prototipe.
 *
 * `Object.create(null)` dipilih alih-alih menjaga satu tempat pemanggilan
 * dengan `Object.hasOwn`, sebab ia membetulkan SETIAP pencarian pada objek ini
 * -- termasuk yang ditulis pembaca berikutnya.
 */
const JENIS_DITERIMA = Object.assign(Object.create(null), {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/pdf': 'PDF',
});

/** Untuk atribut `accept`. Ia menyaring kotak dialog saja, BUKAN penjaga. */
export const JENIS_ACCEPT = Object.keys(JENIS_DITERIMA).join(',');

/** Untuk dibaca pengguna: "JPG, PNG, WEBP, PDF". */
export const LABEL_JENIS = Object.values(JENIS_DITERIMA).join(', ');

export const MAKS_BERKAS = 5;

/** Satu sumber untuk batas ukuran; `FileDropzone` mengambil baku propnya dari sini. */
export const BATAS_MB = 5;

/**
 * Ukuran untuk DIBACA pengguna, berkoma sebagai pemisah desimal -- kaidah
 * bahasa Indonesia, dan bahasa seluruh antarmuka ini.
 *
 * Satu pemformat dipakai SETIAP tempat yang menyebut ukuran, supaya tak ada
 * lagi dua angka yang mengaku satuan sama tetapi dicetak berbeda. Itulah akar
 * BUG-032.
 */
export function formatMb(mb) {
  return `${mb.toFixed(2).replace('.', ',')} MB`;
}

/**
 * Nama jenis untuk DIBACA pengguna, diambil dari akhiran namanya sendiri.
 *
 * Akhiran dipakai lebih dahulu daripada `file.type` justru karena akhiran
 * itulah yang pengguna lihat di pemilih berkas. Berkas tanpa akhiran jatuh ke
 * subtipe MIME-nya, dan yang tak punya keduanya disebut apa adanya.
 */
export function labelJenis(file) {
  const titik = file.name.lastIndexOf('.');
  if (titik > 0 && titik < file.name.length - 1) {
    return file.name.slice(titik + 1).toUpperCase();
  }
  const garis = (file.type || '').lastIndexOf('/');
  return garis >= 0 ? file.type.slice(garis + 1).toUpperCase() : 'tanpa akhiran';
}

/**
 * Satu-satunya tempat yang memutuskan berkas mana yang boleh masuk.
 *
 * Dipanggil DUA jalur pada formulir warga, dan itu intinya. Atribut `accept`
 * hanya menyaring kotak dialog pemilih berkas dan TIDAK BERLAKU bagi berkas
 * yang dijatuhkan, padahal zonanya mengiklankan seret-lepas tersurat.
 * Pemeriksaan yang hanya duduk di penangan `onChange` karena itu tak akan
 * pernah cukup.
 *
 * Yang sah tetap diterima walau ada yang ditolak dalam kumpulan yang sama:
 * menolak seluruhnya berarti warga kehilangan pilihan yang sudah benar dan
 * harus mengulang dari awal.
 *
 * @param {File[]} kandidat berkas yang baru dipilih atau dijatuhkan
 * @param {File[]} sudahAda yang sudah terlampir, untuk menghitung batas jumlah
 * @param {number} maxSizeMB batas ukuran per berkas
 * @returns {{diterima: File[], ditolak: Array<{nama: string, alasan: string}>}}
 */
export function saringBerkas(kandidat, sudahAda, maxSizeMB = BATAS_MB) {
  const batasBytes = maxSizeMB * 1024 * 1024;
  const diterima = [];
  const ditolak = [];

  for (const file of kandidat) {
    if (!JENIS_DITERIMA[file.type]) {
      ditolak.push({
        nama: file.name,
        alasan: `jenis ${labelJenis(file)} tidak diterima, hanya ${LABEL_JENIS}`,
      });
      continue;
    }
    if (file.size > batasBytes) {
      // DIBULATKAN KE ATAS, dan itu bukan kerapian (BUG-032, 23 Oktober 2026).
      //
      // `toFixed(2)` membulatkan ke yang TERDEKAT, sehingga berkas yang hanya
      // sedikit melewati batas tercetak "5.00 MB" -- lalu kalimatnya
      // menyatakan bahwa 5.00 MB melebihi batas 5MB. Penolakannya benar;
      // kalimatnya tak dapat dipercaya pembacanya.
      //
      // Jangkauannya luas, bukan sudut yang jarang: batasnya 5 MiB sementara
      // foto ponsel lazimnya 4-6 MB, jadi inilah justru golongan berkas yang
      // paling sering ditolak.
      //
      // Pembulatan ke atas dipakai HANYA di sini, bukan di daftar berkas
      // terpilih, dan bedanya disengaja: kalimat ini membuat PERBANDINGAN,
      // jadi ia tak boleh membulatkan turun ke arah batasnya; daftar itu
      // sekadar melaporkan.
      const mbNaik = Math.ceil((file.size / 1024 / 1024) * 100) / 100;
      ditolak.push({
        nama: file.name,
        alasan: `ukurannya ${formatMb(mbNaik)}, melebihi batas ${formatMb(maxSizeMB)}`,
      });
      continue;
    }
    if (sudahAda.length + diterima.length >= MAKS_BERKAS) {
      ditolak.push({ nama: file.name, alasan: `melebihi batas ${MAKS_BERKAS} berkas` });
      continue;
    }
    diterima.push(file);
  }

  return { diterima, ditolak };
}

/**
 * Jalur SATU berkas, untuk kedua panel percakapan.
 *
 * Pembungkus tipis di atas `saringBerkas`, bukan aturan kedua yang mirip.
 * Keduanya harus menolak hal yang sama persis; menulisnya dua kali berarti
 * suatu hari keduanya berbeda tanpa ada yang memerah.
 *
 * Batas JUMLAH tak berlaku di sini -- kedua panel itu menerima satu berkas,
 * bukan larik -- jadi `sudahAda` sengaja kosong.
 *
 * @param {File} file
 * @param {number} [maxSizeMB]
 * @returns {{nama: string, alasan: string} | null} null berarti berkasnya sah
 */
export function periksaSatuBerkas(file, maxSizeMB = BATAS_MB) {
  const { ditolak } = saringBerkas([file], [], maxSizeMB);
  return ditolak[0] ?? null;
}
