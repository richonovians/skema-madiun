import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyResponsesTable from '../SurveyResponsesTable';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

/**
 * NOMOR RESPONS ADALAH URUTAN MASUK, BUKAN POSISI BARIS (4 Oktober 2026,
 * laporan pengguna: "urutan respon survei terbalik, jadi respon paling pertama
 * masuk akan tertimbun dengan respon survei yang akan masuk setelahnya").
 *
 * Komponen ini dulu menomori dari POSISI ARRAY (`index + 1`) atas daftar yang
 * backend-nya mengurutkan TERBARU DAHULU. Dua akibatnya, dan keduanya diuji di
 * bawah:
 *
 *   Respons yang kemarin "#1" menjadi "#2" begitu ada satu pengisi baru. Nomor
 *   yang berubah sendiri tak dapat dipakai merujuk apa pun; admin yang mencatat
 *   "periksa respons #3" menunjuk respons yang berbeda keesokan harinya.
 *
 *   Halaman kedua mengulang dari "#1", sebab `index` selalu mulai dari nol pada
 *   potongan yang diterimanya.
 *
 * Nomornya kini datang dari backend (`ResponseEntity.nomor`), dihitung dari
 * `total` paginasi. Frontend memang TIDAK DAPAT menghitungnya sendiri: ia hanya
 * memegang satu halaman dan tak tahu ada berapa respons sebelum baris
 * pertamanya.
 *
 * URUTAN TAMPILAN TETAP terbaru dahulu. Itu pilihan tersurat pengguna; yang
 * diperbaiki nomornya, bukan susunannya.
 */
const baris = (nomor, id) => ({
  id,
  nomor,
  submittedAt: '2026-10-01T03:00:00.000Z',
  averageScore: 3.5,
  respondent: { name: null, phone: null, gender: null, ageGroup: null, isAnonim: true },
});

const render1 = (responses) =>
  render(<SurveyResponsesTable responses={responses} surveyId={3} basePath="/admin-opd/surveys" />);

describe('SurveyResponsesTable — nomor respons', () => {
  it('memakai nomor dari backend, bukan posisi baris', () => {
    // Terbaru dahulu: baris pertama adalah respons ke-523, bukan "#1".
    render1([baris(523, 90), baris(522, 80), baris(521, 70)]);

    expect(screen.getByText('Respons #523')).toBeInTheDocument();
    expect(screen.getByText('Respons #522')).toBeInTheDocument();
    expect(screen.getByText('Respons #521')).toBeInTheDocument();
  });

  it('TIDAK menomori ulang dari 1 pada potongan halaman berikutnya', () => {
    // Pagar utama berkas ini. Dengan `index + 1`, ketiganya akan terbaca
    // "#1 #2 #3" walau tak satu pun di antaranya respons pertama.
    render1([baris(12, 30), baris(11, 20), baris(10, 10)]);

    expect(screen.queryByText('Respons #1')).not.toBeInTheDocument();
    expect(screen.queryByText('Respons #2')).not.toBeInTheDocument();
    expect(screen.queryByText('Respons #3')).not.toBeInTheDocument();
  });

  it('menggambar nomor apa adanya menurut urutan baris yang diterima', () => {
    // Inilah keluhan aslinya: yang pertama masuk tidak boleh "tertimbun" di
    // balik nomor besar hanya karena ada pengisi sesudahnya.
    //
    // POSISINYA IKUT DIUJI, dan itu bukan kelebihan. Memeriksa "ada tulisan
    // #1 di suatu tempat" saja LULUS tanpa perbaikan apa pun, sebab `index + 1`
    // juga menghasilkan #1 -- hanya saja pada baris yang salah. Uji yang lulus
    // sebelum kodenya diperbaiki tidak membuktikan apa-apa.
    //
    // URUTANNYA DIBALIK 4 Oktober 2026 (permintaan kedua pengguna pada hari
    // yang sama): backend kini mengirim terlama dahulu, sehingga #1 berada di
    // BARIS PERTAMA. Tabel ini tak pernah mengurutkan apa pun sendiri -- ia
    // menggambar baris sesuai yang diberikan, dan itulah yang dijaga di sini.
    render1([baris(1, 10), baris(2, 20)]);

    const sel = screen.getAllByText(/^Respons #\d+$/).map((n) => n.textContent);
    expect(sel).toEqual(['Respons #1', 'Respons #2']);
  });

  /**
   * `nomor` TIDAK ADA pada jalur yang tak berpaginasi (mis. `findOne` backend
   * sengaja tak mengirimnya). Baris tanpa nomor tidak boleh menampilkan
   * "Respons #undefined" maupun diam-diam jatuh kembali ke posisi array, sebab
   * jatuh ke posisi berarti mengembalikan cacat yang baru saja diperbaiki.
   */
  it('baris tanpa nomor tidak menampilkan angka karangan', () => {
    render1([baris(undefined, 10)]);

    // Diperiksa di dalam SEL, bukan di seluruh dokumen: kepala kolomnya juga
    // berbunyi "Respons", jadi pencarian global akan cocok dua kali dan
    // menuduh kode yang sudah benar.
    const sel = screen.getAllByRole('cell')[0];

    expect(sel).toHaveTextContent('Respons');
    expect(sel.textContent).not.toMatch(/#/);
  });
});
