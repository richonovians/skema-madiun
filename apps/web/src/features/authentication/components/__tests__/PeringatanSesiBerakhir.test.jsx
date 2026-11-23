import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import PeringatanSesiBerakhir from '../PeringatanSesiBerakhir';

/**
 * Dialog peringatan sebelum sesi berakhir (23 November 2026).
 *
 * Sesinya jalur SSO (`sso_expires_at`), sebab hanya jalur itu yang dapat
 * diperpanjang: backend menyebut waktu berakhir barunya pada header
 * `X-Sesi-Berakhir`. Jam palsu tanpa `queueMicrotask`/`nextTick` supaya
 * undici di balik MSW tidak menggantung.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

const MULAI = new Date('2026-03-10T03:00:00Z').getTime(); // 10.00 WIB
const MENIT = 60 * 1000;
const detik = (ms) => Math.floor(ms / 1000);
const setelSso = (ms) => localStorage.setItem('sso_expires_at', String(detik(ms)));

const jawabMe = (headers = {}) =>
  http.get(`${API_BASE}/auth/me`, () =>
    HttpResponse.json(
      { success: true, statusCode: 200, message: 'OK', data: { id: 7, roles: ['responden'] } },
      { headers },
    ),
  );

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
  jest.setSystemTime(MULAI);
  localStorage.clear();
  localStorage.setItem('sso_logged_in', 'true');
});
afterEach(() => {
  server.resetHandlers();
  jest.useRealTimers();
});

const dialog = () => screen.queryByRole('alertdialog');
const tombolLanjut = () => screen.queryByRole('button', { name: 'Lanjutkan sesi' });

it('tidak tampil selama sisa sesi masih di atas lima menit', () => {
  setelSso(MULAI + 30 * MENIT);
  render(<PeringatanSesiBerakhir />);
  expect(dialog()).toBeNull();
});

it('tampil lima menit sebelum berakhir dan menyebut jamnya dalam WIB', () => {
  setelSso(MULAI + 30 * MENIT);
  render(<PeringatanSesiBerakhir />);
  act(() => jest.advanceTimersByTime(25 * MENIT));

  expect(dialog()).not.toBeNull();
  expect(dialog()).toHaveAttribute('aria-modal', 'true');
  expect(dialog()).toHaveTextContent('10.30 WIB');
  expect(dialog()).toHaveTextContent(/simpan atau kirim pekerjaan anda/i);
  expect(dialog()).toHaveAccessibleName(/sesi anda akan berakhir/i);
});

it('Lanjutkan sesi memperpanjangnya dan dialog tertutup', async () => {
  setelSso(MULAI + 2 * MENIT);
  server.use(jawabMe({ 'X-Sesi-Berakhir': String(detik(MULAI + 62 * MENIT)) }));
  render(<PeringatanSesiBerakhir />);

  fireEvent.click(tombolLanjut());

  await waitFor(() => expect(dialog()).toBeNull());
  expect(Number(localStorage.getItem('sso_expires_at'))).toBe(detik(MULAI + 62 * MENIT));
});

it('pagu mutlak tercapai: waktu berakhir tidak bergeser, dialog menyatakannya', async () => {
  setelSso(MULAI + 2 * MENIT);
  server.use(jawabMe());
  render(<PeringatanSesiBerakhir />);

  fireEvent.click(tombolLanjut());

  await waitFor(() =>
    expect(dialog()).toHaveTextContent(/batas maksimum dan tidak dapat diperpanjang/i),
  );
  expect(dialog()).toHaveTextContent(/kirim pekerjaan anda sekarang, lalu masuk kembali/i);
  expect(tombolLanjut()).toBeNull();
});

it('server tak terjangkau: dialog tetap terbuka dengan pesan galat', async () => {
  setelSso(MULAI + 2 * MENIT);
  server.use(http.get(`${API_BASE}/auth/me`, () => HttpResponse.error()));
  render(<PeringatanSesiBerakhir />);

  fireEvent.click(tombolLanjut());

  await waitFor(() => expect(dialog()).toHaveTextContent(/belum dapat diperpanjang/i));
  expect(tombolLanjut()).not.toBeNull();
});

it('Tutup menyembunyikannya dan tidak muncul lagi untuk waktu berakhir yang sama', () => {
  setelSso(MULAI + 2 * MENIT);
  render(<PeringatanSesiBerakhir />);

  fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
  expect(dialog()).toBeNull();

  act(() => window.dispatchEvent(new Event('skema:sesi-berubah')));
  expect(dialog()).toBeNull();
});

it('Escape menutupnya', () => {
  setelSso(MULAI + 2 * MENIT);
  render(<PeringatanSesiBerakhir />);
  expect(dialog()).not.toBeNull();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(dialog()).toBeNull();
});

it('tidak tampil tanpa sesi', () => {
  localStorage.clear();
  render(<PeringatanSesiBerakhir />);
  expect(dialog()).toBeNull();
});
