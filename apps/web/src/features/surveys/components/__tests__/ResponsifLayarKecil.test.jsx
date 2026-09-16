import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyResponseAnswers from '../SurveyResponseAnswers';
import SurveyPageHeader from '../SurveyPageHeader';
import SurveyTabs from '../SurveyTabs';
import SurveyResponsesTable from '../SurveyResponsesTable';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin-opd/surveys' }));

/**
 * PERBAIKAN RESPONSIF LAYAR KECIL (15 September 2026, laporan pengguna).
 *
 * Yang diukur di peramban, BUKAN di sini: jsdom tak menghitung tata letak sama
 * sekali -- lebar setiap elemen nol, dan media query tak pernah dievaluasi.
 * Uji di berkas ini karena itu hanya menjaga KONTRAK KELASNYA: susunan yang
 * menumpuk di layar sempit, dan wadah yang diizinkan menyusut. Bukti bahwa
 * halamannya benar-benar berhenti bergeser ke samping datang dari pengukuran
 * `window.scrollX` di Chrome, dan itu dilaporkan terpisah.
 *
 * Tanpa uji ini, kelas yang dicabut seseorang saat merapikan markup tak akan
 * memerahkan apa pun sampai ada yang membuka halamannya di ponsel.
 */
const jawaban = [
  {
    questionId: 1,
    nomor: 1,
    questionText: 'Persyaratan',
    questionType: 'Skala Penilaian 1-4',
    nilai: 3,
  },
];

describe('SurveyResponseAnswers — lencana jenis pertanyaan di layar sempit', () => {
  it('judul dan lencana menumpuk di layar sempit, berdampingan mulai sm', () => {
    const { container } = render(<SurveyResponseAnswers answers={jawaban} />);

    const baris = container.querySelector('[data-baris-pertanyaan]');

    expect(baris).not.toBeNull();
    expect(baris.className).toMatch(/\bflex-col\b/);
    expect(baris.className).toMatch(/\bsm:flex-row\b/);
  });

  /**
   * `shrink-0` TANPA SYARAT inilah yang mendorong lencana keluar layar: ia
   * menolak menyusut sementara judul pertanyaan di sebelahnya membungkus. Mulai
   * `sm` ia justru benar -- di sana keduanya memang berdampingan, dan lencana
   * yang ikut menyusut akan memotong namanya sendiri.
   */
  it('lencananya tidak lagi menolak menyusut di layar sempit', () => {
    render(<SurveyResponseAnswers answers={jawaban} />);

    const lencana = screen.getByText('Skala Penilaian 1-4');

    expect(lencana.className).not.toMatch(/(^|\s)shrink-0\b/);
    expect(lencana.className).toMatch(/\bsm:shrink-0\b/);
  });

  it('KONTROL: isi jawabannya tetap tampil', () => {
    render(<SurveyResponseAnswers answers={jawaban} />);

    expect(screen.getByText('Persyaratan')).toBeInTheDocument();
    expect(screen.getByText(/Nilai: 3 \/ 4/)).toBeInTheDocument();
  });
});

describe('SurveyPageHeader — baris aksi di layar sedang', () => {
  /**
   * Terukur di Chrome pada 768px: barisnya melebar 87px ke luar layar karena
   * judul di kiri tak boleh menyusut dan barisnya tak boleh membungkus.
   */
  it('barisnya boleh membungkus', () => {
    const { container } = render(<SurveyPageHeader surveys={[]} />);

    expect(container.firstChild.className).toMatch(/\bflex-wrap\b/);
  });

  it('blok judul boleh menyusut', () => {
    const { container } = render(<SurveyPageHeader surveys={[]} />);

    const blokJudul = container.querySelector('[data-blok-judul]');

    expect(blokJudul).not.toBeNull();
    expect(blokJudul.className).toMatch(/\bmin-w-0\b/);
  });
});

describe('SurveyTabs — deretan tab di layar sedang', () => {
  /**
   * `overflow-x-auto` saja tak cukup di dalam baris flex: tanpa `min-w-0`
   * wadahnya tetap diukur selebar isinya, jadi empat tab plus tombol "Buat
   * Survei Baru" mendorong halaman alih-alih menggulung di tempat.
   */
  it('wadah tabnya boleh menyusut, bukan hanya menggulung', () => {
    const { container } = render(<SurveyTabs activeTab="all" onTabChange={() => {}} />);

    const wadah = container.querySelector('[data-deret-tab]');

    expect(wadah).not.toBeNull();
    expect(wadah.className).toMatch(/\bmin-w-0\b/);
    expect(wadah.className).toMatch(/overflow-x-auto/);
  });

  it('KONTROL: keempat tab tetap ada', () => {
    render(<SurveyTabs activeTab="all" onTabChange={() => {}} />);

    for (const label of ['Semua Paket', 'Survei Aktif', 'Draf Kuesioner', 'Survei Ditutup']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });
});

/**
 * SISA GESERAN 9px di /admin-opd/surveys/[id]/responses pada 320px
 * (16 September 2026).
 *
 * AKAR MASALAHNYA BUKAN TABELNYA. Terukur di Chrome:
 *
 *   html.scrollWidth = 329   <- 9px lebih lebar dari layar
 *   body.scrollWidth = 320   <- badan halaman sendiri pas
 *   tepi kanan <span class="sr-only">Aksi</span> = 329   <- cocok persis
 *
 * `sr-only` adalah `position: absolute`. Seluruh rantai leluhurnya -- th, tr,
 * thead, table, wadah `overflow-x-auto`, sampai <main> -- `position: static`,
 * jadi blok penampungnya melompat sampai ke blok awal dokumen. Elemen yang
 * penampungnya BERADA DI LUAR sebuah wadah ber-overflow tidak dijepit wadah itu:
 * itulah sebabnya `overflow-x: hidden` pada wadah maupun pada <main> sama sekali
 * tak menolong, dan sebabnya jalur 9px itu kosong -- `sr-only` memakai
 * `clip: rect(0,0,0,0)`, jadi ia tak menggambar apa pun.
 *
 * Dibuktikan lewat empat percobaan di peramban, satu variabel masing-masing:
 *
 *   apa adanya                          -> 9px, html.scrollW 329
 *   `relative` pada <th> pemilik span   -> 0px, html.scrollW 320
 *   `relative` pada wadah overflow      -> 0px, html.scrollW 320
 *   span sr-only dibuang                -> 0px, html.scrollW 320
 *
 * Yang dipilih adalah `relative` pada <th>-nya: label tersembunyi itu memang
 * milik sel itu, dan memasangnya di wadah `Table` bersama akan menjadikan wadah
 * itu penampung bagi SETIAP keturunan absolut di semua tabel aplikasi --
 * termasuk menu yang memang dimaksudkan keluar dari gulirannya.
 *
 * Dua "obat" yang sempat saya catat sebelumnya, `table-layout: fixed` dan
 * `contain: paint`, ternyata bekerja karena efek sampingnya belaka: yang pertama
 * mempersempit tabel sehingga posisi statis <th> bergeser ke kiri, yang kedua
 * menjadikan wadahnya penampung bagi keturunan absolut. Keduanya menutupi
 * gejala, bukan sebabnya.
 */
describe('SurveyResponsesTable — label tersembunyi tak boleh melebarkan halaman', () => {
  it('sel pemilik label sr-only menjadi penampung posisinya sendiri', () => {
    const { container } = render(
      <SurveyResponsesTable surveyId={1} responses={[]} basePath="/admin-opd/surveys" />,
    );

    const sel = container.querySelector('span.sr-only').closest('th');

    expect(sel.className).toMatch(/\brelative\b/);
  });

  /**
   * PASANGAN kontrol. Label yang dihapus juga meniadakan geserannya -- dan
   * bersamanya hilang pula satu-satunya keterangan kolom "Detail" bagi pengguna
   * pembaca layar, yang justru alasan span ini ada.
   */
  it('KONTROL: labelnya tetap ada dan tetap tersembunyi secara visual', () => {
    const { container } = render(
      <SurveyResponsesTable surveyId={1} responses={[]} basePath="/admin-opd/surveys" />,
    );

    const label = container.querySelector('span.sr-only');

    expect(label).not.toBeNull();
    expect(label).toHaveTextContent('Aksi');
  });
});
