/**
 * Pemisah tanggal pada percakapan pengaduan (21 September 2026, permintaan
 * pengguna).
 *
 * Gelembung chat hanya menampilkan jam. Pada tiket yang menggantung
 * berhari-hari, "08.14" hari ini berdempetan dengan "16.02" tiga minggu lalu
 * tanpa satu pun tanda bahwa di antaranya ada jeda -- pembacanya tak punya
 * cara mengetahui balasan mana yang baru.
 *
 * BATASNYA TANGGAL KALENDER, BUKAN SELISIH JAM. Pesan pukul 00.01 hari ini
 * berjarak dua menit dari pukul 23.59 kemarin, tetapi bagi pembacanya itu dua
 * hari yang berbeda -- dan itulah satu-satunya arti yang dipakai orang saat
 * membaca kata "kemarin". Alasan yang sama sudah dicatat di
 * notifications/adapters/notificationKelompok.js, yang memecahkan hal ini
 * lebih dulu untuk halaman riwayat notifikasi.
 *
 * KENAPA TIDAK MEMAKAI ULANG BERKAS ITU: golongannya ("7 hari terakhir",
 * "Agustus 2026") sengaja menyatukan banyak hari menjadi satu pita, sebab
 * halaman riwayat gunanya menelusuri daftar panjang. Percakapan membutuhkan
 * kebalikannya -- satu pemisah untuk setiap tanggal.
 *
 * KENAPA MENGELOMPOKKAN, BUKAN MENYISIPKAN: `chatHistory` yang sama dipakai
 * ComplaintExportMenu untuk menyusun baris PDF dan Excel. Menyisipkan pemisah
 * ke dalam lariknya akan membuat setiap ekspor tiket memuat baris hantu
 * berbunyi "Kemarin" di tengah percakapan.
 */
const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** Tengah malam pada tanggal kalender yang sama, waktu lokal peramban. */
const awalHari = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const SEHARI = 86_400_000;

function golongan(createdAt, sekarang) {
  const t = createdAt ? new Date(createdAt) : null;
  if (!t || Number.isNaN(t.getTime())) return null;

  const selisihHari = Math.round((awalHari(sekarang) - awalHari(t)) / SEHARI);

  // `<= 0` mencakup masa depan: jam server yang melenceng beberapa menit tak
  // boleh melahirkan pemisah "besok" di dalam percakapan yang sudah terjadi.
  const label =
    selisihHari <= 0
      ? 'Hari ini'
      : selisihHari === 1
        ? 'Kemarin'
        : `${t.getDate()} ${NAMA_BULAN[t.getMonth()]} ${t.getFullYear()}`;

  return { kunci: `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`, label };
}

/**
 * @param {Array<{createdAt?: string|null}>} messages urutannya dipertahankan
 *   apa adanya; percakapan sudah berurutan dari yang terlama.
 * @param {Date} [sekarang] disuntikkan supaya ujinya tak bergantung pada jam
 *   mesin yang menjalankannya.
 * @returns {Array<{kunci: string, label: string|null, items: Array}>} `label`
 *   bernilai null berarti kelompoknya tak punya pemisah untuk digambar.
 */
export function kelompokkanPesanPerTanggal(messages, sekarang = new Date()) {
  const kelompok = [];

  for (const pesan of messages ?? []) {
    const gol = golongan(pesan?.createdAt, sekarang);

    // Tanggal yang tak terbaca menempel pada kelompok yang sedang berjalan.
    // Pita "Tanpa tanggal" di tengah percakapan lebih membingungkan daripada
    // menolong, dan membuang pesannya jauh lebih buruk lagi -- isinya justru
    // mungkin yang sedang dicari.
    if (!gol) {
      if (kelompok.length === 0) {
        kelompok.push({ kunci: 'tanpa-tanggal', label: null, items: [] });
      }
      kelompok[kelompok.length - 1].items.push(pesan);
      continue;
    }

    const terakhir = kelompok[kelompok.length - 1];
    if (!terakhir || terakhir.kunci !== gol.kunci) {
      kelompok.push({ kunci: gol.kunci, label: gol.label, items: [pesan] });
      continue;
    }
    terakhir.items.push(pesan);
  }

  return kelompok;
}
