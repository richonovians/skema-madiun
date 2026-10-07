import React from 'react';
import { render } from '@testing-library/react';
import AnalyticsTabs from '../AnalyticsTabs';

/**
 * BILAH TAB BERHENTI DI BAWAH NAVBAR, BUKAN DI BALIKNYA (7 Oktober 2026,
 * laporan pengguna beserta tangkapan layar).
 *
 * `sticky top-0` menempel pada tepi atas VIEWPORT. Navbar kedua area admin
 * `fixed` di tepi itu juga, jadi begitu halaman digulir, bilah tab meluncur ke
 * belakang navbar: tab dan pemilih survei tertutup separuh. Terukur pada
 * /admin-kab/analytics -- judul halaman terpotong persis di garis bawah navbar.
 *
 * Offsetnya DIKIRIM PEMANGGIL, tidak dipaku di sini. Komponen ini dipakai dua
 * area dengan dua navbar berbeda tinggi, masing-masing melaporkan tingginya ke
 * variabel CSS-nya sendiri (`--tinggi-navbar-kab`, `--tinggi-navbar-opd`).
 * Memilih salah satunya di dalam komponen berarti area yang lain pasti salah.
 */
const TABS = [
  { id: 'skm', label: 'Analisis SKM' },
  { id: 'pengaduan', label: 'Analisis Pengaduan' },
];

const sajikan = (props = {}) =>
  render(<AnalyticsTabs tabs={TABS} activeTab="skm" onChange={jest.fn()} {...props} />);

describe('AnalyticsTabs — offset sticky', () => {
  it('KONTROL: tanpa prop, tetap menempel di tepi atas seperti sebelumnya', () => {
    const { container } = sajikan();

    expect(container.firstChild).toHaveClass('top-0');
  });

  it('memakai offset yang dikirim pemanggil', () => {
    const { container } = sajikan({ kelasSticky: 'top-[var(--tinggi-navbar-kab)]' });

    expect(container.firstChild).toHaveClass('top-[var(--tinggi-navbar-kab)]');
    expect(container.firstChild).not.toHaveClass('top-0');
  });

  it('bertumpuk DI BAWAH navbar, bukan di atasnya', () => {
    // Diukur di /admin-kab/analytics: navbar `fixed` ber-z-30 dan bilah ini
    // ber-z-30 juga. Pada z yang sama, yang belakangan di urutan DOM menang --
    // dan bilah ini selalu belakangan, jadi ia MENUTUPI navbar setiap kali
    // keduanya bertindihan. Itu yang terlihat sebagai tampilan berantakan.
    //
    // Yang diturunkan bilah ini, bukan dinaikkan navbarnya: z-30 navbar sudah
    // berpasangan dengan laci sidebar (z-50) dan latarnya (z-40), jadi
    // menaikkannya memindahkan masalah ke sana.
    const { container } = sajikan();

    expect(container.firstChild).toHaveClass('z-20');
    expect(container.firstChild).not.toHaveClass('z-30');
  });

  it('tetap sticky apa pun offsetnya', () => {
    // Pagar: mengganti `top-0` dengan variabel tak boleh sekalian menghapus
    // `sticky`, yang akan membuat bilahnya ikut tergulir hilang.
    const { container } = sajikan({ kelasSticky: 'top-[var(--tinggi-navbar-opd)]' });

    expect(container.firstChild).toHaveClass('sticky');
  });
});
