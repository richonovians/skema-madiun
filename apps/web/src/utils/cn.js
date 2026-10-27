import clsx from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Penggabung kelas Tailwind: `clsx` lalu tailwind-merge, sehingga kelas yang
 * datang belakangan (biasanya `className` pemanggil) menang atas kelas bawaan
 * komponen.
 *
 * MENGAPA BUKAN `twMerge` POLOS (27 Oktober 2026). tailwind-merge tidak membaca
 * `globals.css`, jadi ia tak tahu token tema repo ini. Terukur:
 * - `twMerge('px-3', 'px-sm')` membiarkan keduanya terpasang -- `sm` tidak ia
 *   kenali sebagai nilai spasi, dan urutan CSS-lah yang memilih pemenangnya;
 * - `twMerge('text-xs text-on-surface-variant', 'text-label-md')` membuang
 *   WARNA teksnya, karena `text-label-md` ia kira kelas warna.
 *
 * Kedua daftar di bawah harus sama dengan `--spacing-*` dan `--text-*` di
 * `globals.css`. `utils/__tests__/cn.test.js` membaca berkas itu dan memerah
 * bila ada token baru yang belum didaftarkan di sini.
 */
const TOKEN_SPASI = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'gutter', 'container-max'];

const TOKEN_TEKS = [
  'h1',
  'h1-sm',
  'h2',
  'h2-sm',
  'h3',
  'h4',
  'headline-xl',
  'headline-lg',
  'headline-md',
  'headline-sm',
  'title-md',
  'body',
  'body-lg',
  'body-md',
  'body-sm',
  'label-md',
  'label-sm',
];

const gabung = extendTailwindMerge({
  extend: {
    theme: {
      spacing: TOKEN_SPASI,
      text: TOKEN_TEKS,
    },
  },
});

export function cn(...masukan) {
  return gabung(clsx(masukan));
}
