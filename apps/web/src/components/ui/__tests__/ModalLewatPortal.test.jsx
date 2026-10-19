import React from 'react';
import { render, screen } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';
import ConfirmActionModal from '../ConfirmActionModal';
import QuestionOptionsModal from '@/features/surveys/builder/components/QuestionOptionsModal';

/**
 * MODAL DIGAMBAR DI `document.body`, BUKAN DI TEMPAT IA DIPANGGIL
 * (4 Oktober 2026, laporan pengguna: "saat saya ingin mengubah
 * pertanyaan/jawaban survei, tiba-tiba tombol perkecil sidebar muncul
 * sendiri").
 *
 * Tombol itu tak pernah muncul sendiri -- ia selalu ada. Yang berubah adalah
 * segala sesuatu di sekelilingnya menjadi gelap dan buram, sehingga ia
 * tertinggal sebagai satu-satunya benda tajam di layar.
 *
 * Rantai sebabnya bertingkat tiga:
 *   1. BuilderLayout berkelas `relative z-50`, dan itu membuat KONTEKS
 *      PENUMPUKAN baru.
 *   2. Modal di dalamnya berkelas `z-[9999]` -- angka yang hanya berlaku DI
 *      DALAM konteks itu. Terhadap dunia luar, seluruh builder beserta
 *      modalnya tetap satu lapisan setinggi 50.
 *   3. Tombol ciutkan sidebar `fixed z-[60]`, saudara di luar builder, jadi ia
 *      menang dan digambar di atas latar gelap modal.
 *
 * Portal memutus rantai itu pada mata rantai pertama: begitu modalnya menjadi
 * anak `document.body`, `z-[9999]`-nya bersaing di tingkat yang sama dengan
 * tombol `z-[60]` dan benar-benar berarti. Pola yang sama sudah dipakai
 * RoleLoginPicker, dengan sebab berbeda (leluhur ber-transform).
 *
 * YANG TIDAK DAPAT DIBUKTIKAN DI SINI: bahwa tombolnya benar-benar tertutup.
 * jsdom tak menghitung z-index maupun tata letak sama sekali. Yang diuji
 * berkas ini adalah struktur DOM-nya -- satu-satunya bagian yang memang dapat
 * dijawab tanpa peramban sungguhan.
 */
const TEKS_PENANDA = {
  dialog: 'Ganti survei utama?',
  aksi: 'Hapus survei ini?',
  opsi: 'Ubah Opsi Jawaban',
};

/** Pembungkus bergaya BuilderLayout: inilah kurungan yang harus ditembus. */
const Kurungan = ({ children }) => <div className="relative z-50">{children}</div>;

describe('Modal digambar lewat portal ke document.body', () => {
  it('ConfirmDialog tidak terkurung di dalam pemanggilnya', () => {
    const { container } = render(
      <Kurungan>
        <ConfirmDialog isOpen title={TEKS_PENANDA.dialog} description="." onConfirm={() => {}} onCancel={() => {}} />
      </Kurungan>,
    );

    const judul = screen.getByText(TEKS_PENANDA.dialog);
    expect(container.contains(judul)).toBe(false);
    expect(document.body.contains(judul)).toBe(true);
  });

  it('ConfirmActionModal tidak terkurung di dalam pemanggilnya', () => {
    const { container } = render(
      <Kurungan>
        <ConfirmActionModal isOpen title={TEKS_PENANDA.aksi} description="." onConfirm={() => {}} onCancel={() => {}} />
      </Kurungan>,
    );

    const judul = screen.getByText(TEKS_PENANDA.aksi);
    expect(container.contains(judul)).toBe(false);
    expect(document.body.contains(judul)).toBe(true);
  });

  it('QuestionOptionsModal tidak terkurung di dalam pemanggilnya', () => {
    const { container } = render(
      <Kurungan>
        <QuestionOptionsModal mode="edit" variant="pilihan" onSubmit={() => {}} onCancel={() => {}} />
      </Kurungan>,
    );

    const judul = screen.getByText(TEKS_PENANDA.opsi);
    expect(container.contains(judul)).toBe(false);
    expect(document.body.contains(judul)).toBe(true);
  });

  /**
   * PAGAR UTAMA. Modal yang tertutup tak boleh meninggalkan apa pun di
   * `document.body`: portal yang isinya tak dibersihkan akan menumpuk latar
   * gelap tak terlihat yang menadah setiap klik pengguna.
   */
  it('tidak meninggalkan apa pun di body ketika tertutup', () => {
    render(
      <Kurungan>
        <ConfirmDialog isOpen={false} title={TEKS_PENANDA.dialog} description="." />
      </Kurungan>,
    );

    expect(screen.queryByText(TEKS_PENANDA.dialog)).not.toBeInTheDocument();
  });
});
