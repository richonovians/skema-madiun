import React from 'react';
import { render } from '@testing-library/react';
import TrendChart from '../TrendChart';

/**
 * DERET SATU TITIK DIGAMBAR DI TENGAH (2 November 2026).
 *
 * Tampilan Tahunan tren pengaduan hanya punya satu titik selama datanya baru
 * setahun. Sebelumnya titik tunggal ditaruh di tepi kiri sumbu -- posisi
 * "titik pertama dari banyak" -- dan terbaca seperti grafik yang terpotong.
 *
 * jsdom tak punya ResizeObserver, jadi lebar bagan tetap 600 (LEBAR_PEMBUKA)
 * dan tengahnya x = 300.
 */
describe('TrendChart — titik tunggal', () => {
  it('titik satu-satunya berada di tengah lebar bagan', () => {
    const { container } = render(
      <TrendChart title="Uji" data={[{ month: '2026', value: 5 }]} dataKey="value" yMax={6} />,
    );

    const titik = container.querySelector('circle[r="5"]');
    expect(Number(titik.getAttribute('cx'))).toBe(300);
  });

  it('labelnya berjangkar tengah, tepat di bawah titik', () => {
    const { container } = render(
      <TrendChart title="Uji" data={[{ month: '2026', value: 5 }]} dataKey="value" yMax={6} />,
    );

    const label = [...container.querySelectorAll('text')].find((t) => t.textContent.endsWith('2026'));
    expect(label).toHaveAttribute('text-anchor', 'middle');
    expect(Number(label.getAttribute('x'))).toBe(300);
  });

  it('KONTROL: dua titik tetap di kedua tepi sumbu', () => {
    const { container } = render(
      <TrendChart
        title="Uji"
        data={[
          { month: 'A', value: 1 },
          { month: 'B', value: 2 },
        ]}
        dataKey="value"
        yMax={2}
      />,
    );

    const xs = [...container.querySelectorAll('circle[r="5"]')].map((c) => Number(c.getAttribute('cx')));
    expect(xs).toEqual([40, 560]);
  });
});
