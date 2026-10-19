import React from 'react';
import { render, screen } from '@testing-library/react';
import NilaiSurvei from '../NilaiSurvei';

/**
 * NILAI SURVEI survei custom (8 Oktober 2026). Komponen ini HANYA menampilkan
 * objek `nilaiSurvei` yang sudah jadi dari backend: tidak menghitung apa pun,
 * dan tidak tahu rumusnya.
 */
const nilai = {
  judul: 'Nilai Survei',
  nilai: 3.4,
  tampilan: '3,40 / 4',
  kategori: 'Sangat Puas',
};
const persen = {
  judul: 'Indeks Kepuasan',
  nilai: 85,
  tampilan: '85%',
  kategori: 'Sangat Puas',
};

describe('NilaiSurvei — ukuran besar', () => {
  it('menampilkan judul, angka, dan kategori apa adanya', () => {
    render(<NilaiSurvei nilaiSurvei={nilai} />);

    expect(screen.getByText('Nilai Survei')).toBeInTheDocument();
    expect(screen.getByText('3,40 / 4')).toBeInTheDocument();
    expect(screen.getByText('Sangat Puas')).toBeInTheDocument();
  });

  it('judul mengikuti metode: "Indeks Kepuasan" untuk indeks persen', () => {
    render(<NilaiSurvei nilaiSurvei={persen} />);

    expect(screen.getByText('Indeks Kepuasan')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('null: "-" tanpa kategori dan tanpa angka karangan', () => {
    render(<NilaiSurvei nilaiSurvei={null} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByText(/sangat/i)).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('undefined diperlakukan sama dengan null', () => {
    render(<NilaiSurvei />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('judulBawaan dipakai pada keadaan kosong bila diberikan', () => {
    render(<NilaiSurvei nilaiSurvei={null} judulBawaan="Nilai Survei" />);

    expect(screen.getByText('Nilai Survei')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('NilaiSurvei — ukuran sel', () => {
  it('satu baris "angka · kategori" dengan judul sebagai title', () => {
    render(<NilaiSurvei nilaiSurvei={persen} ukuran="sel" />);

    const sel = screen.getByText(/85%/);
    expect(sel).toHaveTextContent('85% · Sangat Puas');
    expect(sel).toHaveAttribute('title', 'Indeks Kepuasan');
  });

  it('null: "-"', () => {
    render(<NilaiSurvei nilaiSurvei={null} ukuran="sel" />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
