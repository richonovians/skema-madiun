import React from 'react';

/**
 * Bagian bawah kartu "Top Kategori Pengaduan" di halaman statistik PUBLIK.
 *
 * Menggantikan sebaran status per-kasus (Baru/Diproses/Selesai/Ditolak) yang
 * sempat berdiri di sini pada 7 Oktober 2026. Alasan penggantiannya keputusan
 * pemilik produk, bukan keamanan: "Ditolak 2" di halaman publik terbaca sebagai
 * pemerintah menolak warga, padahal bisa berarti duplikat atau spam.
 * `GET /statistics` sendiri berdekorator `@Public()` tanpa autentikasi, jadi
 * angka itu memang sudah terbuka lewat API dan TETAP terbuka sesudah perubahan
 * ini -- yang berubah hanya apa yang dipajang.
 *
 * Ketiga angka di sini agregat seluruhnya dan ditandai D3 (publik menurut
 * rancangan) di statistics.entity.ts. Semuanya ikut dalam permintaan yang sama,
 * jadi tak ada panggilan jaringan tambahan.
 */

/** 3.4 -> "3,4". Koma desimal, ejaan Indonesia. */
function satuDesimal(angka) {
  return (Math.round(angka * 10) / 10).toString().replace('.', ',');
}

export default function EfektivitasPengaduan({ summary }) {
  const { completionRate, avgSlaDays, totalComplaints } = summary ?? {};

  // Keduanya nullable di statistics.entity.ts: tanpa satu pun pengaduan tak ada
  // persentase maupun rata-rata hari. Menggambar "0%" di sana adalah karangan,
  // bukan nol yang terukur.
  if (completionRate == null && avgSlaDays == null) return null;

  const persen = completionRate == null ? null : Math.round(completionRate);

  return (
    <div className="border-t border-border pt-6">
      <h4 className="mb-4 text-sm font-bold text-text-primary">Efektivitas Penyelesaian Aduan</h4>

      {/* Persentasenya dicetak besar supaya bagian ini punya satu angka utama.
          Pada ukuran yang sama dengan nilai kategori di atasnya, bilah hijau
          ini terbaca sebagai bilah KEEMPAT dari daftar yang sama, bukan bagian
          baru. Warnanya sengaja netral, bukan hijau: hijau pada angka serendah
          46% membaca seperti pujian. Hijau hanya pada isian bilahnya, yang
          menandai "selesai", bukan menilai. */}
      {persen !== null && (
        <div className="mb-5">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
            <span className="text-3xl font-extrabold leading-none text-text-primary">{persen}%</span>
            <span className="text-sm font-medium text-text-secondary">aduan selesai ditangani</span>
          </div>
          <div
            role="progressbar"
            aria-label="Aduan selesai ditangani"
            aria-valuenow={persen}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${persen}%` }}
            />
          </div>
        </div>
      )}

      {/* Dua kotak statistik, bukan satu baris teks. Baris teks menempelkan
          "33,8 hari" pada "13 aduan masuk" sampai keduanya nyaris menyatu, dan
          hanya salah satunya punya label.

          `flex-col-reverse` menaikkan angkanya ke atas label TANPA membalik
          urutan DOM: spesifikasi HTML mengharuskan `dt` mendahului `dd`-nya,
          dan menukar keduanya di sumber akan membuat pasangan ini tak terbaca
          pembaca layar. Jaraknya lewat `gap`, bukan margin, sebab margin tetap
          melekat pada sisi aslinya saat sumbunya dibalik.

          Penyebutnya wajib ada: 46% dari 13 berbeda artinya dari 46% dari 3. */}
      <dl className="grid grid-cols-2 gap-3">
        {avgSlaDays != null && (
          <div className="flex flex-col-reverse gap-0.5 rounded-xl bg-surface-container-low p-3">
            <dt className="text-xs font-medium text-text-secondary">Rata-rata penyelesaian</dt>
            <dd className="text-lg font-bold leading-tight text-text-primary">
              {satuDesimal(avgSlaDays)} hari
            </dd>
          </div>
        )}
        {totalComplaints != null && (
          <div className="flex flex-col-reverse gap-0.5 rounded-xl bg-surface-container-low p-3">
            <dt className="text-xs font-medium text-text-secondary">Aduan masuk</dt>
            <dd className="text-lg font-bold leading-tight text-text-primary">{totalComplaints}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
