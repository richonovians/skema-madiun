'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Pola {data, isLoading, error} + refetch yang konsisten utk pemanggilan service
 * (lihat features/*\/services/*.api.js). Sebelum ini tiap halaman kelola sendiri
 * (mis. app/admin-kab/audit-logs/page.jsx) dengan spinner hand-roll & error yang
 * cuma di-console.error tanpa pernah ditampilkan ke pengguna.
 *
 * `asyncFn` HARUS sudah di-`useCallback` oleh pemanggil dgn dependency-nya
 * sendiri (mis. `useCallback(() => getUsers(filters), [filters])`) -- useAsync
 * cuma jalankan ulang saat referensi `asyncFn` berubah, bukan terima array
 * deps sendiri (ESLint proyek ini larang deps dinamis di useCallback).
 *
 * @param {() => Promise<any>} asyncFn
 */
export function useAsync(asyncFn) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn]);

  useEffect(() => {
    // Warning ESLint react-hooks/set-state-in-effect diterima secara sadar --
    // pola fetch-saat-mount ini butuh setIsLoading sinkron di awal execute(),
    // bukan bug (tak ada cascading render tak terkendali, cuma 1x per mount).
    execute();
  }, [execute]);

  return { data, isLoading, error, refetch: execute };
}
