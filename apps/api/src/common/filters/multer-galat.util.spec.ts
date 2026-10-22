import { MulterError } from 'multer';
import { petakanGalatMulter } from './multer-galat.util';

/**
 * Penolakan multer yang LOLOS dari pemetaan @nestjs/platform-express
 * (22 Oktober 2026).
 *
 * `transformException` milik Nest 11.1.28 mencocokkan galat multer pada
 * `error.message`, memakai tabel kalimat yang disalin dari multer 1.x. multer
 * 2.4.0 -- versi yang terpasang di sini -- mengganti satu kalimat dan menambah
 * empat kode baru, sehingga LIMA kode luput dari `switch` itu, lewat apa adanya
 * sebagai Error biasa, lalu dijawab `500 INTERNAL_SERVER_ERROR`. Padahal
 * kelimanya galat KLIEN.
 *
 * | kode multer             | kalimat multer 2.4.0              | ada di tabel Nest |
 * | ----------------------- | --------------------------------- | ----------------- |
 * | LIMIT_UNEXPECTED_FILE   | Unexpected file field             | tidak (`Unexpected field`) |
 * | LIMIT_FIELD_NESTING     | Field name nesting too deep       | tidak |
 * | LIMIT_FIELD_ARRAY_INDEX | Field name array index too large  | tidak |
 * | STREAM_DESTROYED        | File stream was destroyed         | tidak |
 * | INVALID_FIELD_NAME      | Invalid field name                | tidak |
 *
 * Karena itu pemetaan di sini memakai `error.code`, BUKAN `error.message` --
 * persis seperti yang diperintahkan docblock multer sendiri ("Check `err.code`
 * rather than the message"). Mengulangi kopling Nest berarti mengundang cacat
 * yang sama lahir kembali pada pembaruan multer berikutnya.
 */
describe('petakanGalatMulter', () => {
  /**
   * `@types/multer@2.2.0` pun ketinggalan dari runtime-nya: union `ErrorCode`
   * di sana belum memuat empat kode yang multer 2.4.0 tambahkan, jadi kode
   * sungguhan ditolak pemeriksa tipe. Dilewatkan lewat satu pembantu agar
   * cast-nya terkumpul di satu tempat, bukan tersebar di tiap uji.
   */
  type KodeMulter = ConstructorParameters<typeof MulterError>[0];
  const galatMulter = (kode: string, medan?: string) => new MulterError(kode as KodeMulter, medan);

  it('LIMIT_UNEXPECTED_FILE -> dipetakan, dan menyebut nama medan yang dikirim', () => {
    const hasil = petakanGalatMulter(galatMulter('LIMIT_UNEXPECTED_FILE', 'foto'));

    expect(hasil).not.toBeNull();
    expect(hasil?.code).toBe('LIMIT_UNEXPECTED_FILE');
    expect(hasil?.message).toContain('foto');
  });

  it('LIMIT_FIELD_NESTING -> dipetakan (kode yang BELUM ada di tabel Nest)', () => {
    const hasil = petakanGalatMulter(galatMulter('LIMIT_FIELD_NESTING', 'a[b][c]'));

    expect(hasil?.code).toBe('LIMIT_FIELD_NESTING');
    expect(hasil?.message).not.toBe('');
  });

  it('INVALID_FIELD_NAME -> dipetakan', () => {
    const hasil = petakanGalatMulter(galatMulter('INVALID_FIELD_NAME'));

    expect(hasil?.code).toBe('INVALID_FIELD_NAME');
  });

  /**
   * Penjaga terhadap pembaruan multer berikutnya: kode yang belum dikenal pun
   * tetap 400 berpesan umum, bukan kembali menjadi 500 senyap.
   */
  it('kode multer yang belum dikenal TETAP dipetakan, dengan pesan umum', () => {
    const hasil = petakanGalatMulter(galatMulter('KODE_MASA_DEPAN'));

    expect(hasil).not.toBeNull();
    expect(hasil?.message).not.toBe('');
  });

  it('nama medan yang kelewat panjang dipangkas, bukan dipantulkan utuh', () => {
    const panjang = 'm'.repeat(300);
    const hasil = petakanGalatMulter(galatMulter('LIMIT_UNEXPECTED_FILE', panjang));

    expect(hasil?.message.length).toBeLessThan(200);
  });

  /**
   * Statusnya tidak seragam 400. `LIMIT_FILE_SIZE` wajib 413, sebab itulah
   * status yang dipakai jalur yang sudah ada dan yang dijaga
   * test/lampiran-batas-ukuran.e2e-spec.ts. Hari ini galat itu tak pernah
   * sampai ke sini -- Nest memetakannya lebih dulu atas dasar kalimatnya --
   * tetapi multer sudah pernah mengganti satu kalimat, jadi jalur mentahnya
   * harus tetap menjawab 413, bukan 400.
   */
  it('LIMIT_FILE_SIZE -> 413, bukan 400', () => {
    const hasil = petakanGalatMulter(galatMulter('LIMIT_FILE_SIZE', 'lampiran'));

    expect(hasil?.statusCode).toBe(413);
  });

  it('LIMIT_UNEXPECTED_FILE -> 400', () => {
    const hasil = petakanGalatMulter(galatMulter('LIMIT_UNEXPECTED_FILE', 'foto'));

    expect(hasil?.statusCode).toBe(400);
  });

  /**
   * KENDALI, dan inilah yang membuat uji di atas bermakna: galat biasa TIDAK
   * boleh ikut dipetakan menjadi 400, sebab 500-nya mungkin benar.
   */
  it('KENDALI: Error biasa -> null (tetap 500)', () => {
    expect(petakanGalatMulter(new Error('sesuatu pecah'))).toBeNull();
  });

  /**
   * KENDALI KEDUA: pencocokannya pada `code`, bukan pada kalimat. Galat yang
   * kebetulan berkalimat sama persis dengan multer tetap bukan galat multer.
   */
  it('KENDALI: Error berkalimat mirip multer tetap null', () => {
    expect(petakanGalatMulter(new Error('Unexpected file field'))).toBeNull();
  });

  it('KENDALI: null dan undefined -> null', () => {
    expect(petakanGalatMulter(null)).toBeNull();
    expect(petakanGalatMulter(undefined)).toBeNull();
  });
});
