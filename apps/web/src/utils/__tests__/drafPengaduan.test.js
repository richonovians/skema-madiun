import { IDBFactory } from 'fake-indexeddb';
import {
  ambilDrafPengaduan,
  hapusDrafPengaduan,
  simpanDrafPengaduan,
  teksDrafTersimpan,
} from '../drafPengaduan';

/**
 * Draf pengaduan (14 September 2026, dipindah ke IndexedDB 23 November 2026).
 *
 * Disimpan HANYA pada tiga penolakan yang menuntut pelapor pergi lalu kembali:
 * persetujuan PDP, batas harian, dan sesi berakhir. Sejak pindah ke IndexedDB
 * draf menetap di disk, jadi setiap draf wajib berpemilik dan ber-TTL, dan
 * LAMPIRAN IKUT tersimpan (keputusan pengguna 23 November 2026).
 */

const T = Date.parse('2026-11-23T01:00:00Z'); // Senin 08.00 WIB
const DUA_JAM = 2 * 60 * 60 * 1000;
const ISI = {
  level: 'kabupaten',
  department: '7',
  category: 'kab_lainnya',
  title: 'Lampu jalan mati',
  description: 'Sudah tiga malam lampu di depan balai desa tidak menyala.',
  incidentDate: '2026-11-01',
  incidentLocation: 'Balai Desa Bangunsari',
  isAnonim: true,
};
const BYTE_FOTO = [137, 80, 78, 71, 1, 2, 3];
const foto = () =>
  new File([new Uint8Array(BYTE_FOTO)], 'bukti.png', {
    type: 'image/png',
    lastModified: 1700000000000,
  });

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

describe('drafPengaduan', () => {
  it('medan teks dan pemiliknya kembali utuh', async () => {
    expect(await simpanDrafPengaduan(ISI, [], { pemilik: 10, keadaan: 'sesi', sekarang: T })).toBe(
      true,
    );

    expect(await ambilDrafPengaduan({ sekarang: T })).toEqual({ pemilik: 10, medan: ISI, files: [] });
  });

  /**
   * Daftar putih, bukan daftar hitam. Medan yang kelak ditambahkan ke formulir
   * tidak boleh ikut ke disk hanya karena tak ada yang ingat mengecualikannya.
   * Pemilik datang dari argumen saja, tidak pernah dari isi formulir.
   */
  it('hanya medan daftar putih yang ikut; pemilik di isi formulir diabaikan', async () => {
    await simpanDrafPengaduan({ ...ISI, files: ['x'], token: 'rahasia', pemilik: 99 }, [], {
      pemilik: 10,
      keadaan: 'sesi',
      sekarang: T,
    });

    const draf = await ambilDrafPengaduan({ sekarang: T });
    expect(draf.medan).toEqual(ISI);
    expect(draf.pemilik).toBe(10);
  });

  it('lampiran pulih utuh: nama, tipe, lastModified, dan isinya', async () => {
    await simpanDrafPengaduan(ISI, [foto()], { pemilik: 10, keadaan: 'sesi', sekarang: T });

    const { files } = await ambilDrafPengaduan({ sekarang: T });
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0].name).toBe('bukti.png');
    expect(files[0].type).toBe('image/png');
    expect(files[0].lastModified).toBe(1700000000000);
    expect(Array.from(new Uint8Array(await files[0].arrayBuffer()))).toEqual(BYTE_FOTO);
  });

  /** Simpan sebagian lebih buruk dari tidak menyimpan: layar akan mengaku lampirannya ikut. */
  it('lampiran yang gagal dibaca membuat simpan gagal seluruhnya', async () => {
    const rusak = foto();
    rusak.arrayBuffer = () => Promise.reject(new Error('tak terbaca'));

    expect(
      await simpanDrafPengaduan(ISI, [rusak], { pemilik: 10, keadaan: 'sesi', sekarang: T }),
    ).toBe(false);
    expect(await ambilDrafPengaduan({ sekarang: T })).toBeNull();
  });

  it('tanpa pemilik, tidak ada yang disimpan', async () => {
    expect(await simpanDrafPengaduan(ISI, [], { keadaan: 'persetujuan', sekarang: T })).toBe(false);

    expect(await ambilDrafPengaduan({ sekarang: T })).toBeNull();
  });

  it.each([
    ['persetujuan', T + DUA_JAM],
    ['sesi', T + DUA_JAM],
    // Senin 08.00 WIB: hidup sepanjang Selasa, mati Rabu 00.00 WIB.
    ['batas_harian', Date.parse('2026-11-24T17:00:00Z')],
    // Keadaan tak dikenal memakai TTL yang pendek, bukan yang panjang.
    ['entah', T + DUA_JAM],
  ])('TTL keadaan %s', async (keadaan, batas) => {
    await simpanDrafPengaduan(ISI, [], { pemilik: 10, keadaan, sekarang: T });

    expect(await ambilDrafPengaduan({ sekarang: batas - 1 })).not.toBeNull();
    expect(await ambilDrafPengaduan({ sekarang: batas })).toBeNull();
  });

  it('tanpa draf tersimpan mengembalikan null', async () => {
    expect(await ambilDrafPengaduan({ sekarang: T })).toBeNull();
  });

  it('draf yang dihapus tak dapat diambil lagi', async () => {
    await simpanDrafPengaduan(ISI, [], { pemilik: 10, keadaan: 'sesi', sekarang: T });
    await hapusDrafPengaduan();

    expect(await ambilDrafPengaduan({ sekarang: T })).toBeNull();
  });
});

describe('teksDrafTersimpan', () => {
  it.each([
    [
      'sesi',
      true,
      'Isian dan lampiran Anda disimpan di peramban ini selama 2 jam. Untuk menghapusnya sekarang, masuk lalu keluar dari akun.',
    ],
    [
      'persetujuan',
      false,
      'Isian Anda disimpan di peramban ini selama 2 jam. Keluar dari akun akan menghapusnya.',
    ],
    [
      'batas_harian',
      false,
      'Isian Anda disimpan di peramban ini sampai akhir hari besok. Keluar dari akun akan menghapusnya.',
    ],
  ])('%s, lampiran %s', (keadaan, adaLampiran, teks) => {
    expect(teksDrafTersimpan(keadaan, adaLampiran)).toBe(teks);
  });
});
