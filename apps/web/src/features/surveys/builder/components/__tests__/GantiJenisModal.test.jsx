import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GantiJenisModal from '../GantiJenisModal';
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

const isi = (label, nilai) => pilihNilai(screen.getByLabelText(label), nilai);
const tombol = () => screen.getByRole('button', { name: /ganti ke custom/i });

describe('GantiJenisModal', () => {
  it('tertutup: tidak merender apa pun', () => {
    setup({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('terbuka: fokus dipindahkan ke dalam dialognya (BUG-015 bagian 2)', () => {
    setup();

    // `useFocusTrap` terpasang. Diperiksa per dialog, sebab kait yang ADA tetapi
    // tak pernah dipanggil adalah bentuk kegagalan yang paling mudah terjadi --
    // pagar kaitnya sendiri di `pagar-bug-015-fokus-dialog.test.jsx` akan tetap
    // hijau walau dialog ini melewatkannya.
    expect(screen.getByRole('dialog')).toHaveFocus();
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

  /**
   * TUJUAN & METODE DI ATAS DAFTAR UNSUR (27 Oktober 2026, permintaan pengguna:
   * dropdown-nya terbuka ke bawah tanpa menabrak tombol). Dulu keduanya di
   * bawah daftar, tepat di atas footer: tak ada ruang di bawahnya, jadi panel
   * dibalik ke atas menutupi daftar unsur. Kini panelnya terbuka ke bawah,
   * menutupi daftar unsur alih-alih tombol. jsdom tak menghitung tata letak,
   * jadi yang dijaga di sini urutannya; arah bukanya dibuktikan di Chrome.
   */
  it('isian tujuan dan metode berada SEBELUM daftar unsur yang akan dihapus', () => {
    setup();

    const tujuan = screen.getByLabelText(/tujuan survei/i);
    const daftar = screen.getByRole('list', { name: /unsur yang akan dihapus/i });
    expect(tujuan.compareDocumentPosition(daftar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

    expect(screen.getByLabelText(/tujuan survei/i)).toHaveTextContent('Pilih tujuan');
    expect(screen.getByLabelText(/metode nilai/i)).toHaveTextContent('Pilih metode');
  });
});
