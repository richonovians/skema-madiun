import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RoleLoginPicker from '../RoleLoginPicker';
import { setActingRole } from '../../services/actingRole.api';

jest.mock('../../services/actingRole.api', () => ({
  setActingRole: jest.fn().mockResolvedValue({}),
}));

/**
 * TUJUAN NAVIGASI DIBUAT BERUPA FRAGMEN (26 Oktober 2026).
 *
 * Sampai hari itu berkas ini memalsukan `window.location` dengan
 * `delete window.location; window.location = { assign: jest.fn() }`. Di jsdom 26
 * keduanya tak berlaku: `delete` diabaikan diam-diam, dan penugasannya justru
 * memanggil setter `location` -- sebuah navigasi ke "[object Object]" yang
 * dilaporkan jsdom sebagai "Not implemented: navigation". Tak satu uji pun
 * memeriksa tiruannya, jadi semuanya hijau dan tujuan navigasinya tak pernah
 * diuji. Penjelasan lengkap tentang ketiga cara pemalsuan yang ditolak jsdom ada
 * di `AuthCallbackLoader.test.jsx`.
 *
 * jsdom HANYA menjalankan navigasi yang mengubah fragmen saja. Karena itu
 * `ROLE_HOME` di sini memetakan setiap peran ke `#beranda-<peran>`: komponennya
 * tetap memanggil `window.location.assign` sungguhan, dan `location.hash`
 * sesudahnya menyebut beranda MANA yang dipilih. Yang diuji karena itu
 * sambungannya -- peran yang dikirim dan beranda yang dituju adalah peran yang
 * sama -- bukan alamat beranda itu sendiri.
 */
jest.mock('@/constants/roleHome', () => ({
  ROLE_HOME: {
    kabupaten: '#beranda-kabupaten',
    opd: '#beranda-opd',
    responden: '#beranda-responden',
  },
}));

/**
 * SAMBUNGAN antara tombol dan peran yang dikirim (8 September 2026).
 *
 * Pemetaannya sendiri diuji terpisah di `utils/__tests__/tombolPeran.test.js`;
 * yang diuji DI SINI adalah bahwa komponennya benar-benar memakai pemetaan itu.
 * Bedanya bukan kerapian: versi sebelumnya menyaring tombol dengan
 * `roles.includes(c.key)` dan memanggil `setActingRole(c.key)` langsung, jadi
 * util yang benar pun tak akan berpengaruh apa-apa kalau sambungannya lupa
 * dipasang.
 *
 * Peran `superuser` dilebur ke `kabupaten` pada 15 September 2026; uji yang dulu
 * membuktikan "tombolnya sama, haknya berbeda" ikut lenyap bersama perbedaan
 * yang dibuktikannya.
 */
const render1 = (props = {}) =>
  render(<RoleLoginPicker roles={props.roles ?? []} onCancel={() => {}} {...props} />);

beforeEach(() => {
  jest.clearAllMocks();
  window.location.hash = '';
});

describe('RoleLoginPicker — tiga tombol', () => {
  /**
   * Tak ada lagi tombol "Superuser" di layar mana pun (peleburan 15 September
   * 2026). Akun yang tokennya masih menyebut peran itu tak melihat tombol hantu.
   */
  it('tak ada tombol Superuser, dan peran yang sudah dihapus tak memunculkan tombol', () => {
    render1({ roles: ['superuser', 'kabupaten'] });

    expect(screen.getByText('Admin Kabupaten')).toBeInTheDocument();
    expect(screen.queryByText('Superuser')).not.toBeInTheDocument();
    expect(screen.getByText(/1 pilihan peran/i)).toBeInTheDocument();
  });

  it('akun kabupaten mengirim act=kabupaten', async () => {
    render1({ roles: ['kabupaten'] });

    fireEvent.click(screen.getByText('Admin Kabupaten'));

    await waitFor(() => expect(setActingRole).toHaveBeenCalledWith('kabupaten'));
  });

  it('KONTROL: Admin Kabupaten yang memilih Masyarakat tetap menjadi responden — gerbang PDP tak terlewati', async () => {
    render1({ roles: ['kabupaten', 'responden'] });

    fireEvent.click(screen.getByText('Masyarakat'));

    await waitFor(() => expect(setActingRole).toHaveBeenCalledWith('responden'));
  });

  it('tombol peran responden berlabel "Masyarakat", bukan "Warga"', () => {
    // Permintaan pengguna 8 September 2026. Nilai perannya TIDAK ikut berubah:
    // `setActingRole` tetap dipanggil dengan 'responden', dan itu dijaga uji
    // KONTROL di atas.
    render1({ roles: ['responden'] });

    expect(screen.getByText('Masyarakat')).toBeInTheDocument();
    expect(screen.queryByText('Warga')).not.toBeInTheDocument();
  });

  /**
   * Keterangannya kini MENJANJIKAN log aktivitas & manajemen pengguna, kebalikan
   * dari sebelum peleburan. Menjanjikan hal yang salah di sini membuat pengguna
   * mengira fiturnya rusak, bukan bahwa ia tak berhak.
   */
  it('keterangan tombol Admin Kabupaten menyebut log aktivitas & manajemen pengguna', () => {
    render1({ roles: ['kabupaten'] });

    expect(screen.getByText(/log aktivitas & manajemen pengguna/i)).toBeInTheDocument();
    expect(screen.queryByText(/TIDAK terbuka pada peran ini/i)).not.toBeInTheDocument();
  });

  it('KONTROL: penanda "sedang dipakai" tetap muncul', () => {
    render1({ roles: ['kabupaten'], currentRole: 'kabupaten' });

    expect(screen.getByText('sedang dipakai')).toBeInTheDocument();
  });
});

describe('RoleLoginPicker — berpindah peran', () => {
  it('memilih peran berpindah ke beranda peran itu', async () => {
    render1({ roles: ['kabupaten', 'responden'] });

    fireEvent.click(screen.getByText('Masyarakat'));

    await waitFor(() => expect(window.location.hash).toBe('#beranda-responden'));
  });

  /**
   * Urutannya bagian dari kontraknya: `POST /auth/acting-role` menulis cookie
   * sesi baru, dan proxy.js membaca cookie itu pada permintaan BERIKUTNYA.
   * Bernavigasi sebelum jawabannya datang membawa sesi lama ke beranda baru.
   */
  it('tidak bernavigasi sebelum peran baru selesai disimpan', async () => {
    let selesai;
    setActingRole.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          selesai = resolve;
        }),
    );
    render1({ roles: ['kabupaten'] });

    fireEvent.click(screen.getByText('Admin Kabupaten'));
    await waitFor(() => expect(setActingRole).toHaveBeenCalledWith('kabupaten'));

    expect(window.location.hash).toBe('');

    selesai({});
    await waitFor(() => expect(window.location.hash).toBe('#beranda-kabupaten'));
  });

  it('selagi berpindah, semua tombol peran nonaktif dan tombol yang diklik bertanda "berpindah..."', async () => {
    setActingRole.mockImplementationOnce(() => new Promise(() => {}));
    render1({ roles: ['kabupaten', 'responden'] });

    fireEvent.click(screen.getByText('Masyarakat'));

    const tombolMasyarakat = screen.getByRole('button', { name: /masyarakat/i });
    await waitFor(() => expect(tombolMasyarakat).toHaveTextContent('berpindah...'));
    expect(tombolMasyarakat).toBeDisabled();
    expect(screen.getByRole('button', { name: /admin kabupaten/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /admin kabupaten/i })).not.toHaveTextContent(
      'berpindah...',
    );
  });

  it('gagal berpindah: pesan galat tampil, tidak bernavigasi, dan tombol dapat dicoba lagi', async () => {
    setActingRole.mockRejectedValueOnce(new Error('Peran ini tidak dimiliki akun Anda.'));
    render1({ roles: ['kabupaten', 'responden'] });

    fireEvent.click(screen.getByText('Masyarakat'));

    expect(await screen.findByText('Peran ini tidak dimiliki akun Anda.')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    const tombolMasyarakat = screen.getByRole('button', { name: /masyarakat/i });
    expect(tombolMasyarakat).toBeEnabled();
    expect(tombolMasyarakat).not.toHaveTextContent('berpindah...');
  });

  it('galat tanpa pesan memakai kalimat cadangan', async () => {
    setActingRole.mockRejectedValueOnce(new Error(''));
    render1({ roles: ['kabupaten'] });

    fireEvent.click(screen.getByText('Admin Kabupaten'));

    expect(
      await screen.findByText('Gagal berpindah peran. Silakan coba lagi.'),
    ).toBeInTheDocument();
  });

  /**
   * Backend menolak peran `opd` tanpa tautan OPD (400). Tombolnya karena itu
   * tampil NONAKTIF beserta sebabnya, bukan disembunyikan.
   */
  it('Admin OPD tanpa tautan OPD tampil nonaktif beserta sebabnya', () => {
    render1({ roles: ['opd', 'responden'], opdId: null });

    const tombolOpd = screen.getByRole('button', { name: /admin opd/i });
    expect(tombolOpd).toBeDisabled();
    expect(tombolOpd).toHaveTextContent(/belum ditautkan ke OPD mana pun/i);
  });

  it('KONTROL: Admin OPD yang tertaut ke OPD dapat dipilih dan berpindah ke berandanya', async () => {
    render1({ roles: ['opd', 'responden'], opdId: 7 });

    const tombolOpd = screen.getByRole('button', { name: /admin opd/i });
    expect(tombolOpd).toBeEnabled();
    expect(tombolOpd).not.toHaveTextContent(/belum ditautkan/i);

    fireEvent.click(tombolOpd);

    await waitFor(() => expect(window.location.hash).toBe('#beranda-opd'));
    expect(setActingRole).toHaveBeenCalledWith('opd');
  });
});
