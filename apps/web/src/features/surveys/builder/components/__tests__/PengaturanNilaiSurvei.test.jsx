import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PengaturanNilaiSurvei from '../PengaturanNilaiSurvei';
import { contohHasil } from '@/features/surveys/constants/nilaiSurvei';

/**
 * TUJUAN dan METODE NILAI survei custom (8 Oktober 2026). Dua isian wajib yang
 * muncul setelah jenis Custom dipilih. Mode penuh (builder) memakai radiogroup
 * berkartu; mode ringkas (modal Admin Kab, tinggi modal tetap) memakai dua
 * <select> berlabel.
 */
const setup = (props = {}) => {
  const onTujuan = jest.fn();
  const onMetode = jest.fn();
  render(
    <PengaturanNilaiSurvei
      tujuan={null}
      metode={null}
      onTujuan={onTujuan}
      onMetode={onMetode}
      {...props}
    />,
  );
  return { onTujuan, onMetode };
};

describe('PengaturanNilaiSurvei — mode penuh', () => {
  it('menampilkan dua radiogroup: tiga tujuan dan dua metode, belum ada yang terpilih', () => {
    setup();

    const tujuan = screen.getByRole('radiogroup', { name: /tujuan survei/i });
    const metode = screen.getByRole('radiogroup', { name: /metode nilai/i });
    expect(tujuan.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    expect(metode.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    screen.getAllByRole('radio').forEach((r) => expect(r).not.toBeChecked());
  });

  it('nama radio hanya judulnya; keterangan menjadi deskripsi, bukan bagian nama', () => {
    setup();

    const kepuasan = screen.getByRole('radio', { name: 'Kepuasan' });
    expect(kepuasan).toHaveAccessibleDescription(/mengukur seberapa puas/i);
    expect(screen.getByRole('radio', { name: 'Indeks persen' })).toBeInTheDocument();
  });

  it('memilih meneruskan nilai enum backend lewat callback', () => {
    const { onTujuan, onMetode } = setup();

    fireEvent.click(screen.getByRole('radio', { name: 'Evaluasi' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Indeks persen' }));

    expect(onTujuan).toHaveBeenCalledWith('evaluasi');
    expect(onMetode).toHaveBeenCalledWith('indeks_persen');
  });

  it('mencerminkan pilihan yang diberikan', () => {
    setup({ tujuan: 'penilaian', metode: 'rata_rata' });

    expect(screen.getByRole('radio', { name: 'Penilaian' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Nilai rata-rata' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Kepuasan' })).not.toBeChecked();
  });

  it('menampilkan contoh hasil untuk kombinasi terpilih', () => {
    setup({ tujuan: 'evaluasi', metode: 'indeks_persen' });

    expect(screen.getByText(/contoh hasil/i)).toHaveTextContent('Indeks Evaluasi 85%');
  });

  it('tanpa metode terpilih belum ada contoh hasil', () => {
    setup({ tujuan: 'evaluasi' });

    expect(screen.queryByText(/contoh hasil/i)).not.toBeInTheDocument();
  });

  it('disabled mematikan semua pilihan', () => {
    setup({ disabled: true });

    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled());
  });
});

describe('PengaturanNilaiSurvei — mode ringkas', () => {
  it('memakai dua <select> berlabel dengan pilihan awal kosong', () => {
    setup({ ringkas: true });

    const tujuan = screen.getByLabelText(/tujuan survei/i);
    const metode = screen.getByLabelText(/metode nilai/i);
    expect(tujuan.tagName).toBe('SELECT');
    expect(metode.tagName).toBe('SELECT');
    expect(tujuan).toHaveValue('');
    expect(metode).toHaveValue('');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  // Temuan peninjauan: placeholder yang dapat dipilih ulang mengirim '' ke state,
  // dan pembuatan survei custom lalu ditolak backend (400, bukan enum).
  it('opsi placeholder tidak dapat dipilih: pilihan yang sudah terisi tak bisa dikosongkan', () => {
    setup({ ringkas: true, tujuan: 'kepuasan', metode: 'rata_rata' });

    expect(screen.getByRole('option', { name: 'Pilih tujuan' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Pilih metode' })).toBeDisabled();
  });

  it('memilih meneruskan nilai enum backend', () => {
    const { onTujuan, onMetode } = setup({ ringkas: true });

    fireEvent.change(screen.getByLabelText(/tujuan survei/i), { target: { value: 'penilaian' } });
    fireEvent.change(screen.getByLabelText(/metode nilai/i), { target: { value: 'rata_rata' } });

    expect(onTujuan).toHaveBeenCalledWith('penilaian');
    expect(onMetode).toHaveBeenCalledWith('rata_rata');
  });

  it('mencerminkan pilihan dan menampilkan satu baris contoh hasil', () => {
    setup({ ringkas: true, tujuan: 'kepuasan', metode: 'rata_rata' });

    expect(screen.getByLabelText(/tujuan survei/i)).toHaveValue('kepuasan');
    expect(screen.getByLabelText(/metode nilai/i)).toHaveValue('rata_rata');
    expect(screen.getByText(/contoh hasil/i)).toHaveTextContent('Nilai Survei 3,40 / 4');
  });
});

describe('contohHasil', () => {
  it('rata_rata: judul payung untuk semua tujuan', () => {
    expect(contohHasil('evaluasi', 'rata_rata')).toBe('Nilai Survei 3,40 / 4');
  });

  it('indeks_persen: nama indeks mengikuti tujuan', () => {
    expect(contohHasil('kepuasan', 'indeks_persen')).toBe('Indeks Kepuasan 85%');
    expect(contohHasil('penilaian', 'indeks_persen')).toBe('Indeks Penilaian 85%');
  });

  it('indeks_persen tanpa tujuan dibaca kepuasan (bawaan backend)', () => {
    expect(contohHasil(null, 'indeks_persen')).toBe('Indeks Kepuasan 85%');
  });

  it('tanpa metode: null', () => {
    expect(contohHasil('kepuasan', null)).toBeNull();
  });
});
