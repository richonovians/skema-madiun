import { act, renderHook } from '@testing-library/react';
import { AMBANG_PERINGATAN_MS, useSesiAkanBerakhir } from '../useSesiAkanBerakhir';
import {
  MASA_SESI_BERUBAH_EVENT,
  SESSION_CHANGED_EVENT,
} from '../../services/authStorage';

/**
 * Peringatan sebelum sesi berakhir (23 November 2026).
 *
 * Hook mengembalikan waktu berakhir (ms epoch) begitu sisa sesi tinggal di
 * bawah ambang, dan `null` selain itu. Jam palsu tanpa `queueMicrotask` dan
 * `nextTick`: undici menggantung bila keduanya ikut dipalsukan.
 */
const MULAI = new Date('2026-03-10T03:00:00Z').getTime();
const MENIT = 60 * 1000;
const setelSso = (ms) => localStorage.setItem('sso_expires_at', String(Math.floor(ms / 1000)));

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
  jest.setSystemTime(MULAI);
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

it('ambangnya lima menit', () => {
  expect(AMBANG_PERINGATAN_MS).toBe(5 * MENIT);
});

it('null tanpa sesi', () => {
  const { result } = renderHook(() => useSesiAkanBerakhir());
  expect(result.current).toBeNull();
});

it('null selama sisa sesi di atas ambang, lalu menyala tepat di ambang', () => {
  const berakhir = MULAI + 30 * MENIT;
  setelSso(berakhir);
  const { result } = renderHook(() => useSesiAkanBerakhir());
  expect(result.current).toBeNull();

  act(() => jest.advanceTimersByTime(25 * MENIT - 1000));
  expect(result.current).toBeNull();

  act(() => jest.advanceTimersByTime(1000));
  expect(result.current).toBe(berakhir);
});

it('langsung menyala bila sisa sesi sudah di bawah ambang saat dipasang', () => {
  const berakhir = MULAI + 2 * MENIT;
  setelSso(berakhir);
  const { result } = renderHook(() => useSesiAkanBerakhir());
  expect(result.current).toBe(berakhir);
});

it('padam sesudah sesi diperpanjang lewat panggilan API mana pun', () => {
  setelSso(MULAI + 2 * MENIT);
  const { result } = renderHook(() => useSesiAkanBerakhir());
  expect(result.current).not.toBeNull();

  act(() => {
    setelSso(MULAI + 60 * MENIT);
    window.dispatchEvent(new Event(MASA_SESI_BERUBAH_EVENT));
  });
  expect(result.current).toBeNull();

  // Dan menyala lagi menjelang waktu berakhir yang baru.
  act(() => jest.advanceTimersByTime(55 * MENIT));
  expect(result.current).toBe(MULAI + 60 * MENIT);
});

it('padam sesudah sesi dibersihkan', () => {
  setelSso(MULAI + 2 * MENIT);
  const { result } = renderHook(() => useSesiAkanBerakhir());
  expect(result.current).not.toBeNull();
  act(() => {
    localStorage.removeItem('sso_expires_at');
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  });
  expect(result.current).toBeNull();
});

it('mengikuti perpanjangan dari tab lain (event storage)', () => {
  setelSso(MULAI + 2 * MENIT);
  const { result } = renderHook(() => useSesiAkanBerakhir());
  expect(result.current).not.toBeNull();
  act(() => {
    setelSso(MULAI + 60 * MENIT);
    window.dispatchEvent(new StorageEvent('storage', { key: 'sso_expires_at' }));
  });
  expect(result.current).toBeNull();
});

it('menghitung ulang saat tab kembali terlihat (pewaktu tab latar bisa tertahan)', () => {
  const berakhir = MULAI + 30 * MENIT;
  setelSso(berakhir);
  const { result } = renderHook(() => useSesiAkanBerakhir());
  // Jam maju tanpa pewaktu berjalan, seperti tab latar yang dibekukan peramban.
  jest.setSystemTime(MULAI + 28 * MENIT);
  expect(result.current).toBeNull();

  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(result.current).toBe(berakhir);
});

it('jalur dev-login: membaca exp token', () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const berakhir = MULAI + 3 * MENIT;
  localStorage.setItem(
    'token',
    `${b64({ alg: 'HS256' })}.${b64({ sub: '1', exp: berakhir / 1000 })}.uji`,
  );
  const { result } = renderHook(() => useSesiAkanBerakhir());
  expect(result.current).toBe(berakhir);
});
