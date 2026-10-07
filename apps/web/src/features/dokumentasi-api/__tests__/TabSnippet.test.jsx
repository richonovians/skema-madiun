import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TabSnippet from '../components/TabSnippet';
import { adaptOpenApi } from '../adapters/openapi.adapter';
import { dokumenOpenApi } from '../__fixtures__/openapi.fixture';

const operasi = (metode, path) =>
  adaptOpenApi(dokumenOpenApi)[0].operasi.find(
    (o) => o.metode === metode && (!path || o.path === path),
  );

const bukaRespons = () => fireEvent.click(screen.getByRole('button', { name: /^respons$/i }));

describe('TabSnippet', () => {
  it('menyediakan tab respons di samping curl dan fetch', () => {
    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);

    expect(screen.getByRole('button', { name: /^curl$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fetch$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^respons$/i })).toBeInTheDocument();
  });

  /**
   * Keduanya tampil SEKALIGUS, bukan bergantian di balik tab lagi: yang
   * ditanyakan pengguna adalah "berhasil dan gagal", dan membandingkan dua
   * bentuk envelope yang berbeda menuntut keduanya terlihat bersamaan.
   */
  it('menampilkan contoh berhasil dan gagal sekaligus', () => {
    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);
    bukaRespons();

    const sukses = screen.getByTestId('contoh-berhasil').textContent;
    const gagal = screen.getByTestId('contoh-gagal').textContent;

    expect(sukses).toContain('"success": true');
    expect(sukses).toContain('"statusCode": 200');
    expect(gagal).toContain('"success": false');
    expect(gagal).toContain('UNAUTHORIZED');
  });

  /**
   * PAGAR KEJUJURAN. Dokumen OpenAPI tidak mendeklarasikan satu pun respons
   * galat; contoh gagal diturunkan dari perilaku terukur penyaring galat
   * global. Tanpa kalimat ini pembaca akan mengira itu kontrak resmi.
   */
  it('menyatakan bahwa kode galat tidak dideklarasikan dokumen', () => {
    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);
    bukaRespons();

    expect(screen.getByText(/tidak mendeklarasikan respons galat/i)).toBeInTheDocument();
  });

  it('menyebut skema respons yang belum dideklarasikan, bukan mengarang bentuk', () => {
    render(<TabSnippet operasi={operasi('DELETE')} />);
    bukaRespons();

    expect(screen.getByText(/skema respons.*belum dideklarasikan/i)).toBeInTheDocument();
    expect(screen.getByTestId('contoh-berhasil').textContent).toContain('"data": null');
  });

  it('menyebut kemungkinan pagination hanya pada endpoint berdaftar', () => {
    const { unmount } = render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);
    bukaRespons();
    expect(screen.getByText(/meta\.pagination/i)).toBeInTheDocument();
    unmount();

    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys/{id}')} />);
    bukaRespons();
    expect(screen.queryByText(/meta\.pagination/i)).not.toBeInTheDocument();
  });

  it('menyalin snippet curl, bukan contoh respons, saat tab curl aktif', () => {
    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);

    expect(screen.getByRole('button', { name: /salin snippet curl/i })).toBeInTheDocument();
  });
  /**
   * Tombol salin dulu melayang di `ml-auto` baris tab, jauh dari kode yang
   * disalinnya. Ia kini tinggal di KEPALA BLOK KODE, sehingga apa yang
   * disalin tak dapat disalahpahami.
   */
  it('menaruh tombol salin di kepala blok kode, bukan di baris tab', () => {
    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);

    const kepala = screen.getByTestId('kepala-curl');
    expect(within(kepala).getByRole('button', { name: /salin snippet curl/i })).toBeInTheDocument();
  });

  it('melaporkan kegagalan salin, tidak diam saja', async () => {
    const clipboardAsli = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = jest.fn().mockReturnValue(false);

    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);
    fireEvent.click(screen.getByRole('button', { name: /salin snippet curl/i }));

    await waitFor(() => expect(screen.getByText(/salin manual/i)).toBeInTheDocument());

    if (clipboardAsli) Object.defineProperty(navigator, 'clipboard', clipboardAsli);
    delete document.execCommand;
  });

  it('menandai berhasil saat jalur cadangan berhasil', async () => {
    const clipboardAsli = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = jest.fn().mockReturnValue(true);

    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);
    fireEvent.click(screen.getByRole('button', { name: /salin snippet curl/i }));

    await waitFor(() => expect(screen.getByText('Tersalin')).toBeInTheDocument());

    if (clipboardAsli) Object.defineProperty(navigator, 'clipboard', clipboardAsli);
    delete document.execCommand;
  });
  it('menandai medan respons yang boleh kosong', () => {
    render(<TabSnippet operasi={operasi('GET', '/api/v1/surveys')} />);
    bukaRespons();

    // `createdAt` tak ada di `required`, jadi ia harus ditandai dapat `null`.
    // Ditegaskan pada KALIMATNYA, bukan lewat /createdAt/ polos: nama itu juga
    // muncul di dalam contoh JSON, dan pencarian polos menemukan keduanya.
    const catatan = screen.getByText(/dapat bernilai null/i);
    expect(catatan.textContent).toContain('createdAt');
  });
});

/**
 * TAB BADAN PERMINTAAN (6 Oktober 2026, permintaan pengguna: "tambahkan request
 * body di halaman dokumentasi api").
 *
 * Sebelum ini contoh badannya hanya terbenam di dalam snippet curl/fetch, jadi
 * orang yang memakai klien lain harus menambangnya dari perintah shell.
 */
/**
 * ISTILAHNYA INGGRIS DI LAYAR (7 Oktober 2026, permintaan pengguna: "ubah teks
 * badan/permintaan badan menjadi body/request body").
 *
 * Pengecualian tersurat dari aturan repo bahwa teks antarmuka berbahasa
 * Indonesia. Pembaca halaman ini membaca dokumen OpenAPI, dan di sana medannya
 * memang bernama `requestBody`; menerjemahkannya justru memutus kaitan dengan
 * dokumen yang sedang mereka cocokkan. Nama identifier di kode TETAP Indonesia
 * (`teksBadan`, `badanPermintaan`) -- yang berubah hanya yang terbaca pengguna.
 */
describe('TabSnippet — istilah request body', () => {
  const dgnBadanIstilah = () => operasi('POST', '/api/v1/surveys');

  it('tabnya bernama `body`, bukan `badan`', () => {
    render(<TabSnippet operasi={dgnBadanIstilah()} />);

    expect(screen.getByRole('button', { name: /^body$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^badan$/i })).not.toBeInTheDocument();
  });

  it('judul bloknya "Request body", dan tanpa em dash', () => {
    // Em dash dilarang di seluruh teks keluaran repo ini; pemisahnya titik dua.
    render(<TabSnippet operasi={dgnBadanIstilah()} />);
    fireEvent.click(screen.getByRole('button', { name: /^body$/i }));

    const kepala = screen.getByTestId('kepala-badan').textContent;

    expect(kepala).toMatch(/Request body/i);
    expect(kepala).not.toMatch(/Badan permintaan/i);
    expect(kepala).not.toContain(String.fromCharCode(8212));
  });

  it('label tombol salin ikut memakai istilah itu', () => {
    render(<TabSnippet operasi={dgnBadanIstilah()} />);
    fireEvent.click(screen.getByRole('button', { name: /^body$/i }));

    expect(
      screen.getByRole('button', { name: /salin contoh request body/i }),
    ).toBeInTheDocument();
  });
});

describe('TabSnippet — badan permintaan', () => {
  const dgnBadan = () => operasi('POST', '/api/v1/surveys');
  const tanpaBadan = () => operasi('GET', '/api/v1/surveys');

  it('menyediakan tab `badan` bagi operasi yang punya badan permintaan', () => {
    render(<TabSnippet operasi={dgnBadan()} />);

    expect(screen.getByRole('button', { name: /^body$/i })).toBeInTheDocument();
  });

  it('MENYEMBUNYIKAN tabnya bagi operasi tanpa badan', () => {
    // Tab kosong tanpa keterangan terbaca sebagai halaman yang rusak; GET tak
    // pernah punya badan permintaan.
    render(<TabSnippet operasi={tanpaBadan()} />);

    expect(screen.queryByRole('button', { name: /^body$/i })).not.toBeInTheDocument();
  });

  it('menampilkan contoh JSON-nya saat tab itu dibuka', () => {
    render(<TabSnippet operasi={dgnBadan()} />);
    fireEvent.click(screen.getByRole('button', { name: /^body$/i }));

    const teks = screen.getByTestId('contoh-badan').textContent;
    expect(teks).toContain('judul');
    expect(teks.trim().startsWith('{')).toBe(true);
  });

  it('contohnya SAMA dengan yang ada di dalam snippet curl', () => {
    // Penjaga terpenting: dua contoh yang menyimpang tak akan terlihat siapa
    // pun karena keduanya tampak masuk akal.
    render(<TabSnippet operasi={dgnBadan()} />);
    const curl = screen.getByTestId('snippet-curl').textContent;

    fireEvent.click(screen.getByRole('button', { name: /^body$/i }));
    const badan = screen.getByTestId('contoh-badan').textContent;

    for (const baris of badan.split(String.fromCharCode(10))) {
      expect(curl).toContain(baris.trim());
    }
  });

  it('tab curl, fetch, dan respons tetap ada', () => {
    render(<TabSnippet operasi={dgnBadan()} />);

    expect(screen.getByRole('button', { name: /^curl$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fetch$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^respons$/i })).toBeInTheDocument();
  });
});
