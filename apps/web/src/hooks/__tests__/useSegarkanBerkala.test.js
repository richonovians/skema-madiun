import { act, renderHook } from '@testing-library/react';
import useSegarkanBerkala, { JEDA_MINIMUM_SEGAR_MS } from '../useSegarkanBerkala';

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

  /**
   * FOKUS JENDELA (17 September 2026, laporan pengguna: sudah mencoba berkali-
   * kali dengan dua akun dan lencananya tetap terasa mati).
   *
   * Sebabnya cara mengujinya, dan cara itu justru pemakaian yang wajar: dua
   * akun dibuka pada dua jendela berdampingan, dan peramban menganggap KEDUANYA
   * terlihat. `visibilitychange` tak pernah menembak di situ, sehingga satu-
   * satunya penyegaran yang tersisa adalah ketukan berkala -- satu menit penuh
   * yang terasa seperti tak terjadi apa-apa.
   *
   * `focus` menutup celah itu, TAPI ia menembak jauh lebih sering daripada
   * `visibilitychange`: berpindah tab menembakkan keduanya berurutan, dan
   * berpindah jendela bolak-balik menembakkannya berkali-kali dalam hitungan
   * detik. Jeda minimum itulah yang membuat pendengar ini layak ada, dan
   * sebagian besar uji di bawah menjaga jeda itu, bukan pendengarnya.
   */
  describe('fokus jendela', () => {
    const beriFokus = () => {
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
    };

    it('menyegarkan seketika saat jendela mendapat fokus', () => {
      const segarkan = jest.fn();
      renderHook(() => useSegarkanBerkala(segarkan, JEDA));

      beriFokus();

      expect(segarkan).toHaveBeenCalledTimes(1);
    });

    it('mengabaikan fokus yang datang sebelum jeda minimum terlewat', () => {
      const segarkan = jest.fn();
      renderHook(() => useSegarkanBerkala(segarkan, JEDA));

      act(() => jest.advanceTimersByTime(JEDA));
      expect(segarkan).toHaveBeenCalledTimes(1);

      act(() => jest.advanceTimersByTime(JEDA_MINIMUM_SEGAR_MS / 2));
      beriFokus();

      expect(segarkan).toHaveBeenCalledTimes(1);
    });

    /**
     * Jeda minimum harus MENUNDA, bukan membungkam. Penjaga yang cuma
     * mengizinkan penyegaran pertama juga meluluskan dua uji di atas, lalu
     * membuat lencananya diam selamanya sesudah fokus pertama.
     */
    it('menyegarkan lagi begitu jeda minimum terlewat', () => {
      const segarkan = jest.fn();
      renderHook(() => useSegarkanBerkala(segarkan, JEDA));

      beriFokus();
      act(() => jest.advanceTimersByTime(JEDA_MINIMUM_SEGAR_MS));
      beriFokus();

      expect(segarkan).toHaveBeenCalledTimes(2);
    });

    /**
     * Berpindah tab menembakkan `visibilitychange` DAN `focus` berurutan. Tanpa
     * jeda yang dipakai bersama keduanya, satu perpindahan tab menghasilkan dua
     * permintaan yang jawabannya sama persis.
     */
    it('tidak menyegarkan dua kali walau satu perpindahan memicu dua peristiwa', () => {
      const segarkan = jest.fn();
      renderHook(() => useSegarkanBerkala(segarkan, JEDA));

      ubahKeterlihatan(false);
      ubahKeterlihatan(true);
      beriFokus();

      expect(segarkan).toHaveBeenCalledTimes(1);
    });

    it('menghitung ulang jedanya sesudah menyegar karena fokus', () => {
      const segarkan = jest.fn();
      renderHook(() => useSegarkanBerkala(segarkan, JEDA));

      act(() => jest.advanceTimersByTime(JEDA * 0.9));
      beriFokus();
      expect(segarkan).toHaveBeenCalledTimes(1);

      act(() => jest.advanceTimersByTime(JEDA * 0.5));
      expect(segarkan).toHaveBeenCalledTimes(1);

      act(() => jest.advanceTimersByTime(JEDA * 0.5));
      expect(segarkan).toHaveBeenCalledTimes(2);
    });

    /**
     * Aturan "tidur saat tak terlihat" tetap utuh. Jendela yang tersembunyi pun
     * masih bisa menerima `focus`; menanggapinya berarti membangunkan kembali
     * interval yang sengaja ditidurkan, dan tab yang ditinggal berhari-hari
     * mulai memanggil API lagi tanpa ada yang melihatnya.
     */
    it('tidak menyegarkan maupun membangunkan interval saat tab tersembunyi', () => {
      const segarkan = jest.fn();
      renderHook(() => useSegarkanBerkala(segarkan, JEDA));

      ubahKeterlihatan(false);
      beriFokus();
      act(() => jest.advanceTimersByTime(JEDA * 10));

      expect(segarkan).not.toHaveBeenCalled();
    });

    it('melepas pendengar fokusnya saat dilepas', () => {
      const segarkan = jest.fn();
      const { unmount } = renderHook(() => useSegarkanBerkala(segarkan, JEDA));

      unmount();
      beriFokus();

      expect(segarkan).not.toHaveBeenCalled();
    });
  });
});
