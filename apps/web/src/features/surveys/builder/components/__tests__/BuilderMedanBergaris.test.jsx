import React from 'react';
import { render, screen } from '@testing-library/react';
import BuilderCanvas from '../BuilderCanvas';
import QuestionBlock from '../QuestionBlock';

/**
 * MEDAN YANG HARUS DIISI DIBERI GARIS PINGGIR (4 Oktober 2026, permintaan
 * pengguna: "agar memudahkan orang opd/kabupaten tempat-tempat yang harus
 * diisi pada surveinya").
 *
 * Ketiganya -- nama survei, periode, dan teks pertanyaan kustom -- memang
 * dapat disunting, tetapi tak satu pun MENGATAKANNYA saat diam. Nama survei
 * dan periode memakai `border-transparent` sehingga garisnya baru lahir ketika
 * penunjuk kebetulan lewat di atasnya, dan teks pertanyaan memakai
 * `border-none p-0` sehingga terbaca sebagai judul biasa. Bagi yang pertama
 * kali menyusun survei, tak ada yang menunjukkan di mana ia boleh mengetik.
 *
 * Keadaan sorot dan fokus tidak diubah; yang diperbaiki hanya keadaan DIAM.
 *
 * jsdom tidak menghitung gaya, jadi yang diperiksa di sini kelas yang
 * terpasang -- bukan garis yang sungguh tergambar.
 */
const propKanvas = {
  questions: [],
  title: 'Survei Contoh',
  periode: '2026-Q1',
  // Periode hanya dapat disunting selagi susunan masih bebas (`isEditable =
  // canReorder && onTitleChange` di BuilderCanvas), berbeda dari judul yang
  // mengikuti aturan 'meta'. Tanpa ini kedua dropdownnya tak dirender sama
  // sekali dan ujinya memeriksa halaman kosong.
  canReorder: true,
  onTitleChange: () => {},
  onTitleBlur: () => {},
  onPeriodeCommit: () => {},
  onDelete: () => {},
  onUpdate: () => {},
  onTextCommit: () => {},
  onAdd: () => {},
};

const pertanyaanKustom = {
  id: 'q1',
  title: 'PERTANYAAN KUSTOM #1',
  text: 'Pertanyaan baru',
  type: 'text',
  isBaku: false,
};

describe('Builder — medan isian diberi garis pinggir', () => {
  it('nama survei bergaris walau tak disorot', () => {
    render(<BuilderCanvas {...propKanvas} />);

    const judul = screen.getByLabelText('Judul survei');
    expect(judul.className).toContain('border-border');
    expect(judul.className).not.toContain('border-transparent');
  });

  it('triwulan dan tahun bergaris walau tak disorot', () => {
    render(<BuilderCanvas {...propKanvas} />);

    const pilihan = screen.getAllByRole('combobox');
    expect(pilihan).toHaveLength(2);
    pilihan.forEach((el) => {
      expect(el.className).toContain('border-border');
      expect(el.className).not.toContain('border-transparent');
    });
  });

  it('teks pertanyaan kustom bergaris, bukan tampak seperti judul', () => {
    render(
      <QuestionBlock
        question={pertanyaanKustom}
        index={0}
        total={1}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );

    const teks = screen.getByPlaceholderText('Tulis pertanyaan di sini...');
    expect(teks.className).toContain('border-border');
    expect(teks.className).not.toContain('border-none');
  });

  /**
   * PAGAR UTAMA. Di luar status draf, ketiganya BUKAN input sama sekali
   * (`PATCH /surveys/:id` menolaknya di backend). Kotak kosong bergaris di
   * sana akan mengundang pengisian yang pasti gagal -- kebalikan dari tujuan
   * perubahan ini.
   */
  it('tidak memasang kotak isian ketika meta sudah terkunci', () => {
    render(<BuilderCanvas {...propKanvas} canEditMeta={false} canReorder={false} />);

    expect(screen.queryByLabelText('Judul survei')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Survei Contoh')).toBeInTheDocument();
  });
});
