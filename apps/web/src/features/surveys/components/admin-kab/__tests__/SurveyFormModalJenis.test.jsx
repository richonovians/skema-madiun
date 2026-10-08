import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyFormModal from '../SurveyFormModal';

/**
 * JENIS SURVEI di modal Admin Kabupaten (8 Oktober 2026). Dipilih saat survei
 * dibuat dan tidak dapat diganti sesudahnya, jadi mode ubah hanya
 * memperlihatkannya.
 */
const OPD_OPTIONS = [
  { value: '', label: 'Pilih OPD penyelenggara' },
  { value: '1', label: 'Dinas Kesehatan' },
];

const renderBuat = (props = {}) =>
  render(
    <SurveyFormModal
      mode="create"
      opdOptions={OPD_OPTIONS}
      onSubmit={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );

const isiJudulDanOpd = () => {
  fireEvent.change(screen.getByLabelText(/judul survei/i), { target: { value: 'Survei Uji' } });
  fireEvent.click(screen.getByLabelText(/opd penyelenggara/i));
  fireEvent.click(screen.getByRole('button', { name: 'Dinas Kesehatan' }));
};

describe('SurveyFormModal — jenis survei', () => {
  it('mode buat menampilkan dua pilihan jenis, belum ada yang terpilih', () => {
    renderBuat();

    expect(screen.getByRole('radiogroup', { name: /jenis survei/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /skm permenpanrb/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /survei umum/i })).not.toBeChecked();
  });

  // Tinggi modal tetap dan nyaris penuh, jadi keterangan tidak diulang pada
  // tiap kartu: hanya satu baris untuk pilihan yang aktif.
  it('menampilkan keterangan HANYA untuk jenis yang dipilih', () => {
    renderBuat();
    expect(screen.queryByText(/menghasilkan nilai ikm/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tanpa nilai ikm/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /skm permenpanrb/i }));
    expect(screen.getByText(/menghasilkan nilai ikm/i)).toBeInTheDocument();
    expect(screen.queryByText(/tanpa nilai ikm/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /survei umum/i }));
    expect(screen.getByText(/tanpa nilai ikm/i)).toBeInTheDocument();
    expect(screen.queryByText(/menghasilkan nilai ikm/i)).not.toBeInTheDocument();
  });

  it('menolak menyimpan tanpa jenis dan menyebut alasannya', () => {
    const onSubmit = jest.fn();
    renderBuat({ onSubmit });
    isiJudulDanOpd();

    fireEvent.click(screen.getByRole('button', { name: 'Buat Survei' }));

    expect(screen.getByText('Jenis survei wajib dipilih.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('meneruskan jenis yang dipilih ke onSubmit', () => {
    const onSubmit = jest.fn();
    renderBuat({ onSubmit });
    isiJudulDanOpd();

    fireEvent.click(screen.getByRole('radio', { name: /skm permenpanrb/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Buat Survei' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'skm_permenpanrb', title: 'Survei Uji', opdId: 1 }),
    );
  });

  it('mode ubah tidak menawarkan pilihan, hanya memperlihatkan jenisnya', () => {
    render(
      <SurveyFormModal
        mode="edit"
        initialValues={{ title: 'Survei Lama', period: '2026-Q1', opdId: 1, jenis: 'umum' }}
        opdName="Dinas Kesehatan"
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByRole('radiogroup', { name: /jenis survei/i })).not.toBeInTheDocument();
    expect(screen.getByText(/survei umum/i)).toBeInTheDocument();
    expect(screen.getByText(/jenis survei tidak dapat diganti/i)).toBeInTheDocument();
  });

  it('mode ubah tidak mengirim jenis (UpdateSurveyDto menolaknya)', () => {
    const onSubmit = jest.fn();
    render(
      <SurveyFormModal
        mode="edit"
        initialValues={{ title: 'Survei Lama', period: '2026-Q1', opdId: 1, jenis: 'umum' }}
        opdName="Dinas Kesehatan"
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('jenis');
  });
});
