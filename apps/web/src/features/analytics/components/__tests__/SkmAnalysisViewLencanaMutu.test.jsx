import React from 'react';
import { render, screen } from '@testing-library/react';
import SkmAnalysisView from '../SkmAnalysisView';

/**
 * LENCANA MUTU DI LAYAR SEDANG (15 September 2026, laporan pengguna).
 *
 * Terukur di Chrome pada 768px: lencana "C - Kurang Baik" selebar 153px --
 * `px-lg` ditambah ikon 24px ditambah teks `text-headline-md` -- melewati
 * kartunya sendiri dan mendorong halaman 18px ke samping.
 *
 * Seperti berkas responsif lainnya, jsdom tak dapat membuktikan sesuatu muat.
 * Yang dijaga di sini kontrak kelasnya: ukuran besar itu hanya berlaku mulai
 * `lg`, dan lencananya tak boleh melebihi wadahnya.
 */
const metrics = {
  ikm: { value: 75, badge: null },
  totalRespondents: { value: 12, badge: null },
  quality: { grade: 'C - Kurang Baik' },
};

describe('SkmAnalysisView — lencana mutu di layar sempit', () => {
  it('ukuran besarnya baru berlaku mulai lg', () => {
    render(<SkmAnalysisView metrics={metrics} serviceElements={[]} jumlahResponden={12} />);

    const lencana = document.querySelector('[data-lencana-mutu]');

    expect(lencana.className).toMatch(/lg:text-headline-md/);
    expect(lencana.className).not.toMatch(/(^|\s)text-headline-md/);
  });

  it('tidak boleh melebihi lebar wadahnya', () => {
    render(<SkmAnalysisView metrics={metrics} serviceElements={[]} jumlahResponden={12} />);

    const lencana = document.querySelector('[data-lencana-mutu]');

    expect(lencana.className).toMatch(/\bmax-w-full\b/);
  });

  /**
   * PASANGAN kontrol. Lencana yang lenyap juga meniadakan geseran halaman --
   * dan bersamanya lenyap pula satu-satunya tempat huruf mutu layanan
   * ditampilkan di layar ini.
   */
  it('KONTROL: huruf mutunya tetap terbaca', () => {
    render(<SkmAnalysisView metrics={metrics} serviceElements={[]} jumlahResponden={12} />);

    expect(screen.getByText(/C - Kurang Baik/)).toBeInTheDocument();
  });
});
