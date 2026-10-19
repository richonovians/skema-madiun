import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import QuestionOptionsModal from '../QuestionOptionsModal';
import BuilderSidebar from '../BuilderSidebar';

/**
 * Dua keterangan yang harus ikut benar setelah kalimat pertanyaan unsur dapat
 * disunting (8 Oktober 2026, temuan review akhir):
 *
 *  - modal label skala unsur dulu berkata "teks unsur tidak dapat diubah",
 *    padahal kalimatnya kini disunting langsung di kartu;
 *  - modal itu juga menolak menyimpan LABEL bila kalimat pada salinan lokalnya
 *    kosong, padahal kalimat tak ikut dikirim dari sana;
 *  - palet harus mengatakan bahwa pertanyaan tambahan tidak masuk Nilai IKM.
 */
const LABEL = ['Buruk', 'Kurang', 'Baik', 'Sangat Baik'];

const renderModalUnsur = (props = {}) =>
  render(
    <QuestionOptionsModal
      mode="edit"
      variant="skala"
      isTextLocked
      initialText="Seberapa mudah persyaratan layanan kami?"
      initialOptions={LABEL}
      onSubmit={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );

describe('QuestionOptionsModal — label skala unsur baku', () => {
  it('mengarahkan ke kartu untuk mengubah kalimat, tidak lagi mengaku kalimatnya terkunci', () => {
    renderModalUnsur();

    expect(screen.getByText(/ubah kalimat pertanyaannya langsung di kartu/i)).toBeInTheDocument();
    expect(screen.queryByText(/tidak dapat diubah/i)).not.toBeInTheDocument();
  });

  it('kalimat pada salinan lokal kosong tidak menghalangi penyimpanan label', () => {
    const onSubmit = jest.fn();
    renderModalUnsur({ initialText: '', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    expect(screen.queryByText(/teks pertanyaan wajib diisi/i)).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].options).toEqual(LABEL);
  });

  it('KONTROL: pertanyaan tambahan (teks tidak terkunci) tetap wajib berkalimat', () => {
    const onSubmit = jest.fn();
    renderModalUnsur({ isTextLocked: false, initialText: '', onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    expect(screen.getByText(/teks pertanyaan wajib diisi/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('BuilderSidebar — keterangan pertanyaan tambahan', () => {
  it('menyebut bahwa pertanyaan skala tambahan tidak dihitung ke Nilai IKM', () => {
    render(<BuilderSidebar canDrag />);

    expect(screen.getByText(/tidak dihitung ke nilai ikm/i)).toBeInTheDocument();
    expect(screen.queryByText('Standard IKM')).not.toBeInTheDocument();
  });
});
