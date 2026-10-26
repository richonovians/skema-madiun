import React, { useRef } from 'react';
import { render } from '@testing-library/react';
import useKeepInViewport from '../useKeepInViewport';

/**
 * PANEL DI DALAM WADAH YANG MEMOTONG (26 Oktober 2026).
 *
 * Terukur di Chrome pada modal "Buat Paket Survei" (1366x768), sesudah dropdown
 * "Metode nilai" berpindah dari `<select>` ke `Dropdown`: panelnya terbuka ke
 * bawah di y 658-748, sedangkan badan modal yang `overflow-y-auto` berakhir di
 * y 645. Panelnya terpotong habis di belakang footer -- terbuka, tetapi tak
 * terlihat sama sekali. Dropdown "Tujuan survei" di sebelahnya selamat hanya
 * karena tiga pilihannya cukup panjang untuk melewati tepi LAYAR, satu-satunya
 * batas yang dikenal kait ini.
 *
 * jsdom tak menghitung tata letak, jadi geometrinya dipasang tangan pada tiap
 * simpul: angka di bawah adalah angka terukur tadi.
 */
const LAYAR = { lebar: 1366, tinggi: 900 };

const kotak = (atas, bawah, kiri = 690, lebar = 227) => ({
  top: atas,
  bottom: bawah,
  left: kiri,
  right: kiri + lebar,
  width: lebar,
  height: bawah - atas,
  x: kiri,
  y: atas,
});

beforeAll(() => {
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => LAYAR.tinggi,
  });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => LAYAR.lebar,
  });
});

function Uji({ wadahMemotong }) {
  const ref = useRef(null);
  useKeepInViewport(ref, true);

  const pasangWadah = (el) => {
    if (el) el.getBoundingClientRect = () => kotak(167, 645);
  };
  const pasangInduk = (el) => {
    // Pembungkus `relative` milik pemicu: tepi atasnya y 587.
    if (el) el.getBoundingClientRect = () => kotak(587, 645);
  };
  const pasangPanel = (el) => {
    ref.current = el;
    if (!el) return;
    Object.defineProperty(el, 'offsetParent', { configurable: true, get: () => el.parentElement });
    Object.defineProperty(el, 'offsetTop', { configurable: true, get: () => 66 });
    Object.defineProperty(el, 'offsetLeft', { configurable: true, get: () => 0 });
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => 90 });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => 227 });
  };

  return (
    <div ref={pasangWadah} style={wadahMemotong ? { overflowY: 'auto' } : undefined}>
      <div ref={pasangInduk} style={{ position: 'relative' }}>
        <div ref={pasangPanel} data-testid="panel" style={{ position: 'absolute' }} />
      </div>
    </div>
  );
}

describe('useKeepInViewport — wadah yang memotong', () => {
  it('panel yang muat di layar tetapi melewati tepi bawah wadahnya dibalik ke atas', () => {
    const { getByTestId } = render(<Uji wadahMemotong />);

    const panel = getByTestId('panel');
    expect(panel.style.bottom).toBe('100%');
    expect(panel.style.top).toBe('auto');
  });

  it('KONTROL: tanpa wadah yang memotong, panel yang muat di layar tetap di bawah', () => {
    const { getByTestId } = render(<Uji wadahMemotong={false} />);

    const panel = getByTestId('panel');
    expect(panel.style.bottom).toBe('');
    expect(panel.style.top).toBe('');
  });
});
