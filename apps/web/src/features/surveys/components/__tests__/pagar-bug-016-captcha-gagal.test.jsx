import React from 'react';
import { render, waitFor } from '@testing-library/react';
import TurnstileWidget from '../TurnstileWidget';

/**
 * Pagar regresi BUG-016 â€” captcha yang gagal mengunci tombol kirim selamanya,
 * tanpa satu pun pesan.
 *
 * `TurnstileWidget` menangani kegagalan Cloudflare begini:
 *
 *     'error-callback': () => onTokenRef.current?.(null),
 *
 * Galatnya hanya MENGOSONGKAN TOKEN. Bagi pemanggil, itu tak dapat dibedakan
 * dari "captcha belum selesai" â€” keadaan awal setiap pengisian. `ModalKirimSurvei`
 * mengunci tombolnya dari nilai yang sama (`captchaTersedia() && !captchaToken`),
 * jadi tak ada satu pun tempat yang tahu bahwa sesuatu gagal, dan karena itu tak
 * ada satu pun tempat yang dapat mengatakannya. Yang dialami warga: survei yang
 * sudah diisi penuh, tombol kirim mati, layar diam â€” dan jawabannya hilang
 * begitu tab ditutup. Dipantau 40 detik penuh pada sesi C-16.
 *
 * â”€â”€ Kenapa pagarnya di sini, bukan di ModalKirimSurvei â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Godaannya memasangnya di modal: render dengan `captchaToken: null`, lalu
 * tuntut sebuah pesan. Itu pagar yang BOHONG. Keadaan "token null" juga keadaan
 * dua detik pertama setiap pengisian yang normal, jadi uji itu menuntut
 * peringatan muncul saat tak ada yang salah â€” dan perbaikan yang benar (pesan
 * muncul hanya sesudah galat atau sesudah tenggat) tetap membuatnya merah.
 * Pagar yang tak pernah bisa hijau bukan pagar.
 *
 * Yang benar-benar hilang ada satu tingkat di bawah: **jalur pelaporannya**.
 * Selama kegagalan hanya menjelma jadi `null`, antarmuka mana pun di atasnya
 * mustahil membedakannya. Itulah yang dikunci di sini.
 *
 * â”€â”€ Kalau perbaikannya memilih jalur lain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Uji di bawah menuntut prop `onError`. Bila tim dev memilih saluran berbeda â€”
 * misalnya keadaan `captchaError` di store, atau `onStatus('error')` â€” pagar
 * ini WAJIB disesuaikan, bukan dibiarkan hijau sebagai gagal-yang-diharapkan.
 * Anotasi `test.failing()` yang ditinggalkan pada kontrak yang sudah berubah
 * adalah pagar yang diam-diam mati.
 */

const SITE_KEY = '1x00000000000000000000AA';
const asalTurnstile = window.turnstile;
const asalEnv = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Tiruan Cloudflare: menyimpan opsi yang diberikan widget supaya callback-nya dapat dipicu. */
function pasangTurnstilePalsu() {
  const kotak = { opsi: null };
  window.turnstile = {
    render: jest.fn((_el, opsi) => {
      kotak.opsi = opsi;
      return 'widget-1';
    }),
    remove: jest.fn(),
  };
  return kotak;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = SITE_KEY;
});

afterEach(() => {
  window.turnstile = asalTurnstile;
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = asalEnv;
});

describe('BUG-016 â€” kegagalan captcha tak punya jalur pelaporan', () => {
  it('kendali â€” widget terpasang dan Cloudflare memang diberi error-callback', async () => {
    const kotak = pasangTurnstilePalsu();

    render(<TurnstileWidget onToken={jest.fn()} />);

    // Kalau baris ini gagal, uji di bawah gagal karena widgetnya tak pernah
    // terpasang â€” bukan karena jalur pelaporannya tiada.
    await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledTimes(1));
    expect(typeof kotak.opsi['error-callback']).toBe('function');
  });

  test.failing('kegagalan dilaporkan lewat jalurnya sendiri, bukan sekadar token kosong', async () => {
    const kotak = pasangTurnstilePalsu();
    const onToken = jest.fn();
    const onError = jest.fn();

    render(<TurnstileWidget onToken={onToken} onError={onError} />);
    await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledTimes(1));

    kotak.opsi['error-callback']();

    // Inti temuannya. Tanpa panggilan ini, satu-satunya yang diterima pemanggil
    // adalah `onToken(null)` â€” nilai yang sama persis dengan keadaan awal
    // sebelum pengisi menyentuh apa pun. Antarmuka yang tak dapat membedakan
    // "gagal" dari "belum" tak dapat mengatakan apa-apa kepada pengisinya.
    expect(onError).toHaveBeenCalled();
  });
});
