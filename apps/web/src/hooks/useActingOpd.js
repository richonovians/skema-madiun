'use client';

import { useCallback } from 'react';
import { useAsync } from './useAsync';
import { getActingOpd } from '@/features/authentication/services/authStorage';

/**
 * OPD yang sedang diperankan superuser di area OPD (2026-08-20), atau null.
 *
 * Dibaca lewat `useAsync` (yang membacanya di dalam effect), BUKAN langsung di
 * badan komponen: nilainya berasal dari localStorage yang tak ada di server,
 * sehingga pembacaan saat render akan membuat HTML server (null) berbeda dari
 * hasil klien -- ketidakcocokan hidrasi. Halaman yang cuma butuh nilainya untuk
 * MEMANGGIL API tidak perlu hook ini: cukup panggil `getActingOpd()` di dalam
 * callback fetch-nya, yang memang sudah berjalan setelah mount.
 */
export function useActingOpd() {
  const read = useCallback(async () => getActingOpd(), []);
  const { data } = useAsync(read);
  return data ?? null;
}
