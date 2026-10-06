import {
  responsBerhasil,
  responsGagal,
  kodeGalatLain,
  mungkinBerpaginasi,
} from '../lib/respons';
import { adaptOpenApi } from '../adapters/openapi.adapter';
import { dokumenOpenApi } from '../__fixtures__/openapi.fixture';

const grup = () => adaptOpenApi(dokumenOpenApi);
const surveys = (metode, path) =>
  grup()[0].operasi.find((o) => o.metode === metode && (!path || o.path === path));
const publik = () => grup().find((g) => g.tag === 'public').operasi[0];

const urai = (teks) => JSON.parse(teks);

/**
 * SELURUH bentuk di berkas uji ini DIUKUR dari API yang berjalan pada 5
 * Oktober 2026, bukan dibaca dari dokumen OpenAPI -- dokumen itu tidak
 * mendeklarasikan satu pun respons galat (hanya 200 pada 61 operasi dan 201
 * pada 4). Yang menghasilkan envelope-nya adalah `ResponseInterceptor` dan
 * penyaring galat global, jadi ke sanalah uji ini harus setia.
 */
describe('responsBerhasil', () => {
  it('memakai envelope sukses yang terukur, dengan message OK', () => {
    const r = urai(responsBerhasil(surveys('GET', '/api/v1/surveys')));

    expect(r.success).toBe(true);
    expect(r.statusCode).toBe(200);
    // `message` SELALU 'OK', bahkan untuk 201 -- dibaca langsung dari
    // response.interceptor.ts, bukan ditebak dari statusnya.
    expect(r.message).toBe('OK');
    expect(r.meta.timestamp).toBeDefined();
  });

  it('memakai status 201 pada endpoint pembuat, tetap dengan message OK', () => {
    const r = urai(responsBerhasil(surveys('POST')));

    expect(r.statusCode).toBe(201);
    expect(r.message).toBe('OK');
  });

  it('membungkus respons berdaftar sebagai array berisi satu contoh', () => {
    const r = urai(responsBerhasil(surveys('GET', '/api/v1/surveys')));

    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data).toHaveLength(1);
    expect(r.data[0].judul).toBe('<string>');
    // Nilai enum bukan karangan: ia didokumentasikan API sendiri.
    expect(r.data[0].status).toBe('draft');
  });

  it('membungkus respons objek tanpa array', () => {
    const r = urai(responsBerhasil(surveys('GET', '/api/v1/surveys/{id}')));

    expect(Array.isArray(r.data)).toBe(false);
    expect(r.data.id).toBe(0);
  });

  /** Tak ada skema berarti `data: null`, bukan bentuk karangan. */
  it('menulis data null bila skema respons tak dideklarasikan', () => {
    const r = urai(responsBerhasil(surveys('DELETE')));

    expect(r.data).toBeNull();
  });

  it('memakai pengisi pada path, bukan id sungguhan', () => {
    const r = urai(responsBerhasil(surveys('GET', '/api/v1/surveys/{id}')));

    expect(r.meta.path).toBe('/api/v1/surveys/<id>');
    expect(r.meta.path).not.toContain('{id}');
  });

  /**
   * `meta.pagination` SENGAJA TIDAK ditampilkan di contoh mana pun.
   *
   * Saya hendak menampilkannya pada endpoint yang skemanya array dan
   * mendeklarasikan `page` + `limit`, lalu menguji aturan itu ke API hidup:
   * ia benar pada 7 endpoint dan SALAH pada `GET /surveys/active`, yang
   * mendeklarasikan kedua parameter itu tetapi membalas tanpa pagination.
   * Satu contoh tandingan sudah cukup untuk membatalkannya sebagai klaim.
   */
  it('tidak pernah menyisipkan meta.pagination ke contoh', () => {
    for (const op of grup().flatMap((g) => g.operasi)) {
      expect(urai(responsBerhasil(op)).meta.pagination).toBeUndefined();
    }
  });
});

describe('responsGagal', () => {
  it('memakai 401 terukur untuk endpoint yang butuh sesi', () => {
    const r = urai(responsGagal(surveys('GET', '/api/v1/surveys')));

    expect(r.statusCode).toBe(401);
    expect(r.message).toBe('Autentikasi diperlukan');
    expect(r.error.code).toBe('UNAUTHORIZED');
  });

  it('memakai 400 dengan details berupa daftar pesan untuk endpoint publik', () => {
    const r = urai(responsGagal(publik()));

    expect(r.statusCode).toBe(400);
    expect(r.error.code).toBe('BAD_REQUEST');
    // Hanya pada kegagalan validasi `details` berbentuk array; pada kode lain
    // ia string. Terukur langsung ke API.
    expect(Array.isArray(r.error.details)).toBe(true);
  });

  /** Envelope galat TIDAK punya `data`. Itu beda bentuk, bukan `data: null`. */
  it('tidak memuat kunci data sama sekali', () => {
    const r = urai(responsGagal(surveys('GET', '/api/v1/surveys')));

    expect(r.success).toBe(false);
    expect('data' in r).toBe(false);
    expect(r.meta.path).toBe('/api/v1/surveys');
  });
});

describe('kodeGalatLain', () => {
  it('menyebut 404 hanya bila operasinya punya parameter path', () => {
    expect(kodeGalatLain(surveys('GET', '/api/v1/surveys/{id}')).join(' ')).toContain('404');
    expect(kodeGalatLain(surveys('GET', '/api/v1/surveys')).join(' ')).not.toContain('404');
  });

  it('menyebut 403 hanya untuk endpoint yang butuh sesi', () => {
    expect(kodeGalatLain(surveys('GET', '/api/v1/surveys')).join(' ')).toContain('403');
    expect(kodeGalatLain(publik()).join(' ')).not.toContain('403');
  });

  /** Yang sudah dicontohkan tak diulang sebagai "kode lain". */
  it('tidak mengulang kode yang sudah jadi contoh', () => {
    expect(kodeGalatLain(surveys('GET', '/api/v1/surveys')).join(' ')).not.toContain('401');
    expect(kodeGalatLain(publik()).join(' ')).not.toContain('400');
  });
});

describe('mungkinBerpaginasi', () => {
  it('benar hanya untuk daftar yang mendeklarasikan page dan limit', () => {
    expect(mungkinBerpaginasi(surveys('GET', '/api/v1/surveys'))).toBe(true);
    expect(mungkinBerpaginasi(surveys('GET', '/api/v1/surveys/{id}'))).toBe(false);
    expect(mungkinBerpaginasi(surveys('DELETE'))).toBe(false);
  });
});

describe('kodeGalatLain menyebut 429', () => {
  /**
   * Throttle GLOBAL (terukur: limit 100 per 60 detik) berlaku bagi SEMUA
   * endpoint, jadi 429 dapat terjadi di mana saja -- termasuk endpoint publik.
   * Sebelum ini ia tak pernah disebut sama sekali, sehingga pembaca kena batas
   * laju tanpa peringatan.
   */
  it('selalu menyebut 429, termasuk pada endpoint publik', () => {
    expect(kodeGalatLain(surveys('GET', '/api/v1/surveys')).join(' ')).toContain('429');
    expect(kodeGalatLain(publik()).join(' ')).toContain('429');
  });

  it('memakai angka handler sendiri bila ia menimpa batas global', () => {
    expect(kodeGalatLain(surveys('POST')).join(' ')).toContain('10 permintaan per 60 detik');
  });

  it('jatuh ke angka global bila handler tak menimpanya', () => {
    expect(kodeGalatLain(surveys('GET', '/api/v1/surveys')).join(' ')).toContain(
      '100 permintaan per 60 detik',
    );
  });
});
