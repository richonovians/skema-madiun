import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyFormModal from '../SurveyFormModal';
import { METODE_NILAI, TUJUAN_SURVEI } from '@/features/surveys/constants/nilaiSurvei';

/**
 * "Tujuan survei" dan "Metode nilai" memakai `Dropdown` sejak 26 Oktober 2026,
 * bukan `<select>` bawaan: memilih berarti membuka panel lalu mengklik
 * pilihannya menurut LABEL, dan yang tampak di tombolnya label, bukan enum.
 */
const labelNilai = (nilai) => [...TUJUAN_SURVEI, ...METODE_NILAI].find((p) => p.nilai === nilai).label;
const pilihNilai = (kontrol, nilai) => {
  fireEvent.click(kontrol);
  fireEvent.click(screen.getByRole('button', { name: labelNilai(nilai) }));
};

/**
 * JENIS SURVEI di modal Admin Kabupaten.
 *
 * 8 Oktober 2026: jenis, tujuan, dan metode dipilih DI DALAM modal.
 * 30 Oktober 2026 (permintaan pengguna): mode buat tidak lagi memuat ketiganya.
 * Tombolnya kini "Pilih Jenis Survei" dan membawa isian modal ke halaman jenis
 * survei yang sama dengan milik Admin OPD; survei baru dibuat di sana, sesudah
 * jenisnya dikonfirmasi. Mode ubah tetap hanya memperlihatkan jenisnya.
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
  it('mode buat tidak memuat pilihan jenis, tujuan, maupun metode nilai', () => {
    renderBuat();

    expect(screen.queryByRole('radiogroup', { name: /jenis survei/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Jenis Survei')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/tujuan survei/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/metode nilai/i)).not.toBeInTheDocument();
  });

  it('tombol simpan mode buat berbunyi "Pilih Jenis Survei"', () => {
    renderBuat();

    expect(screen.getByRole('button', { name: 'Pilih Jenis Survei' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buat Survei' })).not.toBeInTheDocument();
  });

  it('meneruskan isian modal TANPA jenis, tujuan, dan metodeNilai', () => {
    const onSubmit = jest.fn();
    renderBuat({ onSubmit });
    isiJudulDanOpd();

    fireEvent.click(screen.getByRole('button', { name: 'Pilih Jenis Survei' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({ title: 'Survei Uji', opdId: 1, izinkanAnonim: false });
    expect(payload.period).toMatch(/^\d{4}-Q[1-4]$/);
    expect(payload).not.toHaveProperty('jenis');
    expect(payload).not.toHaveProperty('tujuan');
    expect(payload).not.toHaveProperty('metodeNilai');
  });

  it('KONTROL: tetap menolak tanpa OPD penyelenggara', () => {
    const onSubmit = jest.fn();
    renderBuat({ onSubmit });
    fireEvent.change(screen.getByLabelText(/judul survei/i), { target: { value: 'Survei Uji' } });

    fireEvent.click(screen.getByRole('button', { name: 'Pilih Jenis Survei' }));

    expect(screen.getByText('OPD penyelenggara wajib dipilih.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
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
    // Sejak 26 Oktober 2026 jenis dapat diganti di builder selama survei masih
    // draf dan belum dijawab, jadi keterangan "tak dapat diganti setelah dibuat"
    // tidak benar lagi.
    expect(screen.queryByText(/tidak dapat diganti setelah survei dibuat/i)).not.toBeInTheDocument();
    expect(screen.getByText(/jenis survei dapat diganti lewat builder/i)).toBeInTheDocument();
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
 * TUJUAN dan METODE NILAI survei custom di modal (8 Oktober 2026). Sejak
 * 30 Oktober 2026 keduanya hanya ada di mode ubah: mode buat memilihnya di
 * halaman jenis survei. Mode ubah boleh menggantinya (hanya tampilan yang
 * berubah), SKM tidak pernah memakainya.
 */
describe('SurveyFormModal — tujuan dan metode nilai', () => {
  const isi = (label, nilai) => pilihNilai(screen.getByLabelText(label), nilai);

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

      expect(screen.getByLabelText(/tujuan survei/i)).toHaveTextContent(labelNilai('kepuasan'));
      expect(screen.getByLabelText(/metode nilai/i)).toHaveTextContent(labelNilai('rata_rata'));

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
