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
