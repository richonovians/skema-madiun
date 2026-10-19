import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GantiJenisModal from '../GantiJenisModal';

/**
 * MODAL GANTI JENIS SKM -> CUSTOM (8 Oktober 2026). Penggantian menghapus
 * kesembilan unsur dan tak dapat dikembalikan, jadi modalnya menyebut akibatnya,
 * memperlihatkan kalimat unsur yang akan hilang, dan menuntut tujuan + metode
 * nilai sebelum tombol konfirmasi menyala.
 */
const UNSUR = [
  { kode: 'U1', text: 'Seberapa mudah persyaratan layanan kami?' },
  { kode: 'U2', text: 'Seberapa jelas prosedur layanan kami?' },
];

const setup = (props = {}) => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <GantiJenisModal
      isOpen
      unsur={UNSUR}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
};

const isi = (label, nilai) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: nilai } });
const tombol = () => screen.getByRole('button', { name: /ganti ke custom/i });

describe('GantiJenisModal', () => {
  it('tertutup: tidak merender apa pun', () => {
    setup({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('terbuka: dialog bernama, peringatan menyebut akibatnya yang tak dapat dikembalikan', () => {
    setup();

    const dialog = screen.getByRole('dialog', { name: /ganti jenis survei/i });
    expect(dialog).toHaveTextContent(/sembilan unsur/i);
    expect(dialog).toHaveTextContent(/tidak dapat dikembalikan/i);
    expect(dialog).toHaveTextContent(/pertanyaan tambahan/i);
  });

  it('memperlihatkan kode dan kalimat unsur yang akan hilang', () => {
    setup();

    expect(screen.getByText('U1')).toBeInTheDocument();
    expect(screen.getByText('Seberapa mudah persyaratan layanan kami?')).toBeInTheDocument();
    expect(screen.getByText('U2')).toBeInTheDocument();
  });

  it('tombol konfirmasi nonaktif sampai tujuan DAN metode dipilih', () => {
    setup();
    expect(tombol()).toBeDisabled();

    isi(/tujuan survei/i, 'evaluasi');
    expect(tombol()).toBeDisabled();

    isi(/metode nilai/i, 'indeks_persen');
    expect(tombol()).toBeEnabled();
  });

  it('konfirmasi meneruskan tujuan dan metodeNilai yang dipilih', () => {
    const { onConfirm } = setup();
    isi(/tujuan survei/i, 'penilaian');
    isi(/metode nilai/i, 'rata_rata');

    fireEvent.click(tombol());

    expect(onConfirm).toHaveBeenCalledWith({ tujuan: 'penilaian', metodeNilai: 'rata_rata' });
  });

  it('Batal dan Escape memanggil onCancel', () => {
    const { onCancel } = setup();

    fireEvent.click(screen.getByRole('button', { name: /^batal$/i }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('galat backend tampil di dalam modal', () => {
    setup({ error: 'Survei ini sudah menerima 3 jawaban' });

    expect(screen.getByRole('dialog')).toHaveTextContent('Survei ini sudah menerima 3 jawaban');
  });

  it('isSubmitting mematikan tombol dan isian, dan Escape tidak menutup', () => {
    const { onCancel } = setup({ isSubmitting: true });

    // Selagi menyimpan, label tombol berganti "Menyimpan...".
    expect(screen.getByRole('button', { name: /menyimpan/i })).toBeDisabled();
    expect(screen.getByLabelText(/tujuan survei/i)).toBeDisabled();
    expect(screen.getByLabelText(/metode nilai/i)).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('pilihan yang sudah diisi dikosongkan lagi saat modal dibuka ulang', () => {
    const { rerender } = render(
      <GantiJenisModal isOpen unsur={UNSUR} onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    isi(/tujuan survei/i, 'evaluasi');
    isi(/metode nilai/i, 'rata_rata');

    rerender(
      <GantiJenisModal isOpen={false} unsur={UNSUR} onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    rerender(
      <GantiJenisModal isOpen unsur={UNSUR} onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );

    expect(screen.getByLabelText(/tujuan survei/i)).toHaveValue('');
    expect(screen.getByLabelText(/metode nilai/i)).toHaveValue('');
  });
});
