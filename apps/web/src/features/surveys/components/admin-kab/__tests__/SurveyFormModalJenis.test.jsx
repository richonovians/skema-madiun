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
    expect(screen.getByRole('radio', { name: /survei custom/i })).not.toBeChecked();
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

    fireEvent.click(screen.getByRole('radio', { name: /survei custom/i }));
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
        initialValues={{ title: 'Survei Lama', period: '2026-Q1', opdId: 1, jenis: 'custom' }}
        opdName="Dinas Kesehatan"
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByRole('radiogroup', { name: /jenis survei/i })).not.toBeInTheDocument();
    expect(screen.getByText(/survei custom/i)).toBeInTheDocument();
    expect(screen.getByText(/jenis survei tidak dapat diganti/i)).toBeInTheDocument();
  });

  it('mode ubah tidak mengirim jenis (UpdateSurveyDto menolaknya)', () => {
    const onSubmit = jest.fn();
    render(
      <SurveyFormModal
        mode="edit"
        initialValues={{ title: 'Survei Lama', period: '2026-Q1', opdId: 1, jenis: 'custom' }}
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

/**
 * TUJUAN dan METODE NILAI survei custom di modal (8 Oktober 2026). Dua isian
 * wajib yang muncul HANYA bila jenis Custom; bentuknya <select> ringkas karena
 * tinggi modal tetap. Mode ubah boleh menggantinya (hanya tampilan yang
 * berubah), SKM tidak pernah memakainya.
 */
describe('SurveyFormModal — tujuan dan metode nilai', () => {
  const pilihJenis = (nama) => fireEvent.click(screen.getByRole('radio', { name: nama }));
  const isi = (label, nilai) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value: nilai } });

  describe('mode buat', () => {
    it('Custom menampilkan dua isian kosong; SKM dan belum memilih tidak', () => {
      renderBuat();
      expect(screen.queryByLabelText(/tujuan survei/i)).not.toBeInTheDocument();

      pilihJenis(/skm permenpanrb/i);
      expect(screen.queryByLabelText(/tujuan survei/i)).not.toBeInTheDocument();

      pilihJenis(/survei custom/i);
      expect(screen.getByLabelText(/tujuan survei/i)).toHaveValue('');
      expect(screen.getByLabelText(/metode nilai/i)).toHaveValue('');
    });

    it('menolak Custom tanpa tujuan', () => {
      const onSubmit = jest.fn();
      renderBuat({ onSubmit });
      isiJudulDanOpd();
      pilihJenis(/survei custom/i);
      isi(/metode nilai/i, 'rata_rata');

      fireEvent.click(screen.getByRole('button', { name: 'Buat Survei' }));

      expect(screen.getByText('Tujuan survei wajib dipilih.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('menolak Custom tanpa metode nilai', () => {
      const onSubmit = jest.fn();
      renderBuat({ onSubmit });
      isiJudulDanOpd();
      pilihJenis(/survei custom/i);
      isi(/tujuan survei/i, 'kepuasan');

      fireEvent.click(screen.getByRole('button', { name: 'Buat Survei' }));

      expect(screen.getByText('Metode nilai wajib dipilih.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('meneruskan jenis, tujuan, dan metodeNilai untuk Custom', () => {
      const onSubmit = jest.fn();
      renderBuat({ onSubmit });
      isiJudulDanOpd();
      pilihJenis(/survei custom/i);
      isi(/tujuan survei/i, 'evaluasi');
      isi(/metode nilai/i, 'indeks_persen');

      fireEvent.click(screen.getByRole('button', { name: 'Buat Survei' }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          jenis: 'custom',
          tujuan: 'evaluasi',
          metodeNilai: 'indeks_persen',
        }),
      );
    });

    it('SKM tidak mengirim tujuan maupun metodeNilai, walau Custom sempat dipilih dan diisi', () => {
      const onSubmit = jest.fn();
      renderBuat({ onSubmit });
      isiJudulDanOpd();
      pilihJenis(/survei custom/i);
      isi(/tujuan survei/i, 'penilaian');
      isi(/metode nilai/i, 'rata_rata');
      pilihJenis(/skm permenpanrb/i);

      fireEvent.click(screen.getByRole('button', { name: 'Buat Survei' }));

      const payload = onSubmit.mock.calls[0][0];
      expect(payload.jenis).toBe('skm_permenpanrb');
      expect(payload).not.toHaveProperty('tujuan');
      expect(payload).not.toHaveProperty('metodeNilai');
    });
  });

  describe('mode ubah', () => {
    const renderUbah = (initialValues, props = {}) =>
      render(
        <SurveyFormModal
          mode="edit"
          initialValues={{ title: 'Survei Lama', period: '2026-Q1', opdId: 1, ...initialValues }}
          opdName="Dinas Kesehatan"
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
          {...props}
        />,
      );

    it('survei custom: tujuan dan metode terisi dari survei, dapat diubah, dan terkirim', () => {
      const onSubmit = jest.fn();
      renderUbah({ jenis: 'custom', tujuan: 'kepuasan', metodeNilai: 'rata_rata' }, { onSubmit });

      expect(screen.getByLabelText(/tujuan survei/i)).toHaveValue('kepuasan');
      expect(screen.getByLabelText(/metode nilai/i)).toHaveValue('rata_rata');

      isi(/metode nilai/i, 'indeks_persen');
      fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ tujuan: 'kepuasan', metodeNilai: 'indeks_persen' }),
      );
    });

    it('custom lama tanpa tujuan/metode: tidak mengirim kunci kosong', () => {
      const onSubmit = jest.fn();
      renderUbah({ jenis: 'custom' }, { onSubmit });

      fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

      const payload = onSubmit.mock.calls[0][0];
      expect(payload).not.toHaveProperty('tujuan');
      expect(payload).not.toHaveProperty('metodeNilai');
    });

    it('survei SKM: tanpa isian dan tanpa kunci tujuan/metodeNilai', () => {
      const onSubmit = jest.fn();
      renderUbah({ jenis: 'skm_permenpanrb' }, { onSubmit });

      expect(screen.queryByLabelText(/tujuan survei/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

      const payload = onSubmit.mock.calls[0][0];
      expect(payload).not.toHaveProperty('tujuan');
      expect(payload).not.toHaveProperty('metodeNilai');
    });
  });
});
