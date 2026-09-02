'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Tinggi area plot, tetap. Hanya lebarnya yang mengikuti perangkat. */
const TINGGI = 220;

/**
 * Lebar pembuka untuk render pertama (server & bingkai pertama di klien),
 * sebelum pengukuran nyata masuk. 600 dipilih karena itu lebar yang dipakai
 * komponen ini sejak awal, jadi tampilan desktop tak bergeser sama sekali.
 */
const LEBAR_PEMBUKA = 600;

/** Lebar rata-rata satu huruf pada font-size 12 -- CADANGAN saat render di server. */
const LEBAR_HURUF = 6.2;

/** Jarak bersih minimal antar dua label sumbu X sebelum dianggap bertabrakan. */
const JARAK_LABEL = 8;

const FONT_LABEL = '12px Poppins, ui-sans-serif, system-ui, sans-serif';

/**
 * Lebar teks label, DIUKUR bukan ditaksir.
 *
 * Taksiran `jumlahHuruf * 6.2` sempat dipakai dan itu penyebab langsung
 * tabrakan yang dilaporkan: "Triwulan III - 2026" ditaksir 117px padahal
 * Poppins 12px sungguhannya ~128px, jadi dua label yang dihitung "masih
 * berjarak 10px" pada kenyataannya sudah saling menindih. Canvas
 * `measureText` memakai metrik font yang benar-benar dipakai peramban.
 *
 * Kalau Poppins belum selesai dimuat, canvas memakai metrik font cadangan --
 * selisihnya kecil dan hanya berlaku sesaat, jauh lebih dekat daripada
 * taksiran per huruf. Di server (tanpa `document`) taksiran itulah yang
 * dipakai, dan di sana lebarnya masih LEBAR_PEMBUKA sehingga semua label muat.
 */
let ctxKanvas = null;
function lebarTeks(teks) {
  const t = String(teks ?? '');
  if (typeof document !== 'undefined') {
    if (ctxKanvas === null) {
      ctxKanvas = document.createElement('canvas').getContext('2d') ?? false;
      if (ctxKanvas) ctxKanvas.font = FONT_LABEL;
    }
    if (ctxKanvas) return ctxKanvas.measureText(t).width;
  }
  return t.length * LEBAR_HURUF;
}

/**
 * Bentuk pendek label triwulan: "Triwulan III - 2026" -> "TW III 2026".
 * "TW" adalah singkatan triwulan yang lazim dipakai di dokumen pemerintahan,
 * jadi ini memendekkan tulisan tanpa mengganti istilahnya. Hanya dipakai bila
 * bentuk penuhnya memang tak muat -- di desktop labelnya tetap utuh.
 */
function ringkasLabel(teks) {
  return String(teks ?? '')
    .replace(/^triwulan\s+/i, 'TW ')
    .replace(/\s*-\s*/, ' ');
}

export default function TrendChart({ data, title, dataKey, yMin = 0, yMax = 100 }) {
  /**
   * BAGAN MENGIKUTI LEBAR PERANGKAT (1 September 2026).
   *
   * Sebelumnya `viewBox` dipatok `0 0 600 200` dan dipasangkan dengan
   * `preserveAspectRatio="none"`. Gabungan itu bukan "responsif", melainkan
   * MERENTANG: pada kartu selebar 262px di Android 360px, seluruh isi SVG --
   * termasuk setiap angka dan label sumbu -- ikut dimampatkan ke 44% lebar
   * aslinya. Hasilnya huruf sepipih garis dan tak terbaca. Menaruhnya di dalam
   * wadah bergulir memang menyelamatkan keterbacaan, tapi menukarnya dengan
   * guliran menyamping yang tak diminta siapa pun.
   *
   * Yang dikerjakan sekarang: lebar wadah DIUKUR, lalu dipakai sebagai lebar
   * `viewBox` juga. Karena kedua angka itu sama, satu satuan SVG = satu piksel
   * CSS, sehingga `font-size="12"` benar-benar tampil 12px pada lebar berapa
   * pun -- tidak pernah mampat, tidak pernah perlu digulir. Geometri garis
   * dihitung ulang mengikuti lebar itu, bukan direntang.
   *
   * ResizeObserver, bukan `window.resize`: lebar kartu ini juga berubah tanpa
   * jendela berubah ukuran -- saat sidebar dibuka/ditutup, saat grid berpindah
   * dari 1 ke 3 kolom, dan saat data baru tiba mengubah tinggi tetangganya.
   */
  const wadahRef = useRef(null);
  const [lebar, setLebar] = useState(LEBAR_PEMBUKA);

  useEffect(() => {
    const el = wadahRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const pengamat = new ResizeObserver(([entri]) => {
      const w =
        entri.contentBoxSize?.[0]?.inlineSize ?? entri.contentRect.width ?? 0;
      // Dibulatkan supaya perubahan sub-piksel tak memicu render berulang.
      const bulat = Math.max(200, Math.round(w));
      setLebar((lama) => (Math.abs(lama - bulat) < 1 ? lama : bulat));
    });
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, []);

  const height = TINGGI;
  /* Bantalan kiri harus tetap memuat label sumbu Y ("100" ~22px pada 12px),
     jadi 34px adalah batas bawah yang aman -- bukan angka yang dikira-kira. */
  const paddingX = lebar < 380 ? 34 : 40;
  const paddingY = 40;

  const innerWidth = lebar - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const pointSpacing = innerWidth / (data.length - 1 || 1);

  const points = data.map((item, index) => {
    const val = item[dataKey];
    const x = paddingX + index * pointSpacing;
    const y = height - paddingY - ((val - yMin) / (yMax - yMin)) * innerHeight;
    return { x, y, val, label: item.month };
  });

  /**
   * LABEL SUMBU X: DIPILIH BERDASARKAN TABRAKAN NYATA, BUKAN RUMUS JARAK.
   *
   * Cara lama menghitung "berapa label yang muat" lalu menampilkan tiap
   * kelipatan tertentu, DENGAN pengecualian "label pertama & terakhir selalu
   * ikut". Pengecualian itulah cacatnya, dan paling telanjang justru pada data
   * dua titik -- keadaan nyata halaman statistik saat ini: kedua label ADALAH
   * yang pertama dan yang terakhir, jadi keduanya selalu lolos berapa pun
   * sempitnya bagan. Terukur pada kartu 230px: label pertama membentang
   * 34..162 dan label terakhir 68..196, bertindih 94px. Itu tulisan
   * bertabrakan yang dilaporkan pengguna, dan penipisan lama tak pernah bisa
   * mencegahnya karena tak sekali pun memeriksa posisi.
   *
   * Sekarang urutannya:
   *   1. pakai label PENUH bila semuanya muat; kalau tidak, pakai bentuk
   *      pendek ("TW III 2026") -- memendekkan tulisan lebih baik daripada
   *      langsung membuang label;
   *   2. pilih label satu per satu sambil MENGUKUR bentangnya: yang bertindih
   *      dengan label yang sudah dipilih tidak digambar. Prioritasnya
   *      terakhir (periode terbaru) -> pertama (awal rentang) -> sisanya dari
   *      kanan ke kiri.
   * Dengan pemeriksaan bentang ini, tabrakan tak mungkin lagi terjadi pada
   * lebar mana pun, dan bukan cuma "kecil kemungkinannya".
   */
  const jangkarLabel = (index) =>
    index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle';

  const bentangLabel = (index, teks) => {
    const lebarnya = lebarTeks(teks);
    const x = points[index].x;
    const jangkar = jangkarLabel(index);
    const kiri = jangkar === 'start' ? x : jangkar === 'end' ? x - lebarnya : x - lebarnya / 2;
    return { kiri, kanan: kiri + lebarnya };
  };

  const labelPenuh = data.map((item) => String(item.month ?? ''));
  const semuaPenuhMuat = labelPenuh.reduce(
    (jumlah, teks) => jumlah + lebarTeks(teks) + JARAK_LABEL,
    -JARAK_LABEL,
  ) <= innerWidth;
  const labelTeks = semuaPenuhMuat ? labelPenuh : labelPenuh.map(ringkasLabel);

  const terakhir = data.length - 1;
  // `data` kosong harus menghasilkan daftar kosong, bukan indeks -1: itu akan
  // membaca `points[-1]` dan melempar saat bentangnya diukur.
  const urutanPrioritas =
    terakhir < 0
      ? []
      : [
          terakhir,
          ...(terakhir > 0 ? [0] : []),
          // dari kanan ke kiri: periode yang lebih baru lebih berhak berlabel
          ...Array.from({ length: Math.max(0, terakhir - 1) }, (_, k) => terakhir - 1 - k),
        ];

  const dipakai = [];
  const labelTampil = new Set();
  for (const index of urutanPrioritas) {
    const { kiri, kanan } = bentangLabel(index, labelTeks[index]);
    const bertabrakan = dipakai.some(
      (d) => kanan + JARAK_LABEL > d.kiri && kiri < d.kanan + JARAK_LABEL,
    );
    if (!bertabrakan) {
      dipakai.push({ kiri, kanan });
      labelTampil.add(index);
    }
  }

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col h-full w-full overflow-hidden">
      <h3 className="text-lg font-bold text-text-primary mb-6">{title}</h3>

      <div ref={wadahRef} className="flex-1 w-full relative min-h-[220px]">
        {/* `viewBox` selebar wadahnya sendiri -> satu satuan = satu piksel CSS,
            sehingga tak ada perentangan dan huruf tetap seukuran semestinya. */}
        <svg
          viewBox={`0 0 ${lebar} ${height}`}
          width="100%"
          height={height}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = height - paddingY - innerHeight * ratio;
            const val = Math.round(yMin + (yMax - yMin) * ratio);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={lebar - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text x={paddingX - 10} y={y + 4} fontSize="12" fill="#64748b" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />

          {/* Data Points

              GLITCH SAAT KURSOR DIARAHKAN KE LINGKARAN (2026-08-24, laporan user)
              -- dua sebab yang saling menguatkan:

              1. `transform-origin` BAWAAN elemen SVG adalah titik asal sistem
                 koordinat SVG (0,0), BUKAN pusat elemen itu sendiri. Jadi
                 `scale(1.5)` tidak membesarkan lingkaran di tempatnya, melainkan
                 ikut MENGGESER pusatnya menjauh dari (0,0) sejauh 50% dari cx/cy
                 -- makin ke kanan titiknya, makin jauh lompatannya.
              2. Lompatan itu memindahkan lingkaran keluar dari bawah kursor,
                 sehingga :hover LEPAS, skala kembali normal, lingkaran balik ke
                 bawah kursor, :hover aktif lagi -- berdenyut tanpa henti. Inilah
                 "gerakan aneh" yang terlihat, dan angkanya tetap muncul karena
                 tooltipnya ikut berkedip cepat.

              `transform-box: fill-box` membuat kotak acuan transform = kotak isi
              elemen, sehingga `origin-center` benar-benar berarti pusat lingkaran
              -- membesar di tempat, kursor tak pernah lepas.

              Lingkaran transparan ber-r=14 ditambahkan sebagai SASARAN ARAHAN:
              target r=5 terlalu kecil untuk ditunjuk dengan nyaman, dan
              ukurannya TIDAK berubah saat hover sehingga daerah tunjuknya tetap
              stabil. Sejak `viewBox` mengikuti lebar wadah, r=14 itu berarti
              14px sungguhan di layar -- cukup lebar untuk jempol, dan itu justru
              menguntungkan di ponsel. */}
          {points.map((p, i) => (
            <g key={`point-${i}`} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="2"
                className="transition-transform origin-center [transform-box:fill-box] group-hover:scale-150"
              />
              <text
                x={p.x}
                y={p.y - 15}
                fontSize="12"
                fill="#0f172a"
                textAnchor="middle"
                opacity="0"
                className="group-hover:opacity-100 font-bold transition-opacity"
              >
                {p.val}
              </text>
              {labelTampil.has(i) && (
                <text
                  x={p.x}
                  y={height - 15}
                  fontSize="12"
                  fill="#64748b"
                  textAnchor={jangkarLabel(i)}
                  className="select-none"
                >
                  {/* Judul lengkapnya tetap ada di <title> supaya bentuk
                      pendek tak menghilangkan keterangan apa pun. */}
                  <title>{p.label}</title>
                  {labelTeks[i]}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
