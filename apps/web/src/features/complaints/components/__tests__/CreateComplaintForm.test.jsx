import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { useRouter } from 'next/navigation';
import { handlers, ok } from '@/mocks/handlers';
import { isAuthenticated } from '@/features/authentication/services/authStorage';
import CreateComplaintForm from '../CreateComplaintForm';

/**
 * Taksonomi kategori pengaduan disederhanakan menjadi Aduan/Lapor/Lainnya
 * (4 September 2026) dan sub-kategori dibuang seluruhnya.
 *
 * Pilihan Dropdown.jsx TIDAK ada di DOM sebelum pemicunya diklik, jadi setiap
 * pemeriksaan di sini membuka dropdownnya lebih dulu -- pola sama
 * SurveyForm.test.jsx. Versi pertama berkas ini memeriksa ketiadaan teks
 * "Sub-Kategori" tanpa memilih kategori dulu, dan itu LULUS bahkan sebelum
 * fiturnya dibuang (dropdown sub-kategori memang hanya dirender setelah ada
 * kategori terpilih) -- lulus palsu yang baru terlihat karena uji ini
 * dijalankan lebih dulu dan diamati.
 */
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

/**
 * `isAuthenticated` dimock dengan `requireActual` untuk ekspor lainnya, BUKAN
 * seluruh modulnya: `services/api.js` memakai `clearSession` dan `getToken`
 * dari modul yang sama pada interseptornya, dan mengosongkan keduanya membuat
 * interseptor itu meledak alih-alih menguji apa pun. Alasan & pola sama
 * SurveyForm.test.jsx.
 *
 * Bakunya `true` di `beforeEach`, dan itu bukan kemalasan: seluruh uji yang
 * sudah ada di berkas ini ditulis ketika komponennya belum sadar sesi. Tanpa
 * baku itu mereka semua melihat dropdown yang menghimbau masuk, lalu berhenti
 * menguji hal yang mereka maksud.
 */
jest.mock('@/features/authentication/services/authStorage', () => ({
  ...jest.requireActual('@/features/authentication/services/authStorage'),
  isAuthenticated: jest.fn(),
}));

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  useRouter.mockReturnValue({ push: jest.fn() });
  isAuthenticated.mockReturnValue(true);
});

const kategoriDropdown = () => screen.getByLabelText(/kategori pengaduan/i);

describe('CreateComplaintForm — kategori umum', () => {
  it('menawarkan tepat tiga kategori dari API, tanpa kategori topik lama', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    fireEvent.click(kategoriDropdown());

    expect(await screen.findByText('Aduan')).toBeInTheDocument();
    expect(screen.getByText('Lapor')).toBeInTheDocument();
    expect(screen.getByText('Lainnya')).toBeInTheDocument();
    expect(screen.queryByText('Infrastruktur')).not.toBeInTheDocument();
    expect(screen.queryByText('Kesehatan')).not.toBeInTheDocument();
  });

  it('setelah kategori dipilih, tak ada lagi pilihan sub-kategori', async () => {
    // Handler sub-kategori SENGAJA dipasang kembali BERISI: tanpa ini uji lulus
    // hanya karena mocknya sudah dibuang (dropdown lama memang cuma muncul bila
    // daftarnya tak kosong) -- bukan karena fiturnya benar-benar hilang. Probe
    // yang tak dapat membedakan dua keadaan tidak membuktikan apa pun.
    server.use(
      http.get(`${API_BASE}/ref/complaint-sub-categories`, () =>
        ok(
          [{ kode: 'bpjs', nama: 'Layanan BPJS', kategoriKode: 'aduan' }],
          '/ref/complaint-sub-categories',
        ),
      ),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    fireEvent.click(kategoriDropdown());
    fireEvent.click(await screen.findByText('Aduan'));

    // Inilah keadaan tempat dropdown sub-kategori DULU muncul.
    await waitFor(() => expect(kategoriDropdown()).toHaveTextContent('Aduan'));
    expect(screen.queryByText(/sub-kategori/i)).not.toBeInTheDocument();
  });

  it('tidak memanggil endpoint sub-kategori yang sudah dihapus', async () => {
    const dipanggil = jest.fn();
    server.use(
      http.get(`${API_BASE}/ref/complaint-sub-categories`, () => {
        dipanggil();
        return ok([], '/ref/complaint-sub-categories');
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    expect(dipanggil).not.toHaveBeenCalled();
  });
  it('menyediakan centang kirim sebagai anonim, baku tidak tercentang', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    const centang = screen.getByRole('checkbox', { name: /anonim/i });
    expect(centang).not.toBeChecked();
  });
});

/**
 * Pengaduan yang pengirimnya tak tahu tujuannya (permintaan pengguna
 * 6 September 2026).
 *
 * LABELNYA BERUBAH 8 September 2026 atas permintaan pengguna: dari "Belum tahu
 * tujuannya" menjadi "Lainnya (belum tahu tujuannya)".
 *
 * Kata "Lainnya" saja pernah DITOLAK dengan sengaja — formulir yang sama punya
 * KATEGORI bernama "Lainnya" (reference.constants.ts), dan dua "Lainnya" yang
 * artinya berbeda pada satu formulir adalah sumber kesalahan pengisian. Bentuk
 * gabungan inilah kompromi yang disetujui pengguna: kata yang diminta ada di
 * depan, keterangannya menghilangkan ambiguitasnya.
 *
 * Uji kedua di bawah adalah KONTROL yang menjaga kompromi itu: ia memerah bila
 * labelnya kelak dipangkas menjadi "Lainnya" saja.
 */
describe('CreateComplaintForm — tujuan belum diketahui', () => {
  const opdDropdown = () => screen.getByLabelText(/opd \/ instansi tujuan/i);

  it('menawarkan pilihan "Lainnya (belum tahu tujuannya)"', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(opdDropdown());

    expect(await screen.findByText('Lainnya (belum tahu tujuannya)')).toBeInTheDocument();
  });

  it('label OPD-nya TIDAK boleh "Lainnya" saja — itu bentrok dengan nama kategori', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(opdDropdown());
    await screen.findByText('Lainnya (belum tahu tujuannya)');

    // Persis "Lainnya", bukan yang memuatnya. Kalau opsi seperti itu ada di
    // dropdown OPD, pengisi formulir menghadapi dua "Lainnya" berbeda arti.
    expect(screen.queryByText((teks) => teks.trim() === 'Lainnya')).not.toBeInTheDocument();
  });

  it('mengirim TANPA memilih OPD tidak menyertakan opdId sama sekali', async () => {
    let terkirim = null;
    server.use(
      http.post(`${API_BASE}/complaints`, async ({ request }) => {
        const form = await request.formData();
        terkirim = Object.fromEntries(form.entries());
        return ok({ id: 99, ticketNo: 'PGD20260906AAAA', opdId: null }, '/complaints');
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    fireEvent.click(kategoriDropdown());
    fireEvent.click(await screen.findByText('Lainnya'));
    fireEvent.change(screen.getByLabelText(/judul laporan/i), {
      target: { value: 'Tidak tahu ke mana' },
    });
    fireEvent.change(screen.getByLabelText(/uraian/i), {
      target: { value: 'Uraian pengaduan yang cukup panjang' },
    });
    fireEvent.click(screen.getByRole('button', { name: /kirim/i }));

    await waitFor(() => expect(terkirim).not.toBeNull());
    // INTI ujinya. Mengirim `opdId` kosong atau "NaN" akan ditolak backend 400
    // oleh @IsInt, jadi tak cukup "tidak memilih" -- medannya harus benar-benar
    // tidak ikut dalam FormData.
    expect('opdId' in terkirim).toBe(false);
    expect(terkirim.kategori).toBe('lainnya');
  });

  it('KONTROL: memilih OPD tetap mengirim opdId', async () => {
    let terkirim = null;
    server.use(
      http.post(`${API_BASE}/complaints`, async ({ request }) => {
        const form = await request.formData();
        terkirim = Object.fromEntries(form.entries());
        return ok({ id: 99, ticketNo: 'PGD20260906BBBB', opdId: 1 }, '/complaints');
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(opdDropdown());
    // Pilihan Dropdown.jsx dirender sebagai <li><button>, BUKAN role="option",
    // jadi ia dipilih lewat namanya. 'Dinas Kesehatan' adalah OPD pertama pada
    // fixture mocks/handlers.ts.
    fireEvent.click(await screen.findByRole('button', { name: 'Dinas Kesehatan' }));

    fireEvent.click(kategoriDropdown());
    fireEvent.click(await screen.findByText('Aduan'));
    fireEvent.change(screen.getByLabelText(/judul laporan/i), { target: { value: 'Judul' } });
    fireEvent.change(screen.getByLabelText(/uraian/i), {
      target: { value: 'Uraian pengaduan yang cukup panjang' },
    });
    fireEvent.click(screen.getByRole('button', { name: /kirim/i }));

    await waitFor(() => expect(terkirim).not.toBeNull());
    expect('opdId' in terkirim).toBe(true);
  });
});

/**
 * KEADAAN TANPA SESI (permintaan pengguna 8 September 2026).
 *
 * Formulir ini dirender di dua tempat, dan hanya satu di antaranya boleh dibuka
 * tanpa sesi: beranda '/'. Rute '/complaints/new' ada di dalam `config.matcher`
 * milik proxy.js, jadi cabang yang diuji blok ini hanya pernah terlihat di
 * beranda.
 *
 * Ketiga endpointnya sudah diukur menjawab 401 tanpa sesi: `GET /opd`,
 * `GET /ref/complaint-categories`, dan `POST /complaints`. Jadi yang terhalang
 * bukan satu dropdown melainkan seluruh pemakaian formulirnya.
 */
describe('CreateComplaintForm — tanpa sesi', () => {
  const opdDropdown = () => screen.getByLabelText(/opd \/ instansi tujuan/i);

  it('TIDAK menawarkan "Lainnya (belum tahu tujuannya)"', async () => {
    isAuthenticated.mockReturnValue(false);
    render(<CreateComplaintForm />);
    await screen.findByText(/masuk untuk melihat daftar instansi/i);

    fireEvent.click(opdDropdown());

    expect(screen.queryByText(/belum tahu tujuannya/i)).not.toBeInTheDocument();
  });

  it('kedua penampung dropdown menghimbau masuk, bukan menyuruh memilih', async () => {
    isAuthenticated.mockReturnValue(false);
    render(<CreateComplaintForm />);

    expect(await screen.findByText(/masuk untuk melihat daftar instansi/i)).toBeInTheDocument();
    expect(screen.getByText(/masuk untuk melihat kategori/i)).toBeInTheDocument();
    expect(screen.queryByText('Pilih Instansi')).not.toBeInTheDocument();
    expect(screen.queryByText('Pilih Kategori')).not.toBeInTheDocument();
  });

  it('menampilkan himbauan masuk di atas formulir', async () => {
    isAuthenticated.mockReturnValue(false);
    render(<CreateComplaintForm />);

    expect(await screen.findByText(/masuk terlebih dahulu/i)).toBeInTheDocument();
    expect(
      screen.getByText(/melihat daftar instansi dan kategori pengaduan/i),
    ).toBeInTheDocument();
  });

  it('menekan Kirim tidak memanggil API, melainkan menyuruh masuk', async () => {
    isAuthenticated.mockReturnValue(false);
    let dipanggil = false;
    server.use(
      http.post(`${API_BASE}/complaints`, () => {
        dipanggil = true;
        return ok({ id: 1, ticketNo: 'PGD20260908ZZZZ' }, '/complaints');
      }),
    );

    render(<CreateComplaintForm />);
    await screen.findByText(/masuk untuk melihat daftar instansi/i);

    fireEvent.change(screen.getByLabelText(/judul laporan/i), { target: { value: 'Judul' } });
    fireEvent.change(screen.getByLabelText(/uraian/i), {
      target: { value: 'Uraian pengaduan yang cukup panjang' },
    });
    fireEvent.click(screen.getByRole('button', { name: /kirim/i }));

    expect(
      await screen.findByText(/masuk terlebih dahulu untuk mengirim laporan/i),
    ).toBeInTheDocument();
    expect(dipanggil).toBe(false);
  });

  /**
   * KONTROL. Tanpa uji ini, ketiga uji di atas dapat lulus dengan cara
   * menyembunyikan himbauan dan pilihan "Lainnya" dari SEMUA keadaan, termasuk
   * keadaan bersesi yang justru memerlukan keduanya.
   */
  it('KONTROL: dengan sesi, himbauannya hilang dan "Lainnya" kembali ada', async () => {
    isAuthenticated.mockReturnValue(true);
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Instansi');

    expect(screen.queryByText(/masuk terlebih dahulu/i)).not.toBeInTheDocument();

    fireEvent.click(opdDropdown());

    expect(await screen.findByText('Lainnya (belum tahu tujuannya)')).toBeInTheDocument();
  });
});

/**
 * PENCARIAN INSTANSI (permintaan pengguna 11 September 2026: "tambah fitur
 * search untuk mencari data opd pada tampilan pengaduan warga").
 *
 * Daftar OPD nyata berisi 62 instansi aktif (terukur di basis data lokal),
 * sementara panel dropdown hanya setinggi 240px -- menggulir seluruhnya untuk
 * menemukan satu nama adalah pekerjaan yang tak perlu.
 *
 * Perilaku penyaringannya sendiri diuji di components/ui/__tests__/
 * Dropdown.test.jsx. Yang diuji di sini adalah dropdown MANA yang
 * mendapatkannya, dan pada keadaan sesi yang mana.
 */
describe('CreateComplaintForm — pencarian instansi', () => {
  const opdDropdown = () => screen.getByLabelText(/opd \/ instansi tujuan/i);
  const medanCari = () => screen.queryByRole('textbox', { name: /cari opd/i });

  it('dropdown OPD punya medan cari yang menyaring daftarnya', async () => {
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(opdDropdown());
    fireEvent.change(medanCari(), { target: { value: 'pendidikan' } });

    expect(screen.getByRole('button', { name: 'Dinas Pendidikan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dinas Kesehatan' })).not.toBeInTheDocument();
    // Jalan pintas "Lainnya" ikut tersaring. Kalau ia bertahan di antara hasil
    // pencarian, pengisi yang tak menemukan instansinya akan memilihnya karena
    // kebetulan itulah satu-satunya yang tersisa di layar.
    expect(screen.queryByText(/belum tahu tujuannya/i)).not.toBeInTheDocument();
  });

  it('dropdown Kategori TIDAK ikut mendapat medan cari', async () => {
    // Hanya tiga kategori. Medan cari di sana menambah langkah tanpa menghemat
    // satu pun gulir.
    render(<CreateComplaintForm />);
    await screen.findByText('Pilih Kategori');

    fireEvent.click(kategoriDropdown());

    expect(screen.queryByRole('textbox', { name: /cari/i })).not.toBeInTheDocument();
  });

  it('tanpa sesi, medan carinya tidak muncul', async () => {
    // `GET /opd` menjawab 401 tanpa sesi, jadi daftarnya kosong dan dropdown
    // hanya berisi penampung himbauan masuk. Medan cari di atas daftar kosong
    // menjanjikan sesuatu yang tak dapat ditepati.
    isAuthenticated.mockReturnValue(false);
    render(<CreateComplaintForm />);
    await screen.findByText(/masuk untuk melihat daftar instansi/i);

    fireEvent.click(opdDropdown());

    expect(medanCari()).not.toBeInTheDocument();
  });
});
