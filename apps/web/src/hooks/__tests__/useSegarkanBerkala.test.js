import { act, renderHook } from '@testing-library/react';
import useSegarkanBerkala from '../useSegarkanBerkala';

/**
 * PENYEGARAN BERKALA YANG TIDUR SAAT TAB TERSEMBUNYI (16 September 2026,
 * pertanyaan pengguna: lencana notifikasi di navbar tak ikut berubah saat ada
 * notifikasi baru).
 *
 * Sebabnya bukan cacat yang menyelinap: `useAsync` mengambil data sekali per
 * pemasangan, dan satu-satunya penyegaran lain adalah peristiwa
 * `skema:notifikasi-berubah` yang HANYA ditembakkan tab ini sendiri sesudah
 * menandai notifikasi terbaca. Tak ada polling di mana pun di apps/web, dan tak
 * ada kanal dorong di kedua aplikasi. Lonceng yang hidup di layout tak pernah
 * dipasang ulang saat berpindah halaman, jadi angkanya bertahan sampai halaman
 * dimuat ulang penuh.
 *
 * Yang dijaga berkas ini adalah SYARATNYA, bukan sekadar "ada interval": tab
 * yang ditinggalkan berjam-jam tidak boleh mengirim satu permintaan pun.
 * Interval yang berjalan terus juga meluluskan uji pertama, sambil membebani
 * server dengan tab yang tak dilihat siapa pun.
 */
const JEDA = 60_000;

/** jsdom menyediakan `document.visibilityState` sebagai getter yang tak bisa ditulis. */
const setTerlihat = (terlihat) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (terlihat ? 'visible' : 'hidden'),
  });
};

const ubahKeterlihatan = (terlihat) => {
  setTerlihat(terlihat);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

describe('useSegarkanBerkala', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setTerlihat(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    setTerlihat(true);
  });

  it('memanggil penyegar tiap jeda selama tab terlihat', () => {
    const segarkan = jest.fn();
    renderHook(() => useSegarkanBerkala(segarkan, JEDA));

    expect(segarkan).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(JEDA));
    expect(segarkan).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(JEDA * 2));
    expect(segarkan).toHaveBeenCalledTimes(3);
  });

  it('tidak memanggil apa pun selama tab tersembunyi', () => {
    const segarkan = jest.fn();
    renderHook(() => useSegarkanBerkala(segarkan, JEDA));

    ubahKeterlihatan(false);
    act(() => jest.advanceTimersByTime(JEDA * 10));

    expect(segarkan).not.toHaveBeenCalled();
  });

  it('menyegarkan seketika saat tab kembali terlihat', () => {
    const segarkan = jest.fn();
    renderHook(() => useSegarkanBerkala(segarkan, JEDA));

    ubahKeterlihatan(false);
    ubahKeterlihatan(true);

    expect(segarkan).toHaveBeenCalledTimes(1);
  });

  /**
   * Hitungannya dimulai dari nol sesudah penyegaran seketika di atas. Tanpa ini
   * tab yang baru kembali bisa menyegarkan dua kali beruntun hanya karena
   * ketukan lama kebetulan jatuh sesaat sesudahnya.
   */
  it('menghitung ulang jedanya sesudah kembali terlihat', () => {
    const segarkan = jest.fn();
    renderHook(() => useSegarkanBerkala(segarkan, JEDA));

    act(() => jest.advanceTimersByTime(JEDA * 0.9));
    ubahKeterlihatan(false);
    ubahKeterlihatan(true);
    expect(segarkan).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(JEDA * 0.5));
    expect(segarkan).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(JEDA * 0.5));
    expect(segarkan).toHaveBeenCalledTimes(2);
  });

  it('berhenti sepenuhnya sesudah dilepas', () => {
    const segarkan = jest.fn();
    const { unmount } = renderHook(() => useSegarkanBerkala(segarkan, JEDA));

    unmount();
    act(() => jest.advanceTimersByTime(JEDA * 5));
    ubahKeterlihatan(false);
    ubahKeterlihatan(true);

    expect(segarkan).not.toHaveBeenCalled();
  });

  /**
   * KONTROL. Hook yang menyimpan penyegar pertama selamanya juga meluluskan
   * seluruh uji di atas, lalu memanggil fungsi basi yang menutup nilai lama.
   */
  it('KONTROL: memakai penyegar terbaru, bukan yang tertangkap saat dipasang', () => {
    const pertama = jest.fn();
    const kedua = jest.fn();
    const { rerender } = renderHook(({ fn }) => useSegarkanBerkala(fn, JEDA), {
      initialProps: { fn: pertama },
    });

    rerender({ fn: kedua });
    act(() => jest.advanceTimersByTime(JEDA));

    expect(pertama).not.toHaveBeenCalled();
    expect(kedua).toHaveBeenCalledTimes(1);
  });
});
