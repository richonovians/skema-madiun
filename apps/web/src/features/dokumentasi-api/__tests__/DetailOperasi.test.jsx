import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DetailOperasi from '../components/DetailOperasi';
import { adaptOpenApi } from '../adapters/openapi.adapter';
import { dokumenOpenApi } from '../__fixtures__/openapi.fixture';

const operasi = (metode, path) =>
  adaptOpenApi(dokumenOpenApi)[0].operasi.find((o) => o.metode === metode && o.path === path);

const gambar = (op) =>
  render(
    <ul>
      <DetailOperasi operasi={op} />
    </ul>,
  );

describe('DetailOperasi', () => {
  /**
   * CACAT YANG DIJAGA DI SINI, dan ia cacat buatan sendiri: versi pertama
   * halaman ini menulis PROSA dengan `text-label-sm`. Token label di
   * `globals.css` ber-line-height 1.2 -- itu ukuran untuk label satu baris,
   * bukan untuk kalimat yang membungkus. Prosa memakai token body (1.5) dan
   * `leading-relaxed`.
   *
   * Warna TIDAK dijaga di sini karena warnanya memang sudah benar: diukur 5
   * Oktober 2026, `on-surface-variant` di atas `surface-variant` berasio
   * 7.26:1 dan `on-surface` 13.34:1 -- keduanya lolos WCAG AA.
   */
  it('menulis ringkasan dengan line-height prosa, bukan line-height label', () => {
    gambar(operasi('POST', '/api/v1/surveys'));

    const ringkasan = screen.getByText('Buat paket survei (Admin OPD).');
    expect(ringkasan.className).toContain('leading-relaxed');
    expect(ringkasan.className).not.toContain('text-label-sm');
  });

  it('menyebut query opsional dengan kalimat, bukan istilah teknis', () => {
    gambar(operasi('GET', '/api/v1/surveys'));

    expect(screen.getByText(/boleh kamu tambahkan sendiri/i)).toBeInTheDocument();
  });

  it('menyebut kolom badan opsional dengan kalimat, bukan kata "properti"', () => {
    gambar(operasi('POST', '/api/v1/surveys'));

    expect(screen.getByText(/kolom opsional/i)).toBeInTheDocument();
    expect(screen.queryByText(/properti badan/i)).not.toBeInTheDocument();
  });

  /**
   * Nilai enum ditulis sebagai pilihan yang terbaca, bukan dirangkai dengan
   * pipa seperti sintaks tipe: halaman ini dibaca admin, bukan pemrogram
   * TypeScript.
   */
  it('menulis pilihan enum sebagai daftar nilai yang terbaca', () => {
    gambar(operasi('GET', '/api/v1/surveys'));

    expect(screen.getByText(/draft, aktif, ditutup/i)).toBeInTheDocument();
  });
  /**
   * Kolom WAJIB sebelumnya tak punya tabel sama sekali -- ia hanya muncul
   * sebagai nilai di dalam snippet. Akibatnya keterangan dan batasannya tak
   * punya tempat mendarat, padahal justru kolom wajib yang paling perlu
   * dijelaskan sebelum orang mengirim permintaan.
   */
  it('menabelkan kolom wajib, bukan hanya yang opsional', () => {
    gambar(operasi('POST', '/api/v1/surveys'));

    expect(screen.getByText(/kolom wajib/i)).toBeInTheDocument();
    expect(screen.getByText('periode')).toBeInTheDocument();
  });

  it('menampilkan keterangan properti dari dokumen', () => {
    gambar(operasi('POST', '/api/v1/surveys'));

    expect(screen.getByText(/format kanonik triwulan/i)).toBeInTheDocument();
  });

  it('menampilkan batasan panjang sebagai kalimat, bukan nama kunci JSON', () => {
    gambar(operasi('POST', '/api/v1/surveys'));

    expect(screen.getByText(/maks 100 karakter/i)).toBeInTheDocument();
    expect(screen.queryByText(/maxLength/)).not.toBeInTheDocument();
  });

  it('menampilkan keterangan parameter query', () => {
    gambar(operasi('GET', '/api/v1/surveys'));

    expect(screen.getByText(/nomor halaman/i)).toBeInTheDocument();
  });

  it('menyatakan badan multipart, tidak membiarkannya terbaca tanpa badan', () => {
    const pengaduan = adaptOpenApi(dokumenOpenApi).find((g) => g.tag === 'complaints').operasi[0];
    render(
      <ul>
        <DetailOperasi operasi={pengaduan} />
      </ul>,
    );

    expect(screen.getByText(/multipart\/form-data/i)).toBeInTheDocument();
    expect(screen.getByText('uraian')).toBeInTheDocument();
  });
  /**
   * Inilah kekurangan terbesar halaman ini sebelum 6 Oktober 2026: siapa yang
   * boleh memanggil tak tertulis di mana pun, sehingga administrator baru tahu
   * sebuah endpoint terlarang baginya setelah dibalas 403.
   */
  it('menyebut peran yang diizinkan', () => {
    gambar(operasi('POST', '/api/v1/surveys'));

    expect(screen.getByText(/peran: opd/i)).toBeInTheDocument();
  });

  it('menyebut "semua peran terautentikasi" saat daftarnya kosong', () => {
    gambar(operasi('GET', '/api/v1/surveys/{id}'));

    expect(screen.getByText(/semua peran terautentikasi/i)).toBeInTheDocument();
  });

  it('menandai endpoint publik, bukan menampilkan peran kosong', () => {
    const publik = adaptOpenApi(dokumenOpenApi).find((g) => g.tag === 'public').operasi[0];
    render(
      <ul>
        <DetailOperasi operasi={publik} />
      </ul>,
    );

    expect(screen.getByText(/publik — tanpa sesi/i)).toBeInTheDocument();
    expect(screen.queryByText(/semua peran terautentikasi/i)).not.toBeInTheDocument();
  });
  /**
   * Jangkar `id` adalah yang membuat tautan langsung bekerja. Uji hash di
   * layar memakai `document.getElementById(...)?.scrollIntoView()`, dan `?.`
   * itu membuatnya LULUS walau jangkarnya tak pernah ada -- jadi jangkarnya
   * harus ditegaskan di sini, bukan di sana.
   */
  it('memberi jangkar id pada tiap endpoint', () => {
    const { container } = gambar(operasi('GET', '/api/v1/surveys'));

    expect(container.querySelector('li').id).toBe('get-/api/v1/surveys');
  });

  it('menyediakan tombol salin tautan endpoint', async () => {
    const clipboardAsli = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    gambar(operasi('GET', '/api/v1/surveys'));
    fireEvent.click(screen.getByRole('button', { name: /salin tautan ke GET \/api\/v1\/surveys/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const tautan = writeText.mock.calls[0][0];
    // `/` dan `{}` WAJIB dikodekan, kalau tidak hash-nya patah.
    expect(tautan).toContain(encodeURIComponent('get-/api/v1/surveys'));
    expect(tautan).not.toContain('#get-/api/v1/surveys');

    if (clipboardAsli) Object.defineProperty(navigator, 'clipboard', clipboardAsli);
  });
});
