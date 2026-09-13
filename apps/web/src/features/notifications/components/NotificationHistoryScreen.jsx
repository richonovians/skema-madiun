'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BellOff, Check, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import ErrorState from '@/components/ui/ErrorState';
import Pagination from '@/components/ui/Pagination';
import { useAsync } from '@/hooks/useAsync';
import { gayaJenisNotifikasi } from '@/features/notifications/adapters/notificationJenis';
import {
  RENTANG_BAWAAN,
  batasRentang,
} from '@/features/notifications/adapters/notificationRentang';
import NotificationFilterBar, {
  URUTAN_BAWAAN,
} from '@/features/notifications/components/NotificationFilterBar';
import { kelompokkanNotifikasi } from '@/features/notifications/adapters/notificationKelompok';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/services/notifications.api';

/**
 * Riwayat notifikasi lengkap (permintaan pengguna 13 September 2026: "melihat
 * notif yang sudah lama hingga terbaru").
 *
 * SATU implementasi untuk tiga area rute -- warga, Admin OPD, Admin Kabupaten --
 * mengikuti pola SurveyResponseDetailScreen.jsx. Yang membedakan hanya tautan
 * "kembali"; alamat tiap notifikasi datang dari backend, bukan disusun di sini,
 * jadi satu komponen ini melayani ketiganya tanpa tahu ia sedang di area mana.
 *
 * Paginasi & saringan dikerjakan BACKEND, bukan di klien. `GET /notifications`
 * sudah menerima `page`, `limit`, dan `unreadOnly` sejak awal, jadi memotong
 * daftar di klien berarti halaman ini hanya akan sepanjang satu permintaan --
 * persis batas yang membuat dropdown tak cukup.
 */
const LIMIT = 20;

/**
 * Pembatas lebar jadi BAWAAN KOMPONEN, bukan urusan tiap rute (13 September
 * 2026). Laporan pengguna: judul menempel tepi kiri dan tautan "Kembali ke
 * dasbor" terpotong. Sebabnya `(respondent)/layout.jsx` tak memberi padding
 * maupun pembatas lebar sama sekali -- ketiga halaman warga lain menyediakannya
 * sendiri lewat kelas yang sama, dan halaman ini tidak.
 *
 * Padding mendatar TETAP urusan rute: AdminLayout sudah memberinya (`px-4
 * md:px-lg`), sedangkan layout warga tidak. Menaruhnya di sini akan
 * menggandakannya di sisi admin.
 */
const WADAH = 'w-full max-w-[1280px] mx-auto';

/**
 * Rangka baris selagi memuat, menggantikan pemintal.
 *
 * Pemintal tak berukuran: halaman melompat begitu datanya tiba. Rangka menempati
 * ruang yang kira-kira sama dengan baris sungguhan, jadi tata letaknya diam.
 * `aria-hidden` + `aria-busy` di pembungkusnya: bagi pembaca layar yang berarti
 * "sedang memuat", bukan delapan kotak kosong untuk dibacakan.
 */
function RangkaDaftar() {
  return (
    <Card className="overflow-hidden" aria-busy="true" aria-label="Memuat riwayat notifikasi">
      <ul className="divide-y divide-outline-variant" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} data-rangka="" className="flex items-center gap-sm px-md py-sm">
            <span className="w-9 h-9 rounded-full bg-surface-container-high animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="block h-4 w-2/5 rounded bg-surface-container-high animate-pulse" />
              <span className="block h-3 w-3/4 rounded bg-surface-container animate-pulse mt-1.5" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function NotificationHistoryScreen({ dashboardHref, className = '' }) {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [rentang, setRentang] = useState(RENTANG_BAWAAN);
  const [urutan, setUrutan] = useState(URUTAN_BAWAAN);

  const fetchData = useCallback(async () => {
    // Batas waktunya dihitung dari jam PERAMBAN, bukan jam server: "30 hari
    // terakhir" harus berarti 30 hari di tempat penggunanya berada.
    const saringan = {
      ...batasRentang(rentang),
      ...(urutan === URUTAN_BAWAAN ? {} : { sort: urutan }),
    };

    // Tiga permintaan, dan yang ketiga bukan pemborosan: `pagination.total`
    // hanya menggambarkan kombinasi yang sedang diminta, sehingga angka untuk
    // pil PASANGANNYA -- "Belum dibaca" saat sedang melihat semua, dan
    // sebaliknya -- tak bisa disimpulkan dari jawaban yang sama. `limit: 1`
    // karena yang dipakai cuma angkanya.
    //
    // `getUnreadNotificationCount` TIDAK dipakai untuk pil. Ia selalu global
    // (mencerminkan lonceng), jadi memakainya saat rentang waktu aktif akan
    // membuat pilnya menyebut angka yang tak ada hubungannya dengan daftar di
    // bawahnya. Nilainya tetap dipakai untuk keping di judul, yang memang
    // sengaja global.
    const [daftar, belumDibacaGlobal, pasangan] = await Promise.all([
      getNotifications({
        page,
        limit: LIMIT,
        ...saringan,
        ...(unreadOnly ? { unreadOnly: true } : {}),
      }),
      getUnreadNotificationCount(),
      getNotifications({
        page: 1,
        limit: 1,
        ...saringan,
        ...(unreadOnly ? {} : { unreadOnly: true }),
      }),
    ]);

    const totalUtama = daftar.meta?.pagination?.total ?? 0;
    const totalPasangan = pasangan.meta?.pagination?.total ?? 0;

    return {
      daftar,
      belumDibacaGlobal,
      totalSemua: unreadOnly ? totalPasangan : totalUtama,
      totalBelumDibaca: unreadOnly ? totalUtama : totalPasangan,
    };
  }, [page, unreadOnly, rentang, urutan]);
  const { data, isLoading, error, refetch } = useAsync(fetchData);

  const notifications = data?.daftar?.data ?? [];
  const pagination = data?.daftar?.meta?.pagination ?? { total: 0, totalPages: 1 };
  const belumDibacaTotal = data?.belumDibacaGlobal ?? 0;
  const totalSemua = data?.totalSemua ?? 0;
  const totalBelumDibaca = data?.totalBelumDibaca ?? 0;
  // Dikelompokkan per rentang waktu (tahap 3). Urutannya tidak diubah -- backend
  // sudah mengirim terbaru dulu, dan mengurutkan ulang di sini akan membuat
  // halaman kedua berurutan lain dari halaman pertama.
  const kelompok = kelompokkanNotifikasi(notifications);

  // Mengubah saringan SELALU kembali ke halaman 1: "belum dibaca" hampir selalu
  // lebih pendek dari daftar penuh, jadi bertahan di halaman 4 berarti pengguna
  // menatap daftar kosong padahal datanya ada.
  const ubahSaringan = (nilai) => {
    setUnreadOnly(nilai);
    setPage(1);
  };

  // Alasan yang sama berlaku untuk rentang & urutan: keduanya mengubah panjang
  // maupun isi daftar, jadi bertahan di halaman 4 berarti menatap daftar kosong.
  const ubahRentang = (nilai) => {
    setRentang(nilai);
    setPage(1);
  };

  const ubahUrutan = (nilai) => {
    setUrutan(nilai);
    setPage(1);
  };

  const resetSaringan = () => {
    setRentang(RENTANG_BAWAAN);
    setUrutan(URUTAN_BAWAAN);
    setPage(1);
  };

  const handleItemClick = async (notification) => {
    if (notification.isRead) return;
    try {
      await markNotificationRead(notification.id);
      refetch();
    } catch {
      // Navigasi tetap lanjut meski gagal menandai dibaca -- bukan penghalang.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      refetch();
    } catch {
      // Diamkan; pengguna bisa mencoba lagi.
    }
  };

  return (
    <div className={`${WADAH} ${className}`.trim()}>
      <div className="mb-lg flex flex-wrap items-start justify-between gap-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="font-h2 text-headline-md text-on-surface">Riwayat Notifikasi</h1>
            {/* Satu-satunya kalimat di halaman ini yang menjawab "apakah ada
                yang perlu saya tangani". Nol DINYATAKAN dengan kata, bukan
                angka: "0 belum dibaca" menuntut pembacanya berpikir sejenak
                untuk sesuatu yang justru kabar baik. */}
            <span
              className={`px-sm py-0.5 rounded-full text-label-sm font-semibold ${
                belumDibacaTotal > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {belumDibacaTotal > 0
                ? `${belumDibacaTotal} belum dibaca`
                : 'Semua sudah dibaca'}
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            Seluruh pemberitahuan Anda, dari yang terbaru hingga yang paling lama.
          </p>
        </div>
        {/* Berbentuk tombol, bukan teks bergaris bawah. Tautan ini berdiri
            sendirian di sudut kanan kepala halaman, jauh dari kalimat mana pun,
            jadi tak ada apa pun di sekitarnya yang memberitahu bahwa ia dapat
            ditekan. Kelasnya DISALIN dari tautan kembali di halaman Sampah
            Survei supaya tak lahir varian tombol baru; tambahannya hanya cincin
            fokus -- sesuatu yang berbentuk tombol tapi tak menampakkan apa pun
            saat di-Tab membuat penggunanya kehilangan jejak posisi.

            "Dashboard", bukan "dasbor": itu sebutan yang dipakai sidebar
            Kabupaten, sidebar OPD, dan menu profil ("Dashboard Saya").

            `shrink-0`: tautan ini yang terpotong di tangkapan layar pengguna.
            Tanpa itu ia ikut menyusut saat judul memanjang atau layar sempit. */}
        <Link
          href={dashboardHref}
          className="shrink-0 whitespace-nowrap flex items-center gap-sm px-lg py-sm border border-outline rounded-lg text-sm font-bold hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-sm mb-md">
        <button
          type="button"
          onClick={() => ubahSaringan(false)}
          aria-pressed={!unreadOnly}
          className={`px-md py-sm rounded-full text-label-md transition-colors ${
            unreadOnly
              ? 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              : 'bg-primary text-on-primary'
          }`}
        >
          Semua ({totalSemua})
        </button>
        <button
          type="button"
          onClick={() => ubahSaringan(true)}
          aria-pressed={unreadOnly}
          className={`px-md py-sm rounded-full text-label-md transition-colors ${
            unreadOnly
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Belum dibaca ({totalBelumDibaca})
        </button>
        {/* Tetap menandai SEMUA, tak mengikuti saringan -- dan labelnya jujur
            mengatakan itu. Dengan saring waktu, perilaku global justru yang
            diharapkan: yang lama memang itu yang ingin dibersihkan. */}
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="ml-auto flex items-center gap-xs px-md py-sm rounded-full text-label-md text-primary hover:bg-primary/10 transition-colors"
        >
          <Check size={16} /> Tandai semua dibaca
        </button>
      </div>

      <NotificationFilterBar
        rentang={rentang}
        urutan={urutan}
        onRentangChange={ubahRentang}
        onUrutanChange={ubahUrutan}
        onReset={resetSaringan}
      />

      {isLoading ? (
        <RangkaDaftar />
      ) : error ? (
        <ErrorState
          title="Gagal memuat notifikasi"
          description={error.message}
          onRetry={refetch}
        />
      ) : (
        <Card className="overflow-hidden">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-2xl text-center px-lg">
              <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mb-md">
                <BellOff size={22} className="text-on-surface-variant" />
              </div>
              <p className="text-body-md text-on-surface-variant">
                {unreadOnly
                  ? 'Belum ada notifikasi yang belum dibaca.'
                  : 'Belum ada notifikasi untuk Anda.'}
              </p>
            </div>
          ) : (
            kelompok.map((k) => (
              <section key={k.kunci}>
                {/* `sticky`: kepala kelompok tetap terbaca saat digulir, jadi
                    pembaca selalu tahu ia sedang berada di rentang waktu mana
                    tanpa harus menggulir balik ke atas. */}
                <h2 className="sticky top-0 z-10 px-md py-xs bg-surface-container text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant border-y border-outline-variant">
                  {k.label}
                </h2>
                <ul className="divide-y divide-outline-variant">
              {k.items.map((notification) => {
                const { Ikon, kelasIkon } = gayaJenisNotifikasi(notification.type);
                const belumDibaca = !notification.isRead;
                const isi = (
                  <div
                    className={`group flex items-center gap-sm px-md py-sm border-l-4 hover:bg-surface-container-low transition-colors ${
                      belumDibaca ? 'border-primary bg-primary/5' : 'border-transparent'
                    }`}
                  >
                    {/* Ikon MENGULANG isi judul, jadi disembunyikan dari pembaca
                        layar; tugasnya murni membuat daftar dapat dipindai mata.
                        `data-jenis` membuat sifat itu dapat diuji tanpa
                        berpura-pura ia punya nama yang perlu dibacakan. */}
                    <span
                      aria-hidden="true"
                      data-jenis={notification.type}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${kelasIkon} ${
                        belumDibaca ? '' : 'opacity-60'
                      }`}
                    >
                      <Ikon size={18} />
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Judul & waktu SEBARIS. Waktu di bawah pesan membuat tiap
                          baris setinggi tiga baris teks, dan pada halaman yang
                          gunanya menelusuri riwayat panjang itu berarti sedikit
                          sekali yang muat di layar. */}
                      <div className="flex items-baseline justify-between gap-sm">
                        {/* `line-clamp-2`, BUKAN `truncate`: pada potret 390px
                            judulnya terpotong jadi "Balasan Baru pada Pe...".
                            Judul notifikasi memang perlu dua baris di layar
                            sempit -- yang boleh dipangkas satu baris adalah
                            pesannya, bukan judulnya. */}
                        <p
                          data-judul-notifikasi=""
                          className={`line-clamp-2 group-hover:text-primary transition-colors ${
                            belumDibaca
                              ? 'font-semibold text-on-surface'
                              : 'font-medium text-on-surface-variant'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-label-sm text-on-surface-variant tabular-nums">
                          {notification.timeLabel}
                        </span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      {/* Garis aksen & judul tebal semata-mata visual; ini
                          penandanya bagi yang tak melihatnya. */}
                      {belumDibaca && <span className="sr-only">Belum dibaca</span>}
                    </div>

                    {/* Isyarat bahwa baris ini menuju suatu tempat. Sebelumnya
                        tak ada apa pun yang mengatakannya. Murni visual --
                        tujuannya sudah terbaca dari judul & pesannya, jadi tak
                        perlu ikut dibacakan. */}
                    <ChevronRight
                      aria-hidden="true"
                      data-panah=""
                      size={18}
                      className="shrink-0 text-outline opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                );
                return (
                  <li key={notification.id}>
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => handleItemClick(notification)}
                        className="block"
                      >
                        {isi}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => handleItemClick(notification)}
                      >
                        {isi}
                      </button>
                    )}
                  </li>
                );
              })}
                </ul>
              </section>
            ))
          )}

          {pagination.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={LIMIT}
              onPageChange={setPage}
              itemName="notifikasi"
            />
          )}
        </Card>
      )}
    </div>
  );
}
