import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PenyaringJenisSurvei from '../PenyaringJenisSurvei';

/**
 * Penyaring JENIS survei di Statistik & Laporan (8 Oktober 2026): Semua jenis /
 * SKM / Custom. Nilainya enum backend apa adanya, plus 'semua' untuk "tanpa
 * saringan".
 */
describe('PenyaringJenisSurvei', () => {
  it('berlabel "Jenis survei" dan menampilkan pilihan aktif', () => {
    render(<PenyaringJenisSurvei nilai="semua" onChange={jest.fn()} />);

    expect(screen.getByLabelText(/jenis survei/i)).toHaveTextContent(/semua jenis/i);
  });

  it('menampilkan nama jenis yang dipilih', () => {
    render(<PenyaringJenisSurvei nilai="custom" onChange={jest.fn()} />);

    expect(screen.getByLabelText(/jenis survei/i)).toHaveTextContent('Custom');
  });

  it('menawarkan tiga pilihan dan meneruskan nilai enum', () => {
    const onChange = jest.fn();
    render(<PenyaringJenisSurvei nilai="semua" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(/jenis survei/i));
    expect(screen.getByRole('button', { name: 'SKM' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(onChange).toHaveBeenCalledWith('custom');

    fireEvent.click(screen.getByLabelText(/jenis survei/i));
    fireEvent.click(screen.getByRole('button', { name: 'SKM' }));
    expect(onChange).toHaveBeenCalledWith('skm_permenpanrb');
  });

  it('id dapat dibedakan per halaman', () => {
    render(<PenyaringJenisSurvei id="jenis-survei-kab" nilai="semua" onChange={jest.fn()} />);

    expect(document.getElementById('jenis-survei-kab')).not.toBeNull();
  });
});
