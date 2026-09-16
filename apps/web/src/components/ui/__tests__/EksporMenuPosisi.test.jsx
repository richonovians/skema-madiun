import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EksporMenu from '../EksporMenu';

/**
 * MENU EKSPOR KELUAR TEPI KIRI DI LAYAR SEMPIT (16 September 2026, laporan
 * pengguna: fitur ekspor "masih terlihat tertutup").
 *
 * Terukur di Chrome pada /admin-opd/surveys, menu dalam keadaan terbuka:
 *
 *   320px  kiri=-32 kanan=160
 *   360px  kiri=-32 kanan=160
 *   390px  kiri=-32 kanan=160
 *   768px  kiri=232 kanan=424   <- utuh
 *   1280px kiri=232 kanan=424   <- utuh
 *
 * BUKAN tertutup elemen lain: tak ada satu pun leluhur yang menjepitnya, dan di
 * titik butir "Ekspor Excel" yang tergambar paling atas adalah tombol itu
 * sendiri. Menunya benar-benar menggantung 32px di luar layar, sehingga huruf
 * pertama kedua butirnya terpotong.
 *
 * Sebabnya `absolute right-0 w-48`: lebarnya tetap 192px dan tepi KANANnya
 * dipatok ke tepi kanan tombol, yang di layar sempit berada di x=160.
 *
 * Geseran halaman tetap 0px -- luapan ke kiri tak membuat halaman bisa digeser
 * ke kanan -- jadi sapuan responsif yang membaca `window.scrollX` tak pernah
 * melihatnya.
 */
const bukaMenu = () => {
  render(<EksporMenu onPdf={jest.fn()} onExcel={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /^ekspor$/i }));
  return screen.getByRole('menu');
};

describe('EksporMenu — tidak keluar tepi layar sempit', () => {
  it('dipatok ke tepi kiri tombol di layar sempit, kanan mulai sm', () => {
    const menu = bukaMenu();

    expect(menu.className).toMatch(/(^|\s)left-0\b/);
    expect(menu.className).toMatch(/\bsm:right-0\b/);
  });

  /**
   * PASANGAN yang membuat uji di atas berarti. `left-0` yang ditambahkan tanpa
   * mematikan `right-0` membuat keduanya berlaku sekaligus, dan menu meregang
   * selebar tombolnya alih-alih pindah.
   */
  it('patokan lamanya dimatikan, bukan ditumpuk', () => {
    const menu = bukaMenu();

    expect(menu.className).not.toMatch(/(^|\s)right-0\b/);
    expect(menu.className).toMatch(/\bright-auto\b/);
    expect(menu.className).toMatch(/\bsm:left-auto\b/);
  });

  /**
   * Penjaga terakhir. Memindahkan patokannya cukup untuk lebar tombol yang ada
   * sekarang; batas ini yang menahan menu tetap di dalam layar berapa pun lebar
   * tombolnya kelak, tanpa perlu ada yang mengukur ulang.
   */
  it('lebarnya tak pernah boleh melebihi layar', () => {
    const menu = bukaMenu();

    expect(menu.className).toMatch(/max-w-\[calc\(100vw-2rem\)\]/);
  });

  it('KONTROL: kedua pilihan ekspornya tetap ada dan tetap memanggil aksinya', () => {
    const onPdf = jest.fn();
    render(<EksporMenu onPdf={onPdf} onExcel={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^ekspor$/i }));

    expect(screen.getByRole('menuitem', { name: /ekspor pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /ekspor excel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /ekspor pdf/i }));

    expect(onPdf).toHaveBeenCalledTimes(1);
  });
});
