import React from 'react';
import { render } from '@testing-library/react';
import BuilderGroupLayout from '../layout';

/**
 * `overflow-hidden` DI SINI YANG MEMATIKAN `position: sticky` BILAH PALET
 * (16 September 2026).
 *
 * Bilah "Tambah Pertanyaan" sudah diberi `sticky top-[var(--tinggi-navbar-opd)]`,
 * tapi terukur di Chrome pada 360px ia tetap ikut tergulir: sesudah halaman
 * digulir 1200px, tombolnya berada di y=-1040 -- jauh di atas layar.
 *
 * Sebabnya leluhur ini. Elemen ber-`overflow` selain `visible` menjadi WADAH
 * GULIR bagi keturunan `sticky`-nya; karena kotak ini sendiri tak pernah
 * digulir -- yang digulir dokumen -- bilahnya tak punya tempat untuk menempel
 * dan ikut hanyut bersama isinya.
 *
 * Dibuktikan dengan satu percobaan, satu variabel:
 *
 *   apa adanya                       -> y=-1040, ikut tergulir
 *   `overflow: visible` di sini      -> y=80,    menempel
 *
 * `overflow-hidden` itu sendiri masih dibutuhkan mulai `md`, tempat builder
 * kembali menjadi lapisan `fixed` layar-penuh.
 */
describe('Layout grup (builder) — tidak mematikan sticky di ponsel', () => {
  it('menjepit luapannya baru mulai md', () => {
    const { container } = render(
      <BuilderGroupLayout>
        <p>isi builder</p>
      </BuilderGroupLayout>,
    );

    const pembungkus = container.firstChild;

    expect(pembungkus.className).not.toMatch(/(^|\s)overflow-hidden\b/);
    expect(pembungkus.className).toMatch(/\bmd:overflow-hidden\b/);
  });

  it('KONTROL: isinya tetap dirender', () => {
    const { getByText } = render(
      <BuilderGroupLayout>
        <p>isi builder</p>
      </BuilderGroupLayout>,
    );

    expect(getByText('isi builder')).toBeInTheDocument();
  });
});
