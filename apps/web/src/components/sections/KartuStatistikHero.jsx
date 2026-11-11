'use client';

import React, { useCallback } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Building2, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import { useAsync } from '@/hooks/useAsync';
import { getStatistics } from '@/features/statistics/services/statistics.api';

const angka = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n ?? 0);

const ANGKA_ROMAWI = { I: 1, II: 2, III: 3, IV: 4 };

/**
 * "Triwulan III - 2026" -> "TW3 '26".
 *
 * Label penuh tak muat di bawah batang selebar ~70px: terukur di peramban, ia
 * membungkus dan mendorong kartunya melebar sampai keluar susunan. Bentuk yang
 * TAK dikenali dikembalikan apa adanya, bukan dipotong: kalau format di
 * `formatPeriodeLabel` berubah suatu saat, label yang salah masih terbaca,
 * sedangkan label kosong tidak.
 */
function labelSingkat(teks) {
  const cocok = /Triwulan\s+(IV|I{1,3})\D+(\d{4})/i.exec(teks ?? '');
  if (!cocok) return teks;
  return `TW${ANGKA_ROMAWI[cocok[1].toUpperCase()]} '${cocok[2].slice(2)}`;
}

/**
 * Jumlah triwulan yang digambar di kartu Tren IKM: setahun terakhir.
 *
 * `ikmTrend` dari backend tak dibatasi, jadi setiap triwulan baru menambah
 * satu batang. Pada batang kelima pil nilainya ("72,17") sudah lebih lebar
 * daripada batangnya sendiri. Riwayat lengkapnya ada di /statistics, yang
 * dituju kartu ini.
 */
const TRIWULAN_DITAMPILKAN = 4;

/**
 * Arsiran jalur kosong di atas setiap batang, seperti pada referensi. Murni
 * gradasi CSS -- tak ada berkas gambar.
 */
const ARSIRAN_JALUR =
  'repeating-linear-gradient(135deg, rgba(148,163,184,0.22) 0 4px, transparent 4px 9px)';

const KELAS_KARTU =
  'rounded-2xl border border-white/70 bg-white/85 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.14)]';

/**
 * Gerak saat kursor mendekat, dipasang di lapisan KARTU -- bukan di pembungkus
 * yang melayang. Utilitas `animate-*` menetapkan properti `animation` secara
 * utuh dan gerak melayangnya memakai `transform`, jadi `hover:-translate-y-1`
 * pada elemen yang sama akan ditelan animasi yang sedang berjalan.
 *
 * Latarnya ikut memekat, dan itu bukan sekadar hiasan: angkanya jadi lebih
 * mudah dibaca tepat pada saat seseorang mendekat untuk membacanya.
 */
const KELAS_HOVER =
  'transition-all duration-300 ease-out group-hover:-translate-y-1 ' +
  'group-hover:border-white group-hover:bg-white/95 ' +
  'group-hover:shadow-[0_26px_60px_rgba(15,23,42,0.22)] ' +
  'group-focus-visible:-translate-y-1 group-focus-visible:bg-white/95 ' +
  'group-focus-visible:border-white ' +
  'group-focus-visible:shadow-[0_26px_60px_rgba(15,23,42,0.22)]';

/**
 * Penanda fokus papan ketik, mengikuti konvensi yang sudah berdiri di repo ini
 * (Navbar, Dropdown, Input, ComplaintAttachmentGallery): outline bawaan dimatikan
 * lalu DIGANTI cincin `primary`.
 *
 * Sebelumnya `focus:outline-none` berdiri sendirian. Terukur di peramban:
 * `outlineStyle: none` pada ketiga tautan, `boxShadow: none`, dan satu-satunya
 * isyarat fokus adalah angkat 4px -- sementara pengguna tetikus, yang tak
 * membutuhkan petunjuk, justru mendapat bayangan yang ikut memekat. Yang paling
 * butuh malah yang paling sedikit diberi.
 */
const KELAS_FOKUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-2xl';

/**
 * Ayunan dijeda selama kartunya disentuh. Kartu ini naik-turun 13px; tanpa jeda
 * ini, membaca angkanya berarti mengejar sasaran yang bergerak -- hover-nya jadi
 * hiasan, bukan bantuan. Induk ikut dianggap ter-hover saat anaknya disentuh,
 * jadi `hover:` di lapisan ini sudah cukup.
 */
const KELAS_JEDA = 'hover:[animation-play-state:paused]';

/**
 * Wadah keempat kartu, dan satu-satunya tempat perbedaan ponsel/desktop diputuskan
 * (16 September 2026, laporan pengguna: kartunya tak terlihat di ponsel 6,78").
 *
 * Di bawah `lg` ia kolom biasa: Tren IKM di atas, lalu ketiga angka bertumpuk.
 * Mulai `lg` ia menjadi panggung ber-`relative`: kartu Tren IKM tetap di alur
 * dan dipusatkan, ketiga angka `lg:absolute` menempel di pinggirnya.
 *
 * SUSUNAN PINGGIR (10 November 2026). Ketiga angka menumpang pada KEPALA dan
 * KAKI kartu utama -- Nilai IKM di sudut kanan atas, kedua angka pengaduan di
 * kedua sudut bawah -- bukan pada sisi tengahnya seperti pil kecil di
 * referensi. Kartu angka di sini jauh lebih lebar daripada pil itu: pada
 * kolom 456px (lebar `lg` terkecil) kartu yang ditempel di sisi tengah
 * menutup batang triwulan pertama atau terakhir, padahal batang terakhir
 * justru yang disorot. Kepala kartu utama kosong di kanan dan kakinya diberi
 * ruang `lg:pb-12`, jadi tak satu batang pun tertutup pada lebar mana pun.
 *
 * Kartunya sengaja TIDAK digambar dua kali. Satu pohon DOM berarti setiap angka,
 * tautan, dan penanda fokus yang sudah dijaga uji tetap berlaku untuk kedua lebar
 * layar; salinan kedua akan menggandakan semuanya dan diam-diam boleh menyimpang.
 */
const KELAS_TUMPUKAN = 'flex flex-col gap-3 lg:relative lg:block lg:py-10';

/** Letak ketiga kartu pinggir mulai `lg`. Dipakai kartu dan kerangkanya. */
const LETAK = {
  nilaiIkm: 'lg:absolute lg:top-0 lg:right-0',
  tanggapan: 'lg:absolute lg:bottom-0 lg:left-0',
  selesai: 'lg:absolute lg:bottom-0 lg:right-0',
};

/**
 * Dua lapisan animasi per kartu, dan pemisahannya perlu. Utilitas `animate-*`
 * menetapkan properti `animation` secara utuh, jadi memasang gerak masuk dan
 * gerak melayang pada elemen yang sama membuat yang satu menghapus yang lain.
 * Pembungkus luar mengurus kemunculan, pembungkus dalam mengurus ayunan.
 *
 * Ayunannya `lg:`-saja: kartu yang mengayun 13px tanpa henti di layar 393px
 * membuat angkanya jadi sasaran bergerak.
 */
function Melayang({ kelas, jeda, ayunan, children, ...atribut }) {
  return (
    <div
      {...atribut}
      className={clsx('animate-fade-in-up', kelas)}
      style={{ animationDelay: `${jeda}ms` }}
    >
      <div className={clsx(ayunan, KELAS_JEDA)}>
        <Link href="/statistics" className={clsx('group block', KELAS_FOKUS)}>
          {children}
        </Link>
      </div>
    </div>
  );
}

function KartuPinggir({ ikon: Ikon, warnaIkon, latarIkon, label, children }) {
  return (
    <div className={clsx(KELAS_KARTU, KELAS_HOVER, 'flex items-center gap-3 px-3.5 py-3')}>
      <span
        className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', latarIkon)}
      >
        <Ikon size={18} className={warnaIkon} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Isi kartu utama: satu batang per triwulan, tinggi pada skala IKM 0-100.
 *
 * Skala TETAP, bukan relatif terhadap nilai tertinggi seperti kartu kecil
 * sebelumnya (10 November 2026). Skala relatif membuat 88 dan 91,2 tampak
 * berselisih separuh tinggi kartu; skala tetap memperlihatkan selisihnya apa
 * adanya, dan pil di atas setiap batang menyebut angkanya.
 */
function BatangTren({ deret }) {
  return (
    <div className="mt-5 flex items-end gap-3">
      {deret.map((t, i) => {
        const terbaru = i === deret.length - 1;
        return (
          <div key={t.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span
              data-pil-nilai
              className={clsx(
                'rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                terbaru ? 'border-primary/30 text-primary' : 'border-slate-200 text-slate-600',
              )}
            >
              {angka(t.value)}
            </span>
            {/* Jalur bertinggi PASTI. Tanpa ini persentase batangnya tak punya
                acuan -- terukur di peramban: kolomnya menyusut ke tinggi
                labelnya sendiri dan batangnya terhitung 0px. Batangnya diletakkan
                dengan `items-end`, BUKAN `absolute`: KartuHeroPonsel.test.jsx
                menolak `.absolute` tanpa syarat di dalam tumpukan. */}
            <div
              className="flex h-36 w-full items-end overflow-hidden rounded-xl bg-slate-50"
              style={{ backgroundImage: ARSIRAN_JALUR }}
            >
              <div
                data-batang
                className={clsx(
                  'animate-tumbuh-batang w-full origin-bottom rounded-xl',
                  terbaru
                    ? 'bg-gradient-to-b from-brand-blue to-primary shadow-[0_10px_24px_rgba(21,57,105,0.35)]'
                    : 'bg-slate-200',
                )}
                style={{
                  height: `${Math.min(Math.max(t.value, 0), 100)}%`,
                  animationDelay: `${260 + i * 90}ms`,
                }}
              />
            </div>
            <span
              className={clsx(
                'text-[11px] whitespace-nowrap',
                terbaru ? 'font-bold text-slate-800' : 'font-medium text-slate-500',
              )}
            >
              {labelSingkat(t.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Kerangka() {
  return (
    <div data-testid="kerangka-statistik" aria-hidden="true" className={KELAS_TUMPUKAN}>
      <div className={clsx(KELAS_KARTU, 'h-[300px] w-full animate-pulse lg:mx-auto lg:w-[360px]')} />
      <div className={clsx(KELAS_KARTU, 'h-[84px] w-full animate-pulse lg:w-[220px]', LETAK.nilaiIkm)} />
      <div className={clsx(KELAS_KARTU, 'h-16 w-full animate-pulse lg:w-[210px]', LETAK.tanggapan)} />
      <div className={clsx(KELAS_KARTU, 'h-16 w-full animate-pulse lg:w-[200px]', LETAK.selesai)} />
    </div>
  );
}

/**
 * Jumlah penilaian terkecil sebelum nilai IKM boleh dipajang di halaman utama.
 *
 * Tanpa lantai batas, halaman ini memajang "82,64" yang dihitung dari LIMA
 * penilaian sebagai angka terbesar di layar -- dan pembacanya tak punya cara tahu
 * bahwa dasarnya setipis itu. Rata-rata dari lima orang bukan laporan, ia
 * kebetulan; satu jawaban ekstrem menggeser seluruh nilainya.
 *
 * Sejak 10 November 2026 lantai yang sama juga menahan batang Tren IKM: pil
 * nilainya menyebut angka per triwulan, yang dasarnya lebih tipis lagi.
 *
 * 30 adalah ambang lazim bagi rata-rata yang dilaporkan, BUKAN kutipan aturan.
 * Kalau SKM Kabupaten Madiun sudah punya ketentuan jumlah sampel minimum sendiri
 * dari Permenpan-RB atau Diskominfo, angka itu yang menang -- dan menggantinya
 * cukup di baris ini.
 */
const AMBANG_PENILAIAN = 30;

/**
 * Kartu statistik di kolom kanan hero. Susunan pertama 14 September 2026;
 * ditata ulang 10 November 2026 atas permintaan pengguna mengikuti referensi
 * "Learning progress score": Tren IKM menjadi kartu utama di tengah, sedangkan
 * Nilai IKM, lama tanggapan, dan pengaduan selesai menempel di pinggirnya.
 *
 * Angkanya SUNGGUHAN, diambil dari `GET /statistics` yang memang publik tanpa
 * autentikasi. Halaman resmi pemerintah tak boleh memajang angka hias: pembaca
 * tak punya cara membedakan contoh dari laporan, dan yang dibacanya akan ia
 * anggap laporan.
 *
 * Yang TIDAK ditampilkan di sini adalah huruf mutu. `summary.ikm` adalah
 * rata-rata lintas OPD, sedangkan backend hanya menghitung mutu PER SURVEI
 * (`IkmService.mutuFromNilai`) -- catatan yang sama sudah berdiri di
 * KabSummaryMetrics.jsx. Menurunkan hurufnya sendiri di sini berarti mengarang
 * predikat resmi.
 *
 * Pemanggilannya sengaja berada di komponen ini, bukan di HeroSection: kegagalan
 * jaringan cukup menghapus kartunya, tanpa pernah menyentuh judul, paragraf,
 * dan tombol masuk yang menjadi isi utama halaman.
 */
export default function KartuStatistikHero() {
  const ambil = useCallback(() => getStatistics(), []);
  const { data, isLoading, error } = useAsync(ambil);

  if (isLoading) return <Kerangka />;

  /**
   * TAK MENGGAMBAR APA PUN saat `GET /statistics` tak terjawab (30 September
   * 2026, keputusan pengguna).
   *
   * Yang berdiri di sini sampai tanggal itu adalah dua kartu pernyataan, dan
   * yang pertama berbunyi "Status Layanan -- Terhubung SSO Madiun". Ia muncul
   * TEPAT ketika API-nya tak bisa dihubungi, sedangkan jalur SSO melewati API
   * yang sama: kalimat itu menyatakan "terhubung" pada satu-satunya saat kita
   * justru punya bukti sebaliknya.
   *
   * Penggantinya sengaja BUKAN pesan galat. Pemberitahuan kegagalan di hero
   * menceritakan kepada warga sebuah masalah yang tak bisa mereka perbuat apa-
   * apa, sekaligus membuat beranda tampak rusak padahal judul, paragraf, dan
   * tombol masuknya baik-baik saja. Tempat pesan kegagalan adalah halaman
   * /statistics itu sendiri.
   *
   * Yang TETAP dijaga dari versi lama: kartu berangka tak boleh digambar di
   * sini. Nol di halaman utama terbaca sebagai kabupaten tanpa satu pun layanan,
   * bukan sebagai jaringan yang sedang putus.
   */
  if (error || !data?.summary) return null;

  const { summary, ikmTrend = [], complaintStatus } = data;
  const deret = ikmTrend.slice(-TRIWULAN_DITAMPILKAN);

  /**
   * Kedua angka pengaduan menjawab keraguan yang sebenarnya menahan warga
   * sebelum melapor: apakah laporan saya akan ditanggapi, dan apakah pernah ada
   * yang benar-benar tuntas. "OPD Aktif 62" tak menjawab keduanya -- ia
   * menceritakan ukuran sistemnya, bukan hasilnya.
   */
  const lamaTanggapan = Number(summary.avgSlaDays) > 0 ? summary.avgSlaDays : null;
  const jumlahSelesai = complaintStatus?.status?.find((s) => s.id === 'selesai')?.count ?? null;
  const jumlahPenilaian = Number(summary.totalRespondents) || 0;
  const cukupPenilaian = jumlahPenilaian >= AMBANG_PENILAIAN;

  return (
    <div data-tumpukan-statistik className={KELAS_TUMPUKAN}>
      {/* KARTU UTAMA: Tren IKM. Di alur, bukan melayang absolut, jadi ia yang
          menentukan tinggi panggung dan ketiga kartu pinggir menumpang padanya. */}
      <Melayang
        data-kartu-utama
        kelas="relative z-10 lg:mx-auto lg:w-[360px]"
        jeda={0}
        ayunan="lg:animate-melayang-lambat"
      >
        {/* BINGKAI BENING (10 November 2026), mengikuti referensi: kartu putih
            di dalam bingkai putih tembus pandang 12px. Ia hanya terlihat di atas
            panel biru di belakangnya (PanggungStatistik di HeroSection) --
            terukur di Chrome, di atas latar putih bingkai ini lebur sama
            sekali. Panel itu milik `lg`, jadi setiap kelas bingkai juga.

            Bingkainya lapisan TERSENDIRI, bukan `box-shadow` pada kartu:
            KELAS_HOVER mengganti `box-shadow` saat disentuh, dan bingkai yang
            dibangun dari bayangan akan lenyap tepat ketika kursor mendekat.
            Gerak angkatnya dipindah ke lapisan ini supaya kartu dan bingkainya
            terangkat bersama. */}
        <div
          data-bingkai-kartu
          className="transition-transform duration-300 ease-out group-hover:-translate-y-1 group-focus-visible:-translate-y-1 lg:rounded-[28px] lg:bg-white/35 lg:p-3 lg:ring-1 lg:ring-white/70 lg:backdrop-blur-md"
        >
          <div
            className={clsx(
              KELAS_KARTU,
              'w-full bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition-shadow duration-300 group-hover:shadow-[0_26px_60px_rgba(15,23,42,0.24)] lg:pb-12',
            )}
          >
            <p className="text-base font-bold text-slate-900">Tren IKM</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Per triwulan, skala 0-100
            </p>

            {!cukupPenilaian ? (
              /* Batang dan pil nilainya ditahan bersama Nilai IKM. Ruangnya tetap
                 diisi penjelasan, supaya kartu utama tak terbaca rusak. */
              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-xs leading-relaxed font-medium text-slate-600">
                Tren tampil setelah {AMBANG_PENILAIAN} penilaian warga terkumpul.
              </p>
            ) : deret.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-xs leading-relaxed font-medium text-slate-600">
                Belum ada nilai IKM per triwulan.
              </p>
            ) : (
              <BatangTren deret={deret} />
            )}
          </div>
        </div>
      </Melayang>

      <Melayang
        data-kartu-pinggir
        kelas={clsx('z-20', LETAK.nilaiIkm)}
        jeda={130}
        ayunan="lg:animate-melayang"
      >
        <div className={clsx(KELAS_KARTU, KELAS_HOVER, 'w-full px-4 py-3 lg:w-[220px]')}>
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold">
            <Star size={12} aria-hidden="true" />
            Nilai IKM
          </span>

          {cukupPenilaian ? (
            <div className="mt-2 leading-none">
              <p data-testid="nilai-ikm" className="text-[28px] font-bold text-slate-900">
                {angka(summary.ikm)}
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                dari {angka(summary.totalRespondents)} penilaian warga
              </p>
            </div>
          ) : (
            /* Jumlah sebenarnya tetap disebut, dan itu disengaja. Kolom yang
               dikosongkan tanpa penjelasan terbaca sebagai aplikasi yang
               rusak; menyebut "5 dari 30" mengubah kekurangan itu menjadi
               alasan untuk ikut mengisi. */
            <div className="mt-2 leading-snug">
              <p className="text-base font-bold text-slate-800">Belum cukup penilaian</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                Baru {angka(jumlahPenilaian)} dari {AMBANG_PENILAIAN} penilaian yang dibutuhkan agar
                nilainya layak ditampilkan.
              </p>
            </div>
          )}
        </div>
      </Melayang>

      <Melayang
        data-kartu-pinggir
        kelas={clsx('z-20', LETAK.tanggapan)}
        jeda={260}
        ayunan="lg:animate-melayang"
      >
        {/* Instalasi baru belum punya pengaduan yang selesai, jadi `avgSlaDays`
            belum bernilai. "0 hari" terbaca sebagai janji tanggapan seketika dan
            "null hari" sebagai aplikasi rusak; keduanya lebih buruk daripada tak
            menjanjikan apa pun. Kartunya diganti, bukan dikosongkan, supaya
            susunannya tak berlubang. */}
        {lamaTanggapan !== null ? (
          <KartuPinggir
            ikon={Clock}
            warnaIkon="text-primary"
            latarIkon="bg-primary/10"
            label="Ditanggapi rata-rata"
          >
            <p className="mt-0.5 text-base font-bold text-slate-800">{angka(lamaTanggapan)} hari</p>
          </KartuPinggir>
        ) : (
          <KartuPinggir
            ikon={Building2}
            warnaIkon="text-primary"
            latarIkon="bg-primary/10"
            label="Pengaduan Masuk"
          >
            <p className="mt-0.5 text-base font-bold text-slate-800">
              {angka(summary.totalComplaints)}
            </p>
          </KartuPinggir>
        )}
      </Melayang>

      {jumlahSelesai !== null && (
        <Melayang
          data-kartu-pinggir
          kelas={clsx('z-20', LETAK.selesai)}
          jeda={390}
          ayunan="lg:animate-melayang-lambat"
        >
          <KartuPinggir
            ikon={CheckCircle2}
            warnaIkon="text-emerald-600"
            latarIkon="bg-emerald-50"
            label="Pengaduan Selesai"
          >
            <p className="mt-0.5 text-base font-bold text-slate-800">{angka(jumlahSelesai)}</p>
          </KartuPinggir>
        </Melayang>
      )}
    </div>
  );
}
