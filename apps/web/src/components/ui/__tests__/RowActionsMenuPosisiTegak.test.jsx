import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RowActionsMenu from '../RowActionsMenu';

/**
 * MENU AKSI TERPOTONG DI DASAR LAYAR (6 Oktober 2026, laporan pengguna: "ketika
 * scroll halaman hingga bawah, daftar aksi tidak bisa tampil semuanya").
 *
 * Akarnya terukur dari kodenya sendiri: `hitungPosisi` MENJEPIT secara
 * horizontal -- pelajaran dari EksporMenu, 16 September 2026 -- lalu memaku
 * `top: kotak.bottom + 4` tanpa pernah memeriksa sisa ruang di bawah. Baris di
 * dekat dasar layar karena itu menggambar panelnya keluar viewport, dan butir
 * terakhirnya tak dapat ditekan sama sekali.
 *
 * MENGUKUR DENGAN UKURAN PALSU, dan itu keharusan: jsdom tidak menjalankan tata
 * letak, sehingga `getBoundingClientRect` selalu mengembalikan nol dan tak ada
 * satu pun keadaan "kehabisan ruang" yang dapat terjadi dengan sendirinya.
 * Yang dipalsukan hanya PENGUKURANNYA; keputusan posisinya tetap milik kode
 * yang diuji.
 */
const BUTIR = [
  { key: 'a', label: 'Ubah Role', onSelect: jest.fn() },
  { key: 'b', label: 'Jadikan Admin OPD', onSelect: jest.fn() },
  { key: 'c', label: 'Nonaktifkan', onSelect: jest.fn() },
  { key: 'd', label: 'Hapus', onSelect: jest.fn() },
];

const TINGGI_PANEL = 240;

/**
 * @param tombolBawah tepi bawah tombol titik-tiga pada viewport
 * @param tinggiLayar `window.innerHeight`
 */
function bukaMenu({ tombolBawah, tinggiLayar }) {
  window.innerWidth = 1280;
  window.innerHeight = tinggiLayar;

  const asli = Element.prototype.getBoundingClientRect;
  jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function ukur() {
    if (this.getAttribute?.('role') === 'menu') {
      return { top: 0, bottom: TINGGI_PANEL, left: 0, right: 224, width: 224, height: TINGGI_PANEL };
    }
    if (this.tagName === 'BUTTON' && this.getAttribute?.('aria-haspopup')) {
      const atas = tombolBawah - 32;
      return { top: atas, bottom: tombolBawah, left: 968, right: 1000, width: 32, height: 32 };
    }
    return asli.call(this);
  });

  render(<RowActionsMenu label="Aksi untuk Baris Uji" items={BUTIR} />);
  fireEvent.click(screen.getByRole('button', { name: 'Aksi untuk Baris Uji' }));
  return screen.getByRole('menu');
}

describe('RowActionsMenu — tetap di dalam layar secara tegak', () => {
  afterEach(() => jest.restoreAllMocks());

  it('ruang di bawah cukup: panel digambar DI BAWAH tombol, seperti sebelumnya', () => {
    // Tombol di tengah layar tinggi 1000: sisa 700px, jauh lebih dari 240px.
    const menu = bukaMenu({ tombolBawah: 300, tinggiLayar: 1000 });

    expect(menu.style.top).toBe('304px');
  });

  it('ruang di bawah kurang: panel DIBALIK ke atas tombol', () => {
    // Tepat keadaan pada tangkapan layar pengguna: tombol di dasar daftar.
    // Sisa bawah 60px, sisa atas 740px.
    const menu = bukaMenu({ tombolBawah: 740, tinggiLayar: 800 });

    // 740 - 32 (tinggi tombol) - 4 (jarak) - 240 (tinggi panel) = 464
    expect(menu.style.top).toBe('464px');
  });

  it('dibalik pun panel TIDAK boleh keluar tepi atas', () => {
    // Tombol dekat puncak layar pendek: dua-duanya sempit.
    const menu = bukaMenu({ tombolBawah: 120, tinggiLayar: 200 });

    expect(parseInt(menu.style.top, 10)).toBeGreaterThanOrEqual(0);
  });

  it('kedua sisi sempit: tingginya dibatasi dan panel dapat digulung sendiri', () => {
    // Tanpa ini, panel yang tak muat di mana pun tetap terpotong -- dibalik
    // atau tidak. Butir terakhir harus TETAP terjangkau.
    const menu = bukaMenu({ tombolBawah: 120, tinggiLayar: 200 });

    expect(menu.style.maxHeight).toMatch(/px$/);
    expect(parseInt(menu.style.maxHeight, 10)).toBeLessThanOrEqual(200);
    expect(menu.style.overflowY).toBe('auto');
  });

  it('penjepitan mendatar yang sudah ada TIDAK hilang', () => {
    // Penjaga pasangan: perbaikan tegak yang menulis ulang `hitungPosisi` mudah
    // membuang jepitan mendatar tanpa ada yang menyadarinya.
    const menu = bukaMenu({ tombolBawah: 300, tinggiLayar: 1000 });

    // Tepi kanan tombol 1000, lebar panel 224 -> kiri 776.
    expect(menu.style.left).toBe('776px');
  });
});
