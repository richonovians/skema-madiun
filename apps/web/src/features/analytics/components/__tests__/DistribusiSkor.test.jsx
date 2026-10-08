import React from 'react';
import { render, screen, within } from '@testing-library/react';
import DistribusiSkor from '../DistribusiSkor';

/**
 * KARTU DISTRIBUSI SKOR (8 Oktober 2026, permintaan pengguna: kartu "Distribusi
 * Skor Belum Tersedia" di Statistik & Laporan diganti fitur sungguhan).
 *
 * Satu baris per pertanyaan skala: bilah bertumpuk 100% berisi empat nilai
 * (1 Buruk ... 4 Sangat Baik). Angkanya selalu ditulis sebagai TEKS, tak hanya
 * warna: dua nilai bertetangga yang warnanya mirip tak boleh membuat bacaan
 * bergantung pada penglihatan warna.
 */
const NAMA = ['Buruk', 'Kurang', 'Baik', 'Sangat Baik'];

/** Bentuk keluaran adaptSebaranSkor. */
const butir = (id, jumlah, over = {}) => {
  const total = jumlah.reduce((a, b) => a + b, 0);
  return {
    id,
    kode: null,
    teks: `Pertanyaan ${id}`,
    total,
    nilai: jumlah.map((j, i) => ({
      nilai: i + 1,
      label: NAMA[i],
      jumlah: j,
      persen: total > 0 ? (j / total) * 100 : 0,
    })),
    ...over,
  };
};

const sajikan = (sebaran) => render(<DistribusiSkor sebaran={sebaran} />);

/** Baris dicari lewat teks pertanyaannya, supaya asersi tak bergantung pada urutan. */
const baris = (teks) => screen.getByText(teks).closest('li');

describe('DistribusiSkor — isi', () => {
  it('memuat judul dan keterangan empat nilai', () => {
    sajikan([butir(1, [0, 0, 0, 3])]);

    expect(screen.getByRole('heading', { name: /distribusi skor per pertanyaan/i })).toBeInTheDocument();
    const legenda = within(screen.getByRole('list', { name: /keterangan nilai/i }));
    // Teks LENGKAP, bukan /Baik/: itu juga cocok dengan "4 Sangat Baik". Nomornya
    // ikut diperiksa -- keterangan yang salah urut menyesatkan pembaca bilah.
    NAMA.forEach((n, i) => expect(legenda.getByText(`${i + 1} ${n}`)).toBeInTheDocument());
  });

  it('satu baris per pertanyaan, dengan teksnya', () => {
    sajikan([butir(1, [1, 0, 0, 0]), butir(2, [0, 1, 0, 0])]);

    expect(screen.getByText('Pertanyaan 1')).toBeInTheDocument();
    expect(screen.getByText('Pertanyaan 2')).toBeInTheDocument();
  });

  it('unsur baku menampilkan kodenya; pertanyaan tambahan tidak', () => {
    sajikan([butir(1, [1, 0, 0, 0], { kode: 'U3' }), butir(2, [0, 1, 0, 0])]);

    expect(within(baris('Pertanyaan 1')).getByText('U3')).toBeInTheDocument();
    expect(within(baris('Pertanyaan 2')).queryByText(/^U\d/)).toBeNull();
  });

  it('menuliskan jumlah dan persen tiap nilai yang dipilih sebagai TEKS', () => {
    sajikan([butir(1, [0, 1, 1, 2])]);
    const teks = within(baris('Pertanyaan 1'));

    expect(teks.getByText(/Sangat Baik/)).toHaveTextContent('Sangat Baik 2 (50%)');
    expect(teks.getByText(/^Kurang/)).toHaveTextContent('Kurang 1 (25%)');
    expect(teks.getByText(/^Baik/)).toHaveTextContent('Baik 1 (25%)');
  });

  it('nilai yang tak dipilih siapa pun tidak dituliskan di baris', () => {
    // Empat butir "0 (0%)" per baris menenggelamkan bacaan pada sembilan baris;
    // tanpa angkanya segmen itu memang tak ada di bilah.
    sajikan([butir(1, [0, 0, 0, 4])]);
    const teks = within(baris('Pertanyaan 1'));

    expect(teks.queryByText(/Buruk/)).toBeNull();
    expect(teks.queryByText(/Kurang/)).toBeNull();
  });

  it('menyebut jumlah jawaban pada pertanyaan itu', () => {
    sajikan([butir(1, [1, 1, 1, 2])]);

    expect(within(baris('Pertanyaan 1')).getByText('5 jawaban')).toBeInTheDocument();
  });
});

describe('DistribusiSkor — bilah', () => {
  it('bilah memiliki nama aksesibel yang memuat SEMUA empat nilai, termasuk yang 0', () => {
    sajikan([butir(1, [0, 1, 1, 2])]);

    const bilah = within(baris('Pertanyaan 1')).getByRole('img');

    expect(bilah).toHaveAccessibleName(
      'Pertanyaan 1: Buruk 0, Kurang 1, Baik 1, Sangat Baik 2 dari 4 jawaban',
    );
  });

  it('hanya segmen yang berjumlah > 0 digambar, selebar persennya', () => {
    sajikan([butir(1, [0, 1, 1, 2])]);

    const segmen = within(baris('Pertanyaan 1')).getByRole('img').children;

    expect(segmen).toHaveLength(3);
    expect([...segmen].map((s) => s.style.width)).toEqual(['25%', '25%', '50%']);
  });

  it('lebar segmen EKSAK, bukan dibulatkan: ketiganya 1/3 memenuhi bilah', () => {
    sajikan([butir(1, [1, 1, 1, 0])]);

    const lebar = [...within(baris('Pertanyaan 1')).getByRole('img').children].map((s) =>
      parseFloat(s.style.width),
    );

    expect(lebar.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 4);
  });

  it('satu nilai menguasai: satu segmen penuh', () => {
    sajikan([butir(1, [0, 0, 0, 7])]);

    const segmen = within(baris('Pertanyaan 1')).getByRole('img').children;

    expect(segmen).toHaveLength(1);
    expect(segmen[0].style.width).toBe('100%');
  });

  it('persen pada teks dibulatkan, tetapi lebar tetap eksak', () => {
    sajikan([butir(1, [1, 1, 1, 0])]);

    expect(within(baris('Pertanyaan 1')).getAllByText(/\(33%\)/)).toHaveLength(3);
  });
});

describe('DistribusiSkor — keadaan tak lengkap', () => {
  it('pertanyaan belum dijawab: tetap tampil, tertulis "Belum ada jawaban", tanpa bilah', () => {
    sajikan([butir(1, [0, 0, 0, 0])]);
    const sel = within(baris('Pertanyaan 1'));

    expect(sel.getByText(/belum ada jawaban/i)).toBeInTheDocument();
    expect(sel.queryByRole('img')).toBeNull();
  });

  it('dipagari PER BARIS: yang kosong tak memengaruhi yang berisi', () => {
    sajikan([butir(1, [0, 0, 0, 0]), butir(2, [0, 0, 2, 0])]);

    expect(within(baris('Pertanyaan 1')).queryByRole('img')).toBeNull();
    expect(within(baris('Pertanyaan 2')).getByRole('img')).toBeInTheDocument();
  });

  it('survei tanpa pertanyaan skala (larik kosong): pesan yang menyebut sebabnya', () => {
    sajikan([]);

    expect(screen.getByText(/belum memuat pertanyaan skala/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('data belum dikirim backend (undefined): tak menggambar apa pun, tak melempar galat', () => {
    // Beda dari larik kosong: di sini backend lama yang belum membawa kuncinya.
    // Menyatakan "tak punya pertanyaan skala" akan menjadi klaim yang salah.
    const { container } = sajikan(undefined);

    expect(container).toBeEmptyDOMElement();
  });
});
