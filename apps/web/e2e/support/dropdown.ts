import type { Locator } from '@playwright/test';

/**
 * Memilih satu pilihan pada `components/ui/Dropdown` (27 Oktober 2026).
 *
 * Dropdown itu bukan `<select>`: pemicunya `<button aria-haspopup="listbox">`
 * dan tiap pilihan adalah tombol biasa di panel yang bersaudara dengan pemicu
 * di wadah yang sama. Karena itu `selectOption` dan `toHaveValue` tak berlaku.
 * Tiga uji di `ganti-jenis-alur` dan `nilai-survei-alur` masih memakainya
 * sejak Tujuan survei dan Metode nilai pindah ke Dropdown (`ea027dd`), dan
 * memerah tanpa ada yang melihat sampai putaran penuh 27 Oktober 2026.
 *
 * Pilihan dicari di wadah pemicunya sendiri, bukan di seluruh halaman, supaya
 * tombol lain berlabel sama tak ikut tertekan. Nilai terpilih dibaca dari teks
 * pemicu (label pilihannya), bukan dari enum.
 *
 * @param pemicu tombol pemicu Dropdown, mis. `getByLabel(/metode nilai/i)`
 * @param label label pilihan persis seperti tampil, mis. `'Indeks persen'`
 */
export async function pilihDropdown(pemicu: Locator, label: string): Promise<void> {
  await pemicu.click();
  await pemicu.locator('xpath=..').getByRole('button', { name: label, exact: true }).click();
}
