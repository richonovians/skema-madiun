/**
 * SINGGAHAN HITUNGAN IKM: kunci, TTL, dan alasannya -- satu tempat.
 *
 * Lahir 8 Oktober 2026 di dalam `ikm.service.ts`, dipindah ke berkas sendiri
 * 9 Oktober 2026 ketika jalur A dipilih dan kuncinya mulai dipakai DUA modul:
 * IKM menuliskannya, `ResponsesService` membatalkannya begitu satu jawaban
 * masuk. Menyalin awalannya ke modul kedua berarti kelak salah satu diganti
 * dan yang lain tertinggal -- gejalanya angka basi, yang tak akan terbaca
 * sebagai kunci yang tak cocok.
 *
 * Pemilik penamaannya tetap modul IKM; `ResponsesService` hanya memanggil
 * `kunciSinggahanIkm`, tanpa pernah menyebut awalannya sendiri.
 *
 * DIPASANG PADA HITUNGANNYA, BUKAN PADA `getResults`. `hitungNilaiRataRata`
 * dan `hitungSebaranSkor` di `ikm.service.ts` adalah fungsi murni dari
 * `surveyId` dan tak pernah menyentuh `CurrentUser`, sehingga singgahannya
 * tak dapat membocorkan hasil satu OPD ke OPD lain. `getResults` memeriksa
 * `assertOpdAccess` dan karena itu TIDAK boleh disinggahkan secara utuh.
 *
 * YANG DITUTUPINYA: `getOpdDashboard` memanggil `getResults` untuk survei
 * terbaru pada setiap pemuatan, tanpa singgahan apa pun. `hitungStatistik`
 * sudah terlindung singgahan `statistik-publik` 60 detik, jadi bukan ia yang
 * menjadi alasan perubahan ini. Terukur hidup: 26,6 ms dari basis data
 * menjadi 1,4 ms dari Redis.
 *
 * DIBATALKAN DI JALUR TULIS, bukan dibiarkan kedaluwarsa sendiri (9 Oktober
 * 2026, pilihan pengguna: jalur A). Rancangan pertama menyandarkan kesegaran
 * pada TTL 60 detik saja, dengan alasan antarmuka `PenyimpanSinggahan` belum
 * punya cara membatalkan satu kunci. Itu TERBUKTI SALAH oleh e2e, bukan oleh
 * telaah: `ikm.e2e-spec.ts` memanggil `/results` saat survei belum
 * berresponden -- menyinggahkan sebaran KOSONG -- lalu dua jawaban masuk dan
 * `total` tetap 0. Nama ujinya `live-compute`, jadi harapan produknya
 * seketika, dan `/surveys/:id/results` adalah layar kerja Admin OPD, bukan
 * ringkasan publik yang boleh tertinggal.
 *
 * Rata-ratanya tidak ikut memerah hanya karena kebetulan: nilai `null` memang
 * tak pernah disimpan, jadi survei kosong tak menyinggahkan apa pun. Begitu
 * ada satu jawaban, ia basi juga -- karena itu `kunciSinggahanIkm`
 * mengembalikan KEDUA kunci, bukan hanya yang tertangkap uji.
 *
 * Pembatalannya dipanggil SESUDAH baris jawaban tersimpan, pada kedua jalur
 * tulis (bersesi dan publik). Urutan itu menentukan benar-salahnya; lihat
 * `ResponsesService.batalkanSinggahanIkm`.
 */

/** Rata-rata nilai satu survei. Lihat `IkmService.hitungNilaiRataRata`. */
export const AWALAN_RATA = 'ikm-rata:';

/** Sebaran skor per pertanyaan. Lihat `IkmService.hitungSebaranSkor`. */
export const AWALAN_SEBARAN = 'ikm-sebaran:';

/**
 * Hasil IKM satu survei (NRR per unsur, nilai, mutu). Lihat
 * `IkmService.computeResult`.
 *
 * MUATANNYA TANPA `periode`: medan itu berasal dari objek `Survey` yang
 * dikirimkan, bukan dari basis data, dan ia dapat disunting. Menyinggahkannya
 * membuat survei yang periodenya diperbaiki tetap melaporkan periode lama.
 */
export const AWALAN_HASIL = 'ikm-hasil:';

/**
 * TTL 60 detik, sama dengan statistik publik.
 *
 * Sejak pembatalan di jalur tulis ada, TTL bukan lagi penjaga kesegaran
 * melainkan JARING PENGAMAN: ia membatasi umur kunci yang pembatalannya gagal
 * (Redis kedip) atau yang basi karena jalan tulis lain yang belum terpikirkan.
 */
export const TTL_SINGGAHAN_DETIK = 60;

/**
 * Seluruh kunci singgahan milik satu survei.
 *
 * Mengembalikan daftar, bukan satu kunci, supaya penambahan hitungan
 * tersinggahkan berikutnya otomatis ikut dibatalkan tanpa menyentuh jalur
 * tulis -- tempat yang justru paling mudah terlupakan.
 */
export function kunciSinggahanIkm(surveyId: number): string[] {
  return [
    `${AWALAN_RATA}${surveyId}`,
    `${AWALAN_SEBARAN}${surveyId}`,
    `${AWALAN_HASIL}${surveyId}`,
    // Dashboard ikut hangus: jawaban baru mengubah survei AKTIF yang dihitung
    // live di sana. Ia tak berkunci per survei, jadi yang masuk daftar ini
    // adalah token generasinya. Inilah titik perluasan yang dijanjikan docblock
    // di atas, dipakai pertama kali 13 Oktober 2026.
    KUNCI_GENERASI_DASHBOARD,
  ];
}

/** Rekapitulasi IKM lintas OPD. Lihat `IkmService.getDashboard`. */
export const AWALAN_DASHBOARD = 'ikm-dashboard:';

/**
 * Kunci singgahan rekapitulasi IKM, SATU per kombinasi penyaring.
 *
 * `encodeURIComponent`, bukan penggabungan apa adanya. Tanpa itu
 * `periode='a:b'` tanpa jenis layanan bertabrakan dengan `periode='a'` +
 * `jenisLayanan='b'`, dan satu pemakai melihat hasil saringan pemakai lain --
 * cacat kebenaran, bukan cacat kecepatan. Keduanya nilai bebas dari kueri
 * (`DashboardIkmQueryDto` hanya menuntut string ber-panjang terbatas), jadi
 * tabrakannya bukan hipotetis.
 */
/**
 * Token generasi singgahan dashboard.
 *
 * MENGAPA GENERASI, bukan daftar kunci. Kunci dashboard bergantung pada
 * parameter kueri (`periode`, `jenisLayanan`), jadi ia tak dapat diturunkan
 * dari id survei yang berubah, dan antarmuka `PenyimpanSinggahan` sengaja tak
 * punya penghapusan berpola. Dengan generasi di dalam kunci, jalur tulis cukup
 * MENGHAPUS SATU kunci ini: seluruh kunci lama seketika menjadi tanpa induk --
 * tak ada yang akan membacanya lagi -- lalu mati sendiri lewat TTL-nya.
 *
 * Ditemukan e2e 13 Oktober 2026: `role-journeys.e2e-spec.ts` menutup survei
 * lalu menuntut survei itu muncul di `GET /dashboard/ikm`. Tanpa pembatalan ia
 * tidak muncul sampai 60 detik lewat, dan uji itu memaku harapan produk yang
 * nyata.
 */
export const KUNCI_GENERASI_DASHBOARD = 'ikm-dashboard-gen';

/**
 * Umur token generasi. Jauh lebih panjang daripada TTL muatannya: ia hanya
 * sebuah nama, dan nama yang hangus tiap menit membuat seluruh singgahan
 * dashboard hangus bersamanya tanpa ada yang berubah di basis data.
 */
export const TTL_GENERASI_DETIK = 24 * 60 * 60;

export function kunciSinggahanDashboardIkm(
  generasi: string,
  periode?: string,
  jenisLayanan?: string,
): string {
  const bagian = [generasi, periode ?? '', jenisLayanan ?? ''].map((n) => encodeURIComponent(n));
  return `${AWALAN_DASHBOARD}${bagian.join(':')}`;
}

/**
 * Kunci penahan stampede untuk rekapitulasi dashboard, dalam proses.
 *
 * TANPA GENERASI, dan itu keputusan yang terukur. `generasiDashboard` sendiri
 * membaca singgahan, sehingga sepuluh permintaan yang tiba ke singgahan KOSONG
 * menerbitkan sepuluh generasi berbeda -- tepat pada keadaan yang hendak
 * diredam. Memakai `kunciSinggahanDashboardIkm` yang sudah bergenerasi berarti
 * kesepuluhnya berkunci berbeda dan penahannya tak menahan apa pun. Diukur
 * sebelum penahannya ada: 10 generasi untuk 10 permintaan serentak.
 *
 * Ruang kuncinya BUKAN ruang kunci Redis -- ia hidup di satu `Map` dalam
 * proses, jadi tak ada risiko bertabrakan dengan kunci singgahan mana pun.
 * Pengkodean nilainya tetap dipakai dengan alasan yang sama seperti kunci
 * singgahan: dua penyaring yang bertukar tempat tak boleh bertemu di kunci yang
 * sama.
 */
export function kunciSekaliJalanDashboardIkm(periode?: string, jenisLayanan?: string): string {
  return [periode ?? '', jenisLayanan ?? ''].map((n) => encodeURIComponent(n)).join(':');
}
