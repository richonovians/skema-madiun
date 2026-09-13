/**
 * Kelompokkan notifikasi menurut kapan ia datang (13 September 2026, tahap 3).
 *
 * Halaman riwayat gunanya menelusuri daftar panjang, tapi tanpa pemisah ia
 * mengalir tanpa pegangan: pada potret nyata "5 jam lalu", "Kemarin", "3 hari
 * lalu", dan "18 Agu 2026" berderet tanpa satu pun batas.
 *
 * BATASNYA TANGGAL KALENDER, bukan selisih jam. Notifikasi pukul 00.30 hari ini
 * berjarak kurang dari 24 jam dari pukul 23.30 kemarin, tetapi keduanya bukan
 * hari yang sama bagi pembacanya -- dan itulah satu-satunya arti yang dipakai
 * orang saat membaca kata "kemarin".
 *
 * Urutan TIDAK diubah. Backend sudah mengirim terbaru dulu; mengurutkan ulang
 * di sini akan membuat halaman kedua berurutan lain dari halaman pertama.
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
  if (!t || Number.isNaN(t.getTime())) {
    // Tak dibuang diam-diam: baris yang tanggalnya rusak tetap harus terlihat,
    // sebab isinya mungkin justru yang sedang dicari.
    return { kunci: 'tanpa-tanggal', label: 'Tanpa tanggal' };
  }

  const selisihHari = Math.round((awalHari(sekarang) - awalHari(t)) / SEHARI);

  // `<= 0` mencakup masa depan: jam server yang melenceng beberapa menit tak
  // boleh melahirkan kelompok "besok".
  if (selisihHari <= 0) return { kunci: 'hari-ini', label: 'Hari ini' };
  if (selisihHari === 1) return { kunci: 'kemarin', label: 'Kemarin' };
  if (selisihHari < 7) return { kunci: 'minggu-ini', label: '7 hari terakhir' };

  return {
    kunci: `bulan-${t.getFullYear()}-${t.getMonth()}`,
    label: `${NAMA_BULAN[t.getMonth()]} ${t.getFullYear()}`,
  };
}

export function kelompokkanNotifikasi(notifications) {
  const sekarang = new Date(Date.now());
  const kelompok = [];
  const indeks = new Map();

  for (const n of notifications ?? []) {
    const { kunci, label } = golongan(n.createdAt, sekarang);
    let wadah = indeks.get(kunci);
    if (!wadah) {
      wadah = { kunci, label, items: [] };
      indeks.set(kunci, wadah);
      kelompok.push(wadah);
    }
    wadah.items.push(n);
  }

  return kelompok;
}
