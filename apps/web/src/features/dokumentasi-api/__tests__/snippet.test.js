import { curlSnippet, fetchSnippet, nilaiContoh, PENGISI_TOKEN } from '../lib/snippet';
import { adaptOpenApi } from '../adapters/openapi.adapter';
import { dokumenOpenApi } from '../__fixtures__/openapi.fixture';

const operasi = (metode, path) =>
  adaptOpenApi(dokumenOpenApi)[0].operasi.find((o) => o.metode === metode && o.path === path);

describe('curlSnippet', () => {
  it('memakai metode dan path apa adanya, tanpa menambah prefiks', () => {
    const s = curlSnippet(operasi('GET', '/api/v1/surveys'), { asal: 'http://skema.local' });

    expect(s).toContain("curl -X GET 'http://skema.local/api/v1/surveys'");
    // Path di dokumen SUDAH memuat /api/v1 (terukur: '/api/v1/health');
    // menambahkannya lagi menghasilkan /api/v1/api/v1 yang 404.
    expect(s).not.toContain('/api/v1/api/v1');
  });

  it('menulis parameter path sebagai pengisi, bukan angka contoh', () => {
    const s = curlSnippet(operasi('GET', '/api/v1/surveys/{id}'), { asal: 'http://skema.local' });

    expect(s).toContain('/api/v1/surveys/<id>');
    expect(s).not.toContain('{id}');
  });

  /**
   * PAGAR KEAMANAN. Snippet memakai PENGISI, bukan nilai sesi sungguhan: admin
   * yang menempelkan snippet ke tiket atau grup percakapan akan membocorkan
   * sesinya sendiri. Halaman juga memang tak dapat membacanya -- cookie
   * `session` ber-HttpOnly.
   */
  it('memakai pengisi token, bukan nilai sesi', () => {
    const s = curlSnippet(operasi('GET', '/api/v1/surveys'), { asal: 'http://skema.local' });

    expect(s).toContain(`-b 'session=${PENGISI_TOKEN}'`);
    expect(PENGISI_TOKEN).toBe('<token>');
  });

  it('menyertakan badan hanya untuk properti wajib, dengan contoh bila ada', () => {
    const s = curlSnippet(operasi('POST', '/api/v1/surveys'), { asal: 'http://skema.local' });

    expect(s).toContain("-H 'Content-Type: application/json'");
    expect(s).toContain('"periode": "2026-Q1"');
    expect(s).toContain('"judul": "<string>"');
    // `opdId` opsional: ditabelkan komponen, bukan disarankan di snippet.
    expect(s).not.toContain('opdId');
  });

  it('tidak menyertakan query opsional di URL', () => {
    const s = curlSnippet(operasi('GET', '/api/v1/surveys'), { asal: 'http://skema.local' });

    // `page`, `limit`, dan `status` ketiganya `required: false` dan tanpa
    // `example`; menaruhnya di URL berarti mengarang nilai.
    expect(s).not.toContain('page=');
    expect(s).not.toContain('status=');
  });
});

describe('fetchSnippet', () => {
  it('memakai credentials include dan TIDAK memuat kredensial apa pun', () => {
    const s = fetchSnippet(operasi('GET', '/api/v1/surveys'));

    expect(s).toContain("credentials: 'include'");
    expect(s).not.toContain('session=');
    expect(s).not.toContain(PENGISI_TOKEN);
  });

  it('menyertakan header dan badan untuk POST', () => {
    const s = fetchSnippet(operasi('POST', '/api/v1/surveys'));

    expect(s).toContain("method: 'POST'");
    expect(s).toContain("'Content-Type': 'application/json'");
    expect(s).toContain('JSON.stringify');
    expect(s).toContain('"periode": "2026-Q1"');
  });
});

/**
 * CACAT YANG DIJAGA DI SINI. `nilaiContoh` memberi `0` untuk setiap angka,
 * padahal dokumen sungguhan mendeklarasikan `minimum: 1` pada lima properti
 * (mis. `AnswerInputDto.questionId`, dan `nilai` yang ber-`minimum: 1,
 * maximum: 4`). Snippet yang disalin apa adanya karena itu PASTI ditolak 400 --
 * ia menyarankan nilai yang API-nya sendiri nyatakan tak sah.
 */
describe('nilaiContoh menghormati batasan', () => {
  it('memakai minimum sebagai nilai contoh, bukan nol', () => {
    expect(nilaiContoh({ tipe: 'number', contoh: null, pilihan: null, batasan: { minimum: 1 } })).toBe(1);
  });

  it('tetap nol bila tak ada minimum', () => {
    expect(nilaiContoh({ tipe: 'number', contoh: null, pilihan: null, batasan: {} })).toBe(0);
  });

  it('menulis pengisi waktu untuk format date-time, bukan <string>', () => {
    expect(
      nilaiContoh({ tipe: 'string', contoh: null, pilihan: null, batasan: { format: 'date-time' } }),
    ).toBe('<ISO-8601>');
  });

  it('contoh tersurat tetap menang atas batasan', () => {
    expect(
      nilaiContoh({ tipe: 'number', contoh: 7, pilihan: null, batasan: { minimum: 1 } }),
    ).toBe(7);
  });
});

/**
 * Badan multipart TIDAK dikirim sebagai `-d`. curl menyusun batas multipart
 * sendiri lewat `-F`; memakai `-d` menghasilkan permintaan yang ditolak server
 * karena Content-Type-nya salah.
 */
describe('snippet badan multipart', () => {
  const pengaduan = () =>
    adaptOpenApi(dokumenOpenApi).find((g) => g.tag === 'complaints').operasi[0];

  it('memakai -F per medan wajib, bukan -d', () => {
    const s = curlSnippet(pengaduan(), { asal: 'http://skema.local' });

    expect(s).toContain("-F 'judul=<string>'");
    expect(s).toContain("-F 'kategori=aduan'");
    expect(s).not.toContain('-d ');
    expect(s).not.toContain("Content-Type: application/json");
  });

  it('fetch memakai FormData, bukan JSON.stringify', () => {
    const s = fetchSnippet(pengaduan());

    expect(s).toContain('FormData');
    expect(s).not.toContain('JSON.stringify');
  });
});
