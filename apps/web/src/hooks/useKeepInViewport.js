'use client';

import { useCallback, useEffect } from 'react';

/** Sisa ruang yang disisakan di tepi layar supaya panel tak menempel mentah. */
const MARGIN = 8;

/**
 * Ruang di bawah pemicu yang masih dianggap LAYAK untuk menampung panel
 * (dengan gulir sendiri). 120px = kira-kira 2,5 baris pilihan setinggi 44px:
 * cukup untuk mengenali daftarnya dan menggulirnya, jadi tak ada alasan
 * membalik panel ke atas selama ruang sebanyak ini masih ada. Lihat catatan
 * "SUMBU VERTIKAL" di bawah untuk sebab angka ini dipakai.
 */
const RUANG_LAYAK = 120;

/**
 * Menggeser panel melayang (dropdown, menu, popover) secara HORIZONTAL supaya
 * tidak pernah keluar tepi layar.
 *
 * MASALAH YANG DIPECAHKAN (1 September 2026, ditemukan lewat audit Android).
 * Tujuh panel di proyek ini dipasang dengan pola `absolute right-0` + lebar
 * TETAP. Pola itu menyejajarkan tepi kanan panel dengan tepi kanan PEMICUNYA --
 * bukan dengan tepi layar. Selama pemicunya benar-benar berada di ujung kanan
 * dan layarnya lebar, hasilnya kebetulan benar. Begitu salah satu syarat itu
 * hilang, panel menjorok keluar tepi KIRI dan isinya betul-betul tak
 * terjangkau -- tak ada yang bisa digulir ke kiri di luar viewport.
 *
 * Dua keadaan nyata yang terukur:
 *   - Bel notifikasi. Ia BUKAN elemen paling kanan (avatar profil ada di
 *     kanannya), jadi tepi kanan panel sudah ~44px dari tepi layar. Panelnya
 *     300px, sementara Android terumum hanya 360px: terukur `kiri=-60`, yakni
 *     60px kolom kiri panel -- termasuk titik penanda "belum dibaca" -- hilang.
 *   - Menu ekspor di kepala detail pengaduan. Kepalanya membungkus di layar
 *     sempit sehingga tombolnya turun ke kiri; terukur `kiri=-92` dari lebar
 *     panel 192px, alias hampir separuh menu lenyap.
 *
 * KENAPA BUKAN CSS SAJA. Membatasi lebar (`max-w-[calc(100vw-1.5rem)]`) hanya
 * mencegah panel lebih LEBAR dari layar; ia tak menggeser panel yang tepi
 * kanannya sendiri sudah jauh dari kanan layar, karena `right-0` tetap
 * mengikat panel ke pemicunya. Menjadikan panel `fixed` selebar layar di
 * ponsel mengorbankan penambatan vertikal ke pemicu dan menuntut tinggi bilah
 * atas dihardcode -- persis jenis angka yang sudah pernah rusak di proyek ini.
 * `position-try-fallbacks` CSS memang tepat guna, tapi baru ada di Chromium;
 * pengguna meminta seluruh perangkat, jadi iOS tak boleh ditinggal.
 *
 * KENAPA `translate`, BUKAN `transform`. Keduanya properti terpisah dan saling
 * menumpuk, jadi pergeseran di sini tak akan bertabrakan bila nanti ada
 * animasi masuk berbasis `transform` (`zoom-in`, `slide-in`) dipasang pada
 * panel yang sama. Menulis `transform` di sini berarti animasi itu menimpa
 * pergeseran kita, atau sebaliknya -- bug yang sulit dilacak.
 *
 * Pergeseran diukur ulang saat layar berubah ukuran DAN saat halaman digulir,
 * sebab panel yang menambat pada pemicu ikut bergerak bersama halaman.
 *
 * @param {{current: HTMLElement|null}} ref  panel yang hendak dijaga
 * @param {boolean} isOpen                   hanya bekerja selagi panel terbuka
 */
export default function useKeepInViewport(ref, isOpen) {
  const reposition = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // Dinolkan lebih dulu supaya yang terukur adalah posisi ASLI panel, bukan
    // posisi hasil pergeseran sebelumnya -- kalau tidak, setiap pengukuran
    // menumpuk di atas yang lama dan panel merayap menjauh.
    /**
     * TRANSISI DIMATIKAN SELAMA MENGUKUR & MENERAPKAN.
     *
     * Ini bukan kehati-hatian berlebih, melainkan perbaikan cacat yang terukur:
     * beberapa panel membawa kelas `transition-all duration-200`, dan
     * `transition-all` IKUT menganimasikan `translate` -- properti yang dipakai
     * kait ini. Akibatnya, saat pergeseran dinolkan lalu diukur ulang pada
     * baris di bawah, yang terbaca adalah posisi DI TENGAH transisi, bukan
     * posisi asli panel. Pergeseran berikutnya lalu dihitung dari angka yang
     * salah: panel notifikasi terukur mendarat di `kiri=-7` alih-alih `kiri=8`,
     * yakni 15px masih keluar layar, padahal kaitnya "sudah bekerja".
     *
     * Mematikan transisi juga benar dari sisi rasa: penempatan panel harus
     * seketika. Panel yang membuka lalu MELUNCUR ke samping terlihat seperti
     * salah posisi yang sedang dibetulkan -- dan memang itulah yang terjadi.
     *
     * Dipulihkan pada bingkai berikutnya, sesudah nilai barunya tercatat, agar
     * transisi yang memang dirancang komponennya tetap hidup.
     */
    const transisiSemula = el.style.transition;
    el.style.transition = 'none';

    el.style.translate = '';
    el.style.top = '';
    el.style.bottom = '';
    el.style.marginTop = '';
    el.style.marginBottom = '';
    el.style.maxHeight = '';
    el.style.overflowY = '';
    el.style.overscrollBehavior = '';

    // Jarak asli panel dari pemicunya (`mt-2`/`mt-3`), dibaca SEBELUM kita
    // menyentuhnya -- dipakai lagi sebagai jarak bawah kalau panel dibalik,
    // supaya renggangnya tetap sama di kedua arah.
    const jarakAsli = parseFloat(getComputedStyle(el).marginTop) || 8;

    /**
     * DIUKUR DENGAN GEOMETRI TATA LETAK (`offsetLeft`/`offsetWidth`), BUKAN
     * `getBoundingClientRect()`.
     *
     * Sebabnya terukur, bukan teoretis. `getBoundingClientRect()` melaporkan
     * kotak SESUDAH transform, dan panel-panel ini membuka dengan animasi
     * `zoom-in-95` -- artinya selama ~200ms pertama kotaknya masih diperkecil
     * 5%. Pada panel selebar 300px yang bertitik-asal `origin-top-right`, tepi
     * kirinya terbaca 15px lebih ke dalam daripada tempatnya yang sebenarnya
     * (300 x 0.05 = 15). Kait ini lalu menghitung pergeseran 53px padahal yang
     * dibutuhkan 68px, dan panelnya berhenti di `kiri=-7`: masih keluar layar,
     * padahal seolah-olah sudah ditangani.
     *
     * `offsetLeft`/`offsetWidth` adalah nilai TATA LETAK: transform dan animasi
     * tidak menyentuhnya sama sekali, jadi angkanya benar bahkan di tengah
     * animasi. Ini juga membuat kait tak perlu menunggu animasi selesai --
     * penempatan tetap tepat pada bingkai pertama.
     *
     * `offsetLeft` diukur relatif terhadap `offsetParent`, jadi posisi
     * viewport-nya diperoleh dengan menambahkan tepi induk itu.
     */
    const induk = el.offsetParent;
    const kotakInduk = induk
      ? induk.getBoundingClientRect()
      : { left: 0, top: 0 };

    const alamiKiri = kotakInduk.left + el.offsetLeft;
    const alamiAtas = kotakInduk.top + el.offsetTop;
    const lebarPanel = el.offsetWidth;
    const tinggiPanel = el.offsetHeight;
    const alamiKanan = alamiKiri + lebarPanel;

    // `clientWidth`, bukan `window.innerWidth`: yang kedua ikut menghitung
    // lebar bilah gulir, sehingga panel tetap tertutup bilah itu di desktop.
    const viewportWidth = document.documentElement.clientWidth;

    let shift = 0;
    if (alamiKiri < MARGIN) {
      shift = MARGIN - alamiKiri;
    } else if (alamiKanan > viewportWidth - MARGIN) {
      shift = viewportWidth - MARGIN - alamiKanan;
    }

    el.style.translate = shift === 0 ? '' : `${Math.round(shift)}px`;

    // --- SUMBU VERTIKAL ---
    //
    // Percobaan pertama di sini HANYA membatasi tinggi, dengan alasan membalik
    // panel memindahkannya ke tempat yang tak diduga pengguna. Pengukuran
    // membuktikan alasan itu salah arah: pada 320x568, menu ekspor
    // /admin-opd/complaints tetap berakhir di `bawah=590` dari layar 568,
    // dan pembatasan tingginya TAK PERNAH aktif -- penjaga `ruang > 80`
    // mematikannya justru pada keadaan yang membutuhkannya, yaitu ketika
    // ruang bawah memang tinggal sedikit. Dan membatasi tinggi ke 60px bukan
    // perbaikan; itu menukar satu masalah dengan yang lebih buruk.
    //
    // Jadi urutannya sekarang: (1) kalau muat di bawah, jangan sentuh;
    // (2) kalau tidak muat DAN ruang bawah sudah tak layak dipakai, BALIK ke
    // atas -- perilaku yang biasa ditemui pengguna pada menu di dekat tepi
    // bawah layar; (3) selebihnya batasi tinggi dan beri gulir sendiri.
    //
    // MEMBALIK KE ATAS DIPERSEMPIT (1 September 2026, laporan pengguna
    // "dropdown tahun jangan muncul di atas" pada modal Buat Paket Survei).
    // Aturan sebelumnya membalik panel BEGITU ia tak muat seluruhnya di bawah,
    // padahal "tak muat seluruhnya" jauh dari "tak ada ruang". Terukur pada
    // 320x568: pemicu Tahun menyisakan ~113px di bawahnya -- cukup untuk
    // daftar bergulir -- tetapi panel 128px tetap dibalik ke atas, dan di
    // sana ia menutupi field "OPD Penyelenggara" tepat di atasnya. Bagi
    // pembaca itu tak terlihat seperti penyesuaian ruang, melainkan seperti
    // panel yang salah tempat.
    //
    // Sekarang membalik hanya terjadi bila ruang bawah benar-benar di bawah
    // RUANG_LAYAK. Selama masih layak, panel TETAP di bawah pemicunya dan
    // tingginya yang menyesuaikan -- arah buka jadi bisa diduga, dan yang
    // tertutup panel adalah ruang di bawahnya (footer), bukan isian yang baru
    // saja dilewati pengguna.
    const viewportHeight = document.documentElement.clientHeight;

    // `offsetParent` adalah pembungkus ber-`relative` yang memuat pemicunya --
    // itulah acuan yang benar untuk menakar ruang di ATAS panel, sebab panel
    // sendiri sudah berada di bawah pemicu saat diukur.
    const ruangBawah = viewportHeight - MARGIN - alamiAtas;
    const ruangAtas = (induk ? kotakInduk.top : alamiAtas) - MARGIN;

    const muatDiBawah = tinggiPanel <= ruangBawah;

    const bawahMasihLayak = ruangBawah >= RUANG_LAYAK;

    if (!muatDiBawah && !bawahMasihLayak && ruangAtas > ruangBawah && ruangAtas >= RUANG_LAYAK) {
      // BALIK KE ATAS. `top:auto` + `bottom:100%` bekerja untuk kedua gaya
      // penambatan yang dipakai di proyek ini -- panel ber-`top-full` maupun
      // yang hanya mengandalkan posisi statis + `mt-*`. `marginTop` dinolkan
      // supaya jarak lamanya tak lagi mendorong panel ke bawah.
      el.style.top = 'auto';
      el.style.bottom = '100%';
      el.style.marginTop = '0px';
      el.style.marginBottom = `${jarakAsli}px`;

      if (tinggiPanel > ruangAtas) {
        el.style.maxHeight = `${Math.round(ruangAtas)}px`;
        el.style.overflowY = 'auto';
        el.style.overscrollBehavior = 'contain';
      }
    } else if (!muatDiBawah) {
      // Jalan terakhir. Batas 96px disengaja: di bawah itu panelnya tak lagi
      // berguna sebagai daftar, dan lebih baik membiarkannya melewati tepi --
      // panel ini `absolute`, jadi masih ikut tergulir bersama halaman.
      const batas = Math.round(ruangBawah);
      if (batas >= 96) {
        el.style.maxHeight = `${batas}px`;
        el.style.overflowY = 'auto';
        // Memutus perembetan gulir ke halaman di belakang saat daftar sudah
        // mentok -- tanpa ini pengguna mengira panelnya yang bergerak.
        el.style.overscrollBehavior = 'contain';
      }
    }

    // Nilai baru sudah tercatat tanpa animasi; transisi milik komponen
    // dipulihkan pada bingkai berikutnya.
    requestAnimationFrame(() => {
      if (ref.current === el) el.style.transition = transisiSemula;
    });
  }, [ref]);

  useEffect(() => {
    if (!isOpen) return undefined;

    // Simpul DITANGKAP di sini, bukan dibaca ulang saat pembersihan. Pada saat
    // pembersihan berjalan React bisa sudah melepas ref-nya menjadi null,
    // sehingga gaya sebaris yang kita pasang tak pernah dibersihkan -- dan
    // yang tertinggal adalah `maxHeight` dari ukuran layar LAMA, yang akan
    // memotong panel saat ia dibuka lagi pada layar yang sudah berubah.
    const el = ref.current;

    reposition();

    window.addEventListener('resize', reposition);
    // `true` -- fase tangkap, supaya gulir di wadah dalam mana pun ikut
    // terdengar; peristiwa `scroll` tidak menggelembung dari elemen.
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      if (el) {
        el.style.translate = '';
        el.style.top = '';
        el.style.bottom = '';
        el.style.marginTop = '';
        el.style.marginBottom = '';
        el.style.maxHeight = '';
        el.style.overflowY = '';
        el.style.overscrollBehavior = '';
      }
    };
  }, [isOpen, reposition, ref]);
}
