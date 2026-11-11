import React from 'react';
import { render, act } from '@testing-library/react';
import TrendChart from '../TrendChart';

/**
 * GRAFIK MENGISI TINGGI KARTU (3 November 2026).
 *
 * Di halaman statistik publik, kartu grafik ditarik setinggi pasangannya di
 * baris yang sama (grid 2x2). Kalau hanya kartunya yang memanjang, grafiknya
 * tetap 220px dan sisanya menjadi ruang kosong di dalam kartu. Dengan
 * `isiTinggi`, tinggi SVG mengikuti tinggi wadah yang DIUKUR, dengan batas
 * bawah 220px.
 *
 * Opt-in: pemakai lain (dashboard admin) tidak berubah sama sekali.
 *
 * jsdom tak punya ResizeObserver, jadi dipasang tiruan yang melaporkan ukuran
 * yang ditentukan uji. Instans terakhirnya disimpan sebagai properti statis,
 * bukan `let x = this`, karena eslint apps/web menolak
 * `@typescript-eslint/no-this-alias`.
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

const DATA = [
  { month: 'A', value: 1 },
  { month: 'B', value: 2 },
];

beforeEach(() => {
  ResizeObserverTiruan.terakhir = null;
  global.ResizeObserver = ResizeObserverTiruan;
});
afterEach(() => {
  delete global.ResizeObserver;
});

function tinggiSvg(container) {
  return Number(container.querySelector('svg').getAttribute('height'));
}

describe('TrendChart — isiTinggi', () => {
  it('tinggi SVG mengikuti tinggi wadah yang diukur', () => {
    const { container } = render(<TrendChart title="Uji" data={DATA} dataKey="value" yMax={2} isiTinggi />);

    act(() => ResizeObserverTiruan.terakhir.lapor(500, 400));

    expect(tinggiSvg(container)).toBe(400);
    expect(container.querySelector('svg').getAttribute('viewBox')).toBe('0 0 500 400');
  });

  it('tak pernah lebih pendek dari 220px', () => {
    const { container } = render(<TrendChart title="Uji" data={DATA} dataKey="value" yMax={2} isiTinggi />);

    act(() => ResizeObserverTiruan.terakhir.lapor(500, 100));

    expect(tinggiSvg(container)).toBe(220);
  });

  it('KONTROL: tanpa isiTinggi, tinggi tetap 220px walau wadahnya lebih tinggi', () => {
    const { container } = render(<TrendChart title="Uji" data={DATA} dataKey="value" yMax={2} />);

    act(() => ResizeObserverTiruan.terakhir.lapor(500, 400));

    expect(tinggiSvg(container)).toBe(220);
  });
});
