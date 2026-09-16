'use client';

import React, { useCallback } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Building2, Clock, ShieldCheck, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAsync } from '@/hooks/useAsync';
import { getStatistics } from '@/features/statistics/services/statistics.api';

const angka = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n ?? 0);

/**
 * Titik `<polyline>` dari deret nilai, dinormalkan ke kotak lebar x tinggi.
 *
 * Rentang nol -- semua periode bernilai sama, atau baru ada satu periode --
 * dijaga dengan `|| 1`. Tanpa itu pembagiannya menghasilkan NaN dan garisnya
 * lenyap tanpa satu pun galat, persis pada keadaan yang paling wajar terjadi di
 * awal pemakaian.
 */
function titikGaris(nilai, lebar, tinggi) {
  if (nilai.length === 0) return '';
  const min = Math.min(...nilai);
  const rentang = Math.max(...nilai) - min || 1;
  const langkah = nilai.length > 1 ? lebar / (nilai.length - 1) : 0;
  return nilai
    .map(
      (v, i) =>
        `${(i * langkah).toFixed(1)},${(tinggi - ((v - min) / rentang) * tinggi).toFixed(1)}`,
    )
    .join(' ');
}

const ANGKA_ROMAWI = { I: 1, II: 2, III: 3, IV: 4 };

/**
 * "Triwulan III - 2026" -> "TW3 '26".
 *
 * Label penuh tak muat di kartu selebar 200px: terukur di peramban, ia
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

function Chip({ ikon: Ikon, warnaIkon, label, nilai, deret, warnaGaris, kelasHover = '' }) {
  return (
    <div className={clsx(KELAS_KARTU, kelasHover, 'flex items-center gap-3 px-3.5 py-2.5')}>
      <Ikon size={18} className={clsx('shrink-0', warnaIkon)} />
      <div className="leading-tight">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <p className="text-sm font-bold text-slate-800">{nilai}</p>
      </div>
      <svg viewBox="0 0 44 20" className="ml-1 h-5 w-11 shrink-0" aria-hidden="true">
        <polyline
          points={titikGaris(deret, 44, 18)}
          fill="none"
          stroke={warnaGaris}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/**
 * Ditampilkan saat `GET /statistics` gagal dihubungi.
 *
 * BUKAN kartu angka yang dibiarkan menggambar nol. Nol di halaman utama terbaca
 * sebagai kabupaten tanpa satu pun layanan, bukan sebagai jaringan yang sedang
 * putus, dan itu keliru dengan cara yang merugikan. Kolomnya juga tidak
 * dikosongkan begitu saja: kolom yang mendadak hilang terbaca sebagai halaman
 * rusak.
 */
function KartuPernyataan() {
  return (
    <>
      <div className="animate-melayang absolute -bottom-7 -left-7">
        <div className={clsx(KELAS_KARTU, 'flex items-center gap-3 px-4 py-3')}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
            <ShieldCheck size={19} className="text-white" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              Status Layanan
            </p>
            <p className="text-sm font-bold whitespace-nowrap text-slate-800">
              Terhubung SSO Madiun
            </p>
          </div>
        </div>
      </div>

      <div
        className="animate-melayang-lambat absolute -top-6 -right-5"
        style={{ animationDelay: '400ms' }}
      >
        <div className={clsx(KELAS_KARTU, 'flex items-center gap-3 px-4 py-3')}>
          <span className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Lock size={19} className="text-white" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              Data Pribadi
            </p>
            <p className="text-sm font-bold whitespace-nowrap text-slate-800">
              Dengan Persetujuan Anda
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Kerangka() {
  return (
    <div data-testid="kerangka-statistik" aria-hidden="true">
      <div
        className={clsx(KELAS_KARTU, 'absolute top-14 -left-12 h-[124px] w-[268px] animate-pulse')}
      />
      <div
        className={clsx(KELAS_KARTU, 'absolute -top-9 right-0 h-[108px] w-[200px] animate-pulse')}
      />
      <div
        className={clsx(
          KELAS_KARTU,
          'absolute -bottom-10 left-10 h-[104px] w-[212px] animate-pulse',
        )}
      />
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
 * 30 adalah ambang lazim bagi rata-rata yang dilaporkan, BUKAN kutipan aturan.
 * Kalau SKM Kabupaten Madiun sudah punya ketentuan jumlah sampel minimum sendiri
 * dari Permenpan-RB atau Diskominfo, angka itu yang menang -- dan menggantinya
 * cukup di baris ini.
 */
const AMBANG_PENILAIAN = 30;

/**
 * Ringkasan untuk ponsel: angka yang sama, tanpa tata letak yang melayang.
 *
 * Seluruh kolom ilustrasi terukur `display: none` di bawah `lg`, jadi sebelumnya
 * setiap angka yang dimaksudkan menarik minat warga hanya sampai ke pengunjung
 * desktop -- padahal warga membuka situs ini dari ponsel. Yang tak bisa hidup di
 * layar 400px adalah TATA LETAKNYA: posisi absolut yang keluar dari alur, lebar
 * tetap 268px, dan ayunan tanpa henti. Datanya bisa.
 *
 * Sengaja BUKAN tautan. Tiga kartu desktop sudah menuju /statistics dan navbar
 * menyediakan jalan yang sama; menambah satu lagi hanya memperpanjang daftar
 * tautan serupa yang harus dilewati pengguna pembaca layar.
 */
function RingkasanPonsel({ nilaiIkm, cukupPenilaian, jumlahPenilaian }) {
  return (
    <div
      data-ringkas-ponsel
      className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 lg:hidden"
    >
      {cukupPenilaian ? (
        <div className="leading-tight">
          <p className="text-2xl font-bold text-slate-900">{nilaiIkm}</p>
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Nilai IKM
          </p>
        </div>
      ) : (
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-800">
            Nilai IKM menunggu {AMBANG_PENILAIAN} penilaian
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            Terkumpul {jumlahPenilaian} sejauh ini.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Tumpukan kartu melayang di atas ilustrasi hero (14 September 2026, permintaan
 * pengguna, mengikuti referensi yang dikirimkannya).
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
 * jaringan cukup mengganti tumpukan kartunya, tanpa pernah menyentuh judul,
 * paragraf, dan tombol masuk yang menjadi isi utama halaman.
 */
export default function KartuStatistikHero() {
  const ambil = useCallback(() => getStatistics(), []);
  const { data, isLoading, error } = useAsync(ambil);

  if (isLoading) return <Kerangka />;
  if (error || !data?.summary) return <KartuPernyataan />;

  const { summary, ikmTrend = [], complaintStatus } = data;
  const deret = ikmTrend.map((t) => t.value);
  const tertinggi = Math.max(...deret, 1);

  /**
   * Kedua chip ini menjawab keraguan yang sebenarnya menahan warga sebelum
   * melapor: apakah laporan saya akan ditanggapi, dan apakah pernah ada yang
   * benar-benar tuntas. "OPD Aktif 62" tak menjawab keduanya -- ia menceritakan
   * ukuran sistemnya, bukan hasilnya.
   */
  const lamaTanggapan = Number(summary.avgSlaDays) > 0 ? summary.avgSlaDays : null;
  const jumlahSelesai = complaintStatus?.status?.find((s) => s.id === 'selesai')?.count ?? null;
  const jumlahPenilaian = Number(summary.totalRespondents) || 0;
  const cukupPenilaian = jumlahPenilaian >= AMBANG_PENILAIAN;

  return (
    <>
      {/* Tumpukan melayang ini milik desktop saja. Ia bersandar pada posisi
          absolut terhadap rangka ilustrasi dan lebar tetap 268px; keduanya tak
          punya tempat di layar 400px. Yang menggantikannya di ponsel adalah
          RingkasanPonsel di bawah, dengan angka yang sama. */}
      <div className="hidden lg:block">
        {/* DUA lapisan animasi, dan pemisahannya perlu. Utilitas `animate-*`
            menetapkan properti `animation` secara utuh, jadi memasang gerak masuk
            dan gerak melayang pada elemen yang sama membuat yang satu menghapus
            yang lain. Pembungkus luar mengurus kemunculan, pembungkus dalam
            mengurus ayunan. */}
        <div
          className="animate-fade-in-up absolute top-14 -left-12 z-20"
          style={{ animationDelay: '0ms' }}
        >
          <div style={{ transform: 'translateZ(50px)' }}>
            <div className={clsx('animate-melayang', KELAS_JEDA)}>
            <Link href="/statistics" className={clsx('group block', KELAS_FOKUS)}>
              <div className={clsx(KELAS_KARTU, KELAS_HOVER, 'w-[268px] px-4 py-3.5')}>
                <span className="bg-primary/10 text-primary inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold">
                  Nilai IKM
                </span>

                {cukupPenilaian ? (
                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <div className="leading-none">
                      <p data-testid="nilai-ikm" className="text-[32px] font-bold text-slate-900">
                        {angka(summary.ikm)}
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                        dari {angka(summary.totalRespondents)} penilaian warga
                      </p>
                    </div>

                    <svg viewBox="0 0 96 40" className="h-10 w-24 shrink-0" aria-hidden="true">
                      <polyline
                        points={titikGaris(deret, 96, 36)}
                        fill="none"
                        stroke="#004ac6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : (
                  /* Jumlah sebenarnya tetap disebut, dan itu disengaja. Kolom
                     yang dikosongkan tanpa penjelasan terbaca sebagai aplikasi
                     yang rusak; menyebut "5 dari 30" mengubah kekurangan itu
                     menjadi alasan untuk ikut mengisi. */
                  <div className="mt-2.5 leading-snug">
                    <p className="text-base font-bold text-slate-800">Belum cukup penilaian</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      Baru {angka(jumlahPenilaian)} dari {AMBANG_PENILAIAN} penilaian yang
                      dibutuhkan agar nilainya layak ditampilkan.
                    </p>
                  </div>
                )}
              </div>
            </Link>
          </div>
          </div>
        </div>

        {/* Kartu batang: satu batang per periode, yang terbaru diberi warna tegas. */}
        <div
          className="animate-fade-in-up absolute -top-9 right-0 z-10"
          style={{ animationDelay: '130ms' }}
        >
          <div style={{ transform: 'translateZ(30px)' }}>
            <div className={clsx('animate-melayang-lambat', KELAS_JEDA)}>
            <Link href="/statistics" className={clsx('group block', KELAS_FOKUS)}>
              <div className={clsx(KELAS_KARTU, KELAS_HOVER, 'w-[200px] px-4 py-3.5')}>
                <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Tren IKM
                </p>
                <div className="mt-3 flex items-end gap-2.5">
                  {ikmTrend.map((t, i) => (
                    <div key={t.month} className="flex flex-1 flex-col items-center gap-1.5">
                      {/* Jalur bertinggi PASTI. Tanpa ini persentase batangnya tak
                    punya acuan -- terukur di peramban: kolomnya menyusut ke
                    tinggi labelnya sendiri dan batangnya terhitung 0px, jadi
                    kartunya tampil dengan label tanpa satu pun batang. */}
                      <div className="flex h-12 w-full items-end">
                        <div
                          data-batang
                          className={clsx(
                            'animate-tumbuh-batang w-full origin-bottom rounded-md',
                            i === ikmTrend.length - 1 ? 'bg-primary' : 'bg-primary/25',
                          )}
                          style={{
                            height: `${Math.max((t.value / tertinggi) * 100, 10)}%`,
                            animationDelay: `${260 + i * 90}ms`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold whitespace-nowrap text-slate-500">
                        {labelSingkat(t.month)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          </div>
          </div>
        </div>

        {/* Dua chip kecil yang bertumpuk, mengikuti susunan pada referensi. */}
        <div
          className="animate-fade-in-up absolute -bottom-10 left-10 z-30"
          style={{ animationDelay: '260ms' }}
        >
          <div style={{ transform: 'translateZ(60px)' }}>
            <div className={clsx('animate-melayang-lambat', KELAS_JEDA)}>
            <Link href="/statistics" className={clsx('group flex flex-col gap-2', KELAS_FOKUS)}>
              {/* Instalasi baru belum punya pengaduan yang selesai, jadi
            `avgSlaDays` belum bernilai. "0 hari" terbaca sebagai janji tanggapan
            seketika dan "null hari" sebagai aplikasi rusak; keduanya lebih buruk
            daripada tak menjanjikan apa pun. Chip-nya diganti, bukan
            dikosongkan, supaya susunannya tak berlubang. */}
              {lamaTanggapan !== null ? (
                <Chip
                  ikon={Clock}
                  warnaIkon="text-primary"
                  label="Ditanggapi rata-rata"
                  nilai={`${angka(lamaTanggapan)} hari`}
                  deret={deret}
                  warnaGaris="#004ac6"
                  kelasHover={KELAS_HOVER}
                />
              ) : (
                <Chip
                  ikon={Building2}
                  warnaIkon="text-primary"
                  label="Pengaduan Masuk"
                  nilai={angka(summary.totalComplaints)}
                  deret={deret}
                  warnaGaris="#004ac6"
                  kelasHover={KELAS_HOVER}
                />
              )}

              {jumlahSelesai !== null && (
                <Chip
                  ikon={CheckCircle2}
                  warnaIkon="text-emerald-500"
                  label="Pengaduan Selesai"
                  nilai={angka(jumlahSelesai)}
                  deret={deret}
                  warnaGaris="#10b981"
                  kelasHover={KELAS_HOVER}
                />
              )}
            </Link>
          </div>
          </div>
        </div>
      </div>

      <RingkasanPonsel
        nilaiIkm={angka(summary.ikm)}
        cukupPenilaian={cukupPenilaian}
        jumlahPenilaian={angka(jumlahPenilaian)}
      />
    </>
  );
}
