import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminSurveyCardStats from '../AdminSurveyCardStats';
import SurveyResponsesSummary from '../SurveyResponsesSummary';

/**
 * NILAI SURVEI di kartu survei Admin OPD dan ringkasan halaman respons
 * (8 Oktober 2026). Survei custom menampilkan objek `nilaiSurvei` jadi dari
 * backend; survei SKM tak berubah (Nilai IKM / Nilai Rata-Rata).
 */
const persen = {
  judul: 'Indeks Kepuasan',
  nilai: 85,
  tampilan: '85%',
  kategori: 'Sangat Puas',
};
const rataRata = {
  judul: 'Nilai Survei',
  nilai: 3.4,
  tampilan: '3,40 / 4',
  kategori: 'Sangat Puas',
};

describe('AdminSurveyCardStats', () => {
  it('SKM tak berubah: "Nilai Sementara IKM"', () => {
    render(<AdminSurveyCardStats respondentsCount={3} ikmScore={81.25} isDraft={false} />);

    expect(screen.getByText('Nilai Sementara IKM')).toBeInTheDocument();
    expect(screen.getByText(/81\.25/)).toBeInTheDocument();
  });

  it('custom: label = judul nilaiSurvei, isi = angka dan kategori apa adanya', () => {
    render(
      <AdminSurveyCardStats
        respondentsCount={3}
        ikmScore={null}
        isDraft={false}
        jenis="custom"
        nilaiSurvei={persen}
      />,
    );

    expect(screen.getByText('Indeks Kepuasan')).toBeInTheDocument();
    expect(screen.getByText('85% · Sangat Puas')).toBeInTheDocument();
    expect(screen.queryByText('Nilai Sementara IKM')).not.toBeInTheDocument();
  });

  it('custom metode rata_rata: judul payung "Nilai Survei"', () => {
    render(
      <AdminSurveyCardStats
        respondentsCount={3}
        ikmScore={null}
        isDraft={false}
        jenis="custom"
        nilaiSurvei={rataRata}
      />,
    );

    expect(screen.getByText('Nilai Survei')).toBeInTheDocument();
    expect(screen.getByText('3,40 / 4 · Sangat Puas')).toBeInTheDocument();
  });

  it('custom belum punya jawaban skala: "Nilai Survei" dan "-", bukan nol', () => {
    render(
      <AdminSurveyCardStats
        respondentsCount={2}
        ikmScore={null}
        isDraft={false}
        jenis="custom"
        nilaiSurvei={null}
      />,
    );

    expect(screen.getByText('Nilai Survei')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('custom draf: kartu nilai tetap berjudul "Nilai Survei"', () => {
    render(
      <AdminSurveyCardStats
        respondentsCount={0}
        ikmScore={null}
        isDraft
        jenis="custom"
        nilaiSurvei={null}
      />,
    );

    expect(screen.getByText('Nilai Survei')).toBeInTheDocument();
  });
});

describe('SurveyResponsesSummary', () => {
  it('tanpa nilaiSurvei: "Nilai Rata-Rata" seperti semula', () => {
    render(<SurveyResponsesSummary totalResponses={4} averageScore={3.2} lastResponseDate={null} />);

    expect(screen.getByText('Nilai Rata-Rata')).toBeInTheDocument();
    expect(screen.getByText('3.20')).toBeInTheDocument();
  });

  it('custom: label = judul, isi = angka dan kategori dari backend', () => {
    render(
      <SurveyResponsesSummary
        totalResponses={4}
        averageScore={3.4}
        jenis="custom"
        nilaiSurvei={persen}
        lastResponseDate={null}
      />,
    );

    expect(screen.getByText('Indeks Kepuasan')).toBeInTheDocument();
    expect(screen.getByText('85% · Sangat Puas')).toBeInTheDocument();
    expect(screen.queryByText('Nilai Rata-Rata')).not.toBeInTheDocument();
  });

  it('custom tanpa nilai: "Nilai Survei" dan tanda strip, bukan 0', () => {
    render(
      <SurveyResponsesSummary
        totalResponses={0}
        averageScore={null}
        jenis="custom"
        nilaiSurvei={null}
        lastResponseDate={null}
      />,
    );

    expect(screen.getByText('Nilai Survei')).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
  });
});
