import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SurveyResponsesTable from '../SurveyResponsesTable';
import SurveyResponseAnswers from '../SurveyResponseAnswers';

/**
 * TC-FE-042 — Melihat respons survei (daftar & detail).
 *
 * **SKM dirancang anonim**, dan itulah pernyataan terpenting yang dijaga berkas
 * ini. `ResponseEntity` backend tak memuat identitas pengisi sama sekali, dan
 * kolom Responden/Email/No. Telepon pernah ada di tabel ini lalu dihapus. Kalau
 * kolom semacam itu kembali — entah dari data sungguhan atau dari nilai
 * karangan — janji anonimitas kepada warga batal, dan pada survei kepuasan
 * layanan publik itu bukan cacat tampilan melainkan cacat kepercayaan.
 *
 * Kerusakan lain yang ditangkap:
 *  - tautan Detail memakai awalan area yang salah → Admin Kabupaten mendarat di
 *    area OPD dan dipantulkan proxy;
 *  - jawaban skala ditampilkan sebagai id opsi, atau sebaliknya — dua tipe yang
 *    penyimpanannya memang berbeda (`nilai` vs `selectedOptionId`);
 *  - opsi yang sudah terhapus dari pertanyaan membuat jawabannya hilang dari
 *    layar, bukan ditampilkan apa adanya;
 *  - jawaban uraian yang dikosongkan terbaca sebagai jawaban yang tak terkirim.
 */

const RESPONS = [
  { id: 901, submittedAt: '2026-09-01T02:15:00.000Z', averageScore: 3.5 },
  { id: 902, submittedAt: '2026-09-02T04:30:00.000Z', averageScore: null },
];

/** Kata-kata yang TIDAK boleh muncul di daftar respons SKM. */
const KOLOM_IDENTITAS = ['Responden', 'Email', 'No. Telepon', 'Nama'];

describe('SurveyResponsesTable (TC-FE-042)', () => {
  const render1 = (basePath = '/admin-opd/surveys') =>
    render(<SurveyResponsesTable surveyId={336} responses={RESPONS} basePath={basePath} />);

  it('menomori respons berurutan tanpa menyebut identitas pengisi', () => {
    render1();

    expect(screen.getByText('Respons #1')).toBeInTheDocument();
    expect(screen.getByText('Respons #2')).toBeInTheDocument();

    const kepala = screen.getAllByRole('columnheader').map((th) => th.textContent);
    for (const dilarang of KOLOM_IDENTITAS) {
      expect(kepala.join(' | ')).not.toContain(dilarang);
    }
  });

  it('menampilkan waktu pengisian dalam format Indonesia', () => {
    render1();
    // Bukan ISO mentah: "2026-09-01T02:15:00.000Z" tak terbaca petugas.
    expect(screen.getByText(/1 Sep 2026/)).toBeInTheDocument();
  });

  it('menandai nilai yang belum dapat dihitung dengan strip, bukan angka nol', () => {
    render1();

    // Pada skala 1-4, "0.0 / 4" berarti penilaian terburuk — bukan "belum ada
    // pertanyaan skala pada respons ini".
    expect(screen.getByText('3.5 / 4')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByText('0.0 / 4')).not.toBeInTheDocument();
  });

  it('menautkan Detail ke area peran yang sedang dipakai', () => {
    const { unmount } = render1('/admin-opd/surveys');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      '/admin-opd/surveys/336/responses/901',
    );
    unmount();

    // Awalan yang tertanam keras membuat tabel ini tak bisa dipakai Admin
    // Kabupaten — proxy memantulkannya dari area OPD.
    render1('/admin-kab/surveys');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      '/admin-kab/surveys/336/responses/901',
    );
  });
});

describe('SurveyResponseAnswers (TC-FE-042)', () => {
  const JAWABAN = [
    {
      questionId: 1,
      questionText: 'Bagaimana kejelasan alur pelayanan?',
      questionType: 'Skala Penilaian 1-4',
      nilai: 4,
      nilaiLabel: 'Sangat jelas',
      teks: null,
      selectedOptionId: null,
    },
    {
      questionId: 2,
      questionText: 'Melalui kanal mana Anda mengakses layanan?',
      questionType: 'Pilihan Ganda',
      nilai: null,
      teks: null,
      selectedOptionId: 77,
      selectedOptionLabel: 'Datang langsung',
    },
    {
      questionId: 3,
      questionText: 'Adakah saran perbaikan?',
      questionType: 'Isian Teks',
      nilai: null,
      teks: 'Tambah loket di jam sibuk.',
      selectedOptionId: null,
    },
  ];

  it('menampilkan tiap tipe jawaban sesuai cara penyimpanannya', () => {
    render(<SurveyResponseAnswers answers={JAWABAN} />);

    // Skala menyimpan SKOR; pilihan ganda menyimpan ID OPSI. Menukar keduanya
    // adalah kerusakan yang pernah nyata (backend menolak "Opsi N bukan opsi
    // pertanyaan M"), dan di layar ia muncul sebagai angka tanpa makna.
    expect(screen.getByText(/Nilai: 4 \/ 4 — Sangat jelas/)).toBeInTheDocument();
    expect(screen.getByText('Datang langsung')).toBeInTheDocument();
    expect(screen.getByText('Tambah loket di jam sibuk.')).toBeInTheDocument();
  });

  it('menomori pertanyaan berurutan beserta lencana tipenya', () => {
    render(<SurveyResponseAnswers answers={JAWABAN} />);

    expect(screen.getByText(/Bagaimana kejelasan alur pelayanan\?/)).toBeInTheDocument();
    expect(screen.getByText('Skala Penilaian 1-4')).toBeInTheDocument();
    expect(screen.getByText('Pilihan Ganda')).toBeInTheDocument();
    expect(screen.getByText('Isian Teks')).toBeInTheDocument();
  });

  it('menampilkan id opsi apa adanya ketika labelnya sudah tak ada', () => {
    // Opsi yang dihapus dari pertanyaan sesudah respons masuk: jawabannya tetap
    // harus terlihat, bukan lenyap dari layar tanpa jejak.
    render(
      <SurveyResponseAnswers
        answers={[
          {
            questionId: 9,
            questionText: 'Opsi lama',
            questionType: 'Pilihan Ganda',
            nilai: null,
            teks: null,
            selectedOptionId: 404,
            selectedOptionLabel: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('Opsi terpilih #404')).toBeInTheDocument();
  });

  it('membedakan uraian yang sengaja dikosongkan dari yang tak ditanyakan', () => {
    render(
      <SurveyResponseAnswers
        answers={[
          {
            questionId: 3,
            questionText: 'Adakah saran perbaikan?',
            questionType: 'Isian Teks',
            nilai: null,
            teks: '',
            selectedOptionId: null,
          },
        ]}
      />,
    );

    // Pertanyaan uraian memang boleh dilewati; barisnya tetap ada dengan
    // keterangan, bukan hilang seolah tak pernah ditanyakan.
    expect(screen.getByText('(tidak diisi)')).toBeInTheDocument();
  });

  it('tidak merender apa pun ketika daftar jawabannya kosong', () => {
    render(<SurveyResponseAnswers answers={[]} />);

    expect(screen.getByText('Jawaban Survei')).toBeInTheDocument();
    expect(screen.queryByText(/Nilai:/)).not.toBeInTheDocument();
  });

  it('tidak menampilkan satu pun identitas pengisi', () => {
    const { container } = render(<SurveyResponseAnswers answers={JAWABAN} />);

    // Lapis kedua janji anonimitas: bukan cuma tabelnya, detailnya pun tidak
    // boleh membocorkan siapa yang mengisi.
    for (const dilarang of ['Responden:', 'Email', 'Telepon', 'NIK']) {
      expect(container.textContent).not.toContain(dilarang);
    }
  });
});
