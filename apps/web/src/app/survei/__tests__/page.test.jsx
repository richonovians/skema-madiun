import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useParams } from 'next/navigation';
import IsiSurveiPage from '../[id]/page';
import { isAuthenticated } from '@/features/authentication/services/authStorage';
import { sudahMengisiDiPeramban } from '@/utils/surveyFillMarker';
import { getPublicSurveyFill, getSurveyFill } from '@/features/surveys/services/surveys.api';
import { keluhanHidrasi } from '@/mocks/hidrasi';

/**
 * Rute `/survei/:id` melayani DUA keadaan dengan satu tautan. Yang diuji di sini
 * adalah pemilihan jalurnya, bukan tampilan wizardnya (itu sudah punya ujinya
 * sendiri): ada sesi -> endpoint berpenjaga, tanpa sesi -> endpoint publik.
 *
 * Layanan API di-mock, bukan MSW: yang perlu dibuktikan adalah FUNGSI MANA yang
 * dipanggil. Lewat MSW keduanya sama-sama menjawab 200 dan uji ini tak akan
 * dapat membedakan jalur yang benar dari yang salah.
 */
jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('@/features/authentication/services/authStorage', () => ({
  isAuthenticated: jest.fn(),
}));
jest.mock('@/utils/surveyFillMarker', () => ({
  sudahMengisiDiPeramban: jest.fn().mockReturnValue(false),
  tandaiSudahMengisi: jest.fn(),
}));
jest.mock('@/features/surveys/services/surveys.api', () => ({
  getSurveyFill: jest.fn(),
  getPublicSurveyFill: jest.fn(),
}));

const fill = {
  id: 5,
  title: 'Survei IKM Loket',
  periode: '2026-Q3',
  allowMultipleSubmit: false,
  izinkanAnonim: true,
  sudahMengisi: false,
  questions: [{ id: 1, text: 'Bagaimana pelayanannya?', type: 'scale_1_to_4' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  useParams.mockReturnValue({ id: '5' });
  getSurveyFill.mockResolvedValue(fill);
  getPublicSurveyFill.mockResolvedValue(fill);
  sudahMengisiDiPeramban.mockReturnValue(false);
});

describe('/survei/:id', () => {
  it('tanpa sesi: memakai endpoint publik', async () => {
    isAuthenticated.mockReturnValue(false);

    render(<IsiSurveiPage />);

    await waitFor(() => expect(getPublicSurveyFill).toHaveBeenCalledWith('5'));
    expect(getSurveyFill).not.toHaveBeenCalled();
  });

  it('dengan sesi: memakai endpoint berpenjaga (kontrol)', async () => {
    isAuthenticated.mockReturnValue(true);

    render(<IsiSurveiPage />);

    await waitFor(() => expect(getSurveyFill).toHaveBeenCalledWith('5'));
    expect(getPublicSurveyFill).not.toHaveBeenCalled();
  });

  it('dengan sesi & sudah pernah mengisi: anti-duplikat lama tetap berlaku', async () => {
    isAuthenticated.mockReturnValue(true);
    getSurveyFill.mockResolvedValue({ ...fill, sudahMengisi: true });

    render(<IsiSurveiPage />);

    expect(await screen.findByText(/sudah mengisi survei ini/i)).toBeInTheDocument();
  });

  it('tanpa sesi & sudah ditandai di peramban: pengisian kedua ditolak tanpa memanggil API', async () => {
    isAuthenticated.mockReturnValue(false);
    sudahMengisiDiPeramban.mockReturnValue(true);

    render(<IsiSurveiPage />);

    expect(await screen.findByText(/sudah mengisi survei ini/i)).toBeInTheDocument();
    // Memuat kuesioner yang pasti ditolak di antarmuka hanya memboroskan
    // permintaan dan sempat memperlihatkan formulir yang lalu hilang.
    expect(getPublicSurveyFill).not.toHaveBeenCalled();
  });

  it('penanda peramban TIDAK diperiksa saat ada sesi (kontrol)', async () => {
    isAuthenticated.mockReturnValue(true);
    sudahMengisiDiPeramban.mockReturnValue(true);

    render(<IsiSurveiPage />);

    // Pengguna bersesi dijaga dedupeUserId di backend; penanda peramban tak
    // boleh mengunci mereka dari survei yang boleh diisi berulang.
    await waitFor(() => expect(getSurveyFill).toHaveBeenCalledWith('5'));
    expect(screen.queryByText(/sudah mengisi survei ini/i)).not.toBeInTheDocument();
  });

  /**
   * LAYAR GALAT DITULIS ULANG 11 September 2026 atas permintaan pengguna:
   * kalimat galat dari backend dan tombol "Coba Lagi" dihapus, judulnya
   * menjadi "Survei tidak dapat ditemukan".
   *
   * Kalimat backend ("Survei anonim dengan id 28 tidak ditemukan") memang tak
   * berguna bagi yang membacanya: ia menyebut id internal dan istilah "survei
   * anonim" yang hanya dikenal di dalam kode. Tombol ulangnya pun menjanjikan
   * yang tak dapat ditepati -- survei yang tidak ada tak akan ada juga pada
   * percobaan kedua.
   *
   * Tautan beranda menggantikan tombol itu, dan itu bukan tambahan kosmetik:
   * rute ini berada di luar `config.matcher` proxy.js dan halamannya tidak
   * memuat navbar sama sekali, jadi layar tanpa satu pun tautan benar-benar
   * menjadi jalan buntu bagi pengunjung yang datang dari QR.
   */
  it('galat backend diganti satu kalimat sendiri, tanpa tombol ulang', async () => {
    isAuthenticated.mockReturnValue(false);
    getPublicSurveyFill.mockRejectedValue(new Error('Survei anonim dengan id 5 tidak ditemukan'));

    render(<IsiSurveiPage />);

    expect(await screen.findByText('Survei tidak dapat ditemukan')).toBeInTheDocument();
    expect(screen.queryByText(/survei anonim dengan id/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /coba lagi/i })).not.toBeInTheDocument();
  });

  it('menyediakan jalan keluar ke beranda', async () => {
    isAuthenticated.mockReturnValue(false);
    getPublicSurveyFill.mockRejectedValue(new Error('Survei anonim dengan id 5 tidak ditemukan'));

    render(<IsiSurveiPage />);

    expect(await screen.findByRole('link', { name: /kembali ke beranda/i })).toHaveAttribute(
      'href',
      '/',
    );
  });
});

/**
 * GERBANG PERSETUJUAN PDP (8 September 2026).
 *
 * Yang diuji di sini adalah URUTANNYA di dalam halaman: gerbangnya menahan
 * kuesioner bagi pengunjung tanpa sesi, dan tidak muncul sama sekali bagi yang
 * bersesi. Isi gerbangnya sendiri diuji di
 * features/surveys/components/__tests__/GerbangPengisianPublik.test.jsx.
 */
describe('/survei/:id - gerbang persetujuan', () => {
  /**
   * Melewati gerbang PDP dengan memilih "tanpa data diri". Sejak 8 September
   * 2026 nama & nomor HP WAJIB kecuali opsi itu dipilih, jadi jalan tercepat
   * melewati gerbang di sini adalah memilihnya. Kelengkapan medannya sendiri
   * sudah diuji di GerbangPengisianPublik.test.jsx, bukan urusan berkas ini.
   */
  const setuju = () => {
    fireEvent.click(screen.getByRole('checkbox', { name: /tanpa data diri/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /menyetujui/i }));
    fireEvent.click(screen.getByRole('button', { name: /setuju & mulai isi/i }));
  };

  it('TANPA sesi: gerbang tampil dan kuesioner ditahan', async () => {
    isAuthenticated.mockReturnValue(false);
    render(<IsiSurveiPage />);

    expect(await screen.findByText('Persetujuan Pemrosesan Data Pribadi')).toBeInTheDocument();
    expect(screen.queryByText(/Bagaimana pelayanannya\?/)).not.toBeInTheDocument();
  });

  it('sesudah setuju, kuesionernya tampil', async () => {
    isAuthenticated.mockReturnValue(false);
    render(<IsiSurveiPage />);
    await screen.findByText('Persetujuan Pemrosesan Data Pribadi');

    setuju();

    expect(await screen.findByText(/Bagaimana pelayanannya\?/)).toBeInTheDocument();
    expect(screen.queryByText('Persetujuan Pemrosesan Data Pribadi')).not.toBeInTheDocument();
  });

  /**
   * DIPERBARUI 8 September 2026. Sebelumnya uji ini menuntut pengguna bersesi
   * TIDAK menemui gerbang apa pun. Pengguna lalu meminta gerbang opsi anonim
   * muncul sebelum pengisian, jadi kini ada gerbang bagi mereka juga.
   *
   * Yang dijaga uji ini TETAP sama dan itulah sebabnya ia tidak dibuang:
   * gerbang PDP tak boleh muncul dua kali. Persetujuan pengguna bersesi sudah
   * tercatat di `users.consentAt` dan ditegakkan `assertConsented`, jadi
   * memintanya lagi hanya menghalangi tanpa menambah satu pun jaminan.
   */
  it('DENGAN sesi: gerbang anonim yang muncul, BUKAN gerbang PDP', async () => {
    isAuthenticated.mockReturnValue(true);
    render(<IsiSurveiPage />);

    expect(await screen.findByText('Sebelum Anda Mulai Mengisi')).toBeInTheDocument();
    expect(screen.queryByText('Persetujuan Pemrosesan Data Pribadi')).not.toBeInTheDocument();
    expect(screen.queryByText(/Bagaimana pelayanannya\?/)).not.toBeInTheDocument();
  });

  it('DENGAN sesi: sesudah gerbang anonim dilewati, kuesionernya tampil', async () => {
    isAuthenticated.mockReturnValue(true);
    render(<IsiSurveiPage />);
    await screen.findByText('Sebelum Anda Mulai Mengisi');

    fireEvent.click(screen.getByRole('button', { name: /mulai isi survei/i }));

    expect(await screen.findByText(/Bagaimana pelayanannya\?/)).toBeInTheDocument();
    expect(screen.queryByText('Sebelum Anda Mulai Mengisi')).not.toBeInTheDocument();
  });

  it('KONTROL: penanda peramban tetap menahan LEBIH DAHULU daripada gerbang', async () => {
    // Urutan penjaga. Pengunjung yang sudah ditandai tak boleh dimintai
    // persetujuan untuk survei yang tak akan pernah dapat ia kirim.
    isAuthenticated.mockReturnValue(false);
    sudahMengisiDiPeramban.mockReturnValue(true);
    render(<IsiSurveiPage />);

    expect(await screen.findByText(/sudah mengisi survei ini/i)).toBeInTheDocument();
    expect(screen.queryByText('Persetujuan Pemrosesan Data Pribadi')).not.toBeInTheDocument();
  });
});

/**
 * Halaman ini dirender lebih dulu di server, yang tak dapat melihat localStorage.
 * Baik ada-tidaknya sesi maupun penanda "sudah mengisi di perangkat ini" hanya
 * terbaca di peramban, dan keduanya mengubah pohon yang dirender: yang pertama
 * memilih gerbang, yang kedua mengganti seluruh halaman dengan layar terima
 * kasih. Render pertama di klien karenanya harus tetap sama dengan HTML server.
 */
describe('hidrasi halaman pengisian survei', () => {
  // Lolos BUKAN karena `adaSesi` aman secara umum, melainkan karena render
  // pertama halaman ini selalu pemintal `isLoading`: gerbang yang dipilih
  // `adaSesi` baru muncul sesudah kuesioner termuat, jauh sesudah hidrasi.
  // Ditulis apa adanya supaya tak ada yang membacanya sebagai bukti bahwa
  // membaca sesi lewat inisialisasi useState di sini tidak apa-apa.
  it('render pertama tidak bergantung sesi, sebab masih memuat', async () => {
    const keluhan = await keluhanHidrasi(<IsiSurveiPage />, {
      diServer: () => isAuthenticated.mockReturnValue(false),
      diKlien: () => isAuthenticated.mockReturnValue(true),
    });

    expect(keluhan).toEqual([]);
  });

  it('tak ada selisih server-klien bila survei sudah ditandai terisi di peramban', async () => {
    const keluhan = await keluhanHidrasi(<IsiSurveiPage />, {
      diServer: () => {
        isAuthenticated.mockReturnValue(false);
        sudahMengisiDiPeramban.mockReturnValue(false);
      },
      diKlien: () => sudahMengisiDiPeramban.mockReturnValue(true),
    });

    expect(keluhan).toEqual([]);
  });
});
