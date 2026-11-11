import React from 'react';
import { render, act } from '@testing-library/react';
import TrendChart from '../TrendChart';

/**
 * Tiruan ResizeObserver, pola TrendChartIsiTinggi.test.jsx. Instans terakhir
 * disimpan sebagai properti statis, bukan `let x = this`, karena eslint
 * apps/web menolak `@typescript-eslint/no-this-alias`.
 */
class ResizeObserverTiruan {
  constructor(cb) {
    this.cb = cb;
    ResizeObserverTiruan.terakhir = this;
  }
  observe() {}
  disconnect() {}
  lapor(lebar, tinggi) {
    this.cb([
      {
        contentBoxSize: [{ inlineSize: lebar, blockSize: tinggi }],
        contentRect: { width: lebar, height: tinggi },
      },
    ]);
  }
}

beforeEach(() => {
  ResizeObserverTiruan.terakhir = null;
  global.ResizeObserver = ResizeObserverTiruan;
});
afterEach(() => {
  delete global.ResizeObserver;
});

/**
 * LABEL SUMBU X YANG HILANG PADAHAL DATANYA ADA (10 November 2026, laporan
 * pengguna: "Triwulan III - 2026" tak tampil pada Tren IKM empat triwulan).
 *
 * Sebabnya pemilihan bentuk label. Bentuk penuh dianggap "muat" bila JUMLAH
 * lebar keempat label tak melampaui lebar bagan -- dan itu benar, 470 dari
 * 520. Tetapi label berjangkar pada titiknya masing-masing, bukan dirapatkan:
 * label ketiga (tengah, x=386,7) berakhir di 445,6 sedangkan label keempat
 * (jangkar kanan, x=560) mulai di 448,4. Jaraknya 2,8px, di bawah JARAK_LABEL,
 * jadi label ketiga dibuang -- padahal bentuk pendek "TW III 2026" memuat
 * keempatnya tanpa membuang satu pun.
 *
 * jsdom tak punya ResizeObserver maupun canvas, jadi lebarnya 600
 * (LEBAR_PEMBUKA) dan lebar teks ditaksir 6,2px per huruf -- angka di atas
 * dihitung dengan taksiran itu, dan susunannya sama dengan yang terlihat di
 * peramban.
 */
const EMPAT_TRIWULAN = [
  { month: 'Triwulan I - 2026', value: 75 },
  { month: 'Triwulan II - 2026', value: 70 },
  { month: 'Triwulan III - 2026', value: 70 },
  { month: 'Triwulan IV - 2026', value: 73 },
];

/** Label sumbu X = <text> yang membawa <title> berisi label penuhnya. */
function labelSumbuX(container) {
  return [...container.querySelectorAll('text')].filter((t) => t.querySelector('title'));
}

describe('TrendChart — label sumbu X', () => {
  it('setiap periode tetap berlabel bila bentuk pendeknya muat', () => {
    const { container } = render(
      <TrendChart title="Tren IKM" data={EMPAT_TRIWULAN} dataKey="value" />,
    );

    const judul = labelSumbuX(container).map((t) => t.querySelector('title').textContent);
    expect(judul).toEqual(EMPAT_TRIWULAN.map((d) => d.month));
  });

  it('bentuk pendek dipakai untuk SEMUA label, bukan dicampur', () => {
    const { container } = render(
      <TrendChart title="Tren IKM" data={EMPAT_TRIWULAN} dataKey="value" />,
    );

    const teks = labelSumbuX(container).map((t) => t.lastChild.textContent);
    expect(teks).toEqual(['TW I 2026', 'TW II 2026', 'TW III 2026', 'TW IV 2026']);
  });

  /**
   * Di ponsel 393px kartunya selebar 313px dan "TW III 2026" pun masih
   * bertindih -- terukur di Chrome: hanya label pertama dan terakhir yang
   * tampil. Bentuk paling ringkas "TW3 '26" (sama dengan kartu hero beranda)
   * memuat keempatnya.
   */
  it('bagan sempit memakai bentuk paling ringkas agar semua periode berlabel', () => {
    const { container } = render(
      <TrendChart title="Tren IKM" data={EMPAT_TRIWULAN} dataKey="value" />,
    );
    act(() => ResizeObserverTiruan.terakhir.lapor(313, 220));

    const teks = labelSumbuX(container).map((t) => t.lastChild.textContent);
    expect(teks).toEqual(["TW1 '26", "TW2 '26", "TW3 '26", "TW4 '26"]);
  });

  it('bulan diringkas menjadi bentuk "Nov \'26" saat bagan sempit', () => {
    const enamBulan = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'].map((b, i) => ({
      month: `${b} 2026`,
      value: i,
    }));
    const { container } = render(
      <TrendChart title="Tren Jumlah Pengaduan" data={enamBulan} dataKey="value" yMax={6} />,
    );
    act(() => ResizeObserverTiruan.terakhir.lapor(480, 220));

    const teks = labelSumbuX(container).map((t) => t.lastChild.textContent);
    expect(teks).toEqual(["Jun '26", "Jul '26", "Agu '26", "Sep '26", "Okt '26", "Nov '26"]);
  });

  /**
   * KONTROL: data yang terlalu rapat bahkan untuk bentuk paling ringkas tetap
   * DITIPISKAN, tak pernah digambar bertindih.
   */
  it('KONTROL: label yang tetap tak muat ditipiskan, tidak bertindih', () => {
    const duaBelas = Array.from({ length: 12 }, (_, i) => ({
      month: `${['Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'][i]} 2026`,
      value: i,
    }));
    const { container } = render(
      <TrendChart title="Tren Jumlah Pengaduan" data={duaBelas} dataKey="value" yMax={12} />,
    );
    act(() => ResizeObserverTiruan.terakhir.lapor(313, 220));

    const label = labelSumbuX(container);
    expect(label.length).toBeGreaterThan(1);
    expect(label.length).toBeLessThan(12);
  });

  /**
   * KONTROL: perbaikannya tak boleh memendekkan label yang memang muat utuh.
   * Dua triwulan di kedua tepi sumbu tak saling mendekat sama sekali.
   */
  it('KONTROL: label penuh dipertahankan bila semuanya muat pada posisinya', () => {
    const { container } = render(
      <TrendChart
        title="Tren IKM"
        data={[EMPAT_TRIWULAN[0], EMPAT_TRIWULAN[3]]}
        dataKey="value"
      />,
    );

    const teks = labelSumbuX(container).map((t) => t.lastChild.textContent);
    expect(teks).toEqual(['Triwulan I - 2026', 'Triwulan IV - 2026']);
  });
});
