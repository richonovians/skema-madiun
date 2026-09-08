import { extractOpdClaimValues, normalkanNamaOpd, parseOpdClaimFields } from './sso-opd.mapper';

/**
 * OPD dari klaim Helpdesk (permintaan pengguna 8 September 2026).
 *
 * Kata penggunanya: "ketika sedang login request di helpdesk, nantinya dari
 * helpdesk akan mengirim userinfo yang berisi data usernya, pada data user
 * tersebut jika pengguna seorang ASN akan ada data nama opdnya, dan dari data
 * user/ASN tersebut akan menentukan dinas user tersebut di sebuah opd."
 *
 * BENTUK KLAIMNYA BELUM DIKETAHUI, dan pengguna belum memiliki contoh payload.
 * Karena itu berkas ini TIDAK menebak: nama field-nya dikonfigurasi lewat env
 * (`HELPDESK_SSO_OPD_CLAIM`), dan pencocokannya dibuat tahan terhadap tiga
 * bentuk sekaligus (UUID, kode, nama). Yang tak boleh terjadi: menebak salah
 * lalu menautkan seseorang ke OPD yang bukan tempatnya.
 */
describe('parseOpdClaimFields', () => {
  it('menguraikan daftar dipisah koma, merapikan spasi', () => {
    expect(parseOpdClaimFields('opd, satker , instansi')).toEqual(['opd', 'satker', 'instansi']);
  });

  it('env kosong -> daftar baku, bukan array kosong', () => {
    // Baku yang masuk akal lebih baik daripada mati total: kalau ternyata
    // Helpdesk memakai salah satu nama lazim ini, fiturnya jalan tanpa env.
    const baku = parseOpdClaimFields(undefined);

    expect(baku).toContain('opd');
    expect(baku.length).toBeGreaterThan(1);
    expect(parseOpdClaimFields('   ')).toEqual(baku);
  });

  it('membuang entri kosong dan duplikat', () => {
    expect(parseOpdClaimFields('opd,,opd, satker')).toEqual(['opd', 'satker']);
  });
});

describe('extractOpdClaimValues', () => {
  const FIELDS = ['opd', 'satker'];

  it('mengambil nilai string dari field yang dikonfigurasi', () => {
    expect(extractOpdClaimValues({ opd: 'Dinas Kesehatan' }, FIELDS)).toEqual(['Dinas Kesehatan']);
  });

  it('mengabaikan field yang tak dikonfigurasi', () => {
    // Penting: `nama` & `email` TIDAK boleh ikut terbaca sebagai OPD. Tanpa
    // pembatasan ini, satu akun bernama sama dengan sebuah OPD dapat tertaut
    // ke instansi itu.
    expect(extractOpdClaimValues({ nama: 'Dinas Kesehatan' }, FIELDS)).toEqual([]);
  });

  it('menerima array, dan setiap elemennya nilai UTUH', () => {
    // Nama OPD memuat spasi, jadi elemen array TIDAK boleh dipecah per spasi
    // seperti yang dilakukan penguraian klaim role.
    expect(extractOpdClaimValues({ opd: ['Dinas Kesehatan', 'DINKES'] }, FIELDS)).toEqual([
      'Dinas Kesehatan',
      'DINKES',
    ]);
  });

  it('membaca objek bersarang lewat `nama`/`name`/`kode`', () => {
    // Bentuk yang lazim: klaimnya objek, bukan string.
    expect(
      extractOpdClaimValues({ opd: { nama: 'Dinas Kesehatan', kode: 'DINKES' } }, FIELDS),
    ).toEqual(['Dinas Kesehatan', 'DINKES']);
  });

  it('mengumpulkan dari beberapa field sekaligus, tanpa duplikat', () => {
    expect(extractOpdClaimValues({ opd: 'DINKES', satker: 'DINKES' }, FIELDS)).toEqual(['DINKES']);
  });

  it('nilai bukan-teks diabaikan, tidak menjadi "[object Object]"', () => {
    expect(extractOpdClaimValues({ opd: 42 }, FIELDS)).toEqual([]);
    expect(extractOpdClaimValues({ opd: null }, FIELDS)).toEqual([]);
    expect(extractOpdClaimValues({}, FIELDS)).toEqual([]);
  });

  it('teks kosong & spasi saja diabaikan', () => {
    expect(extractOpdClaimValues({ opd: '   ' }, FIELDS)).toEqual([]);
  });
});

describe('normalkanNamaOpd', () => {
  it('huruf kecil dan spasi dirapatkan', () => {
    expect(normalkanNamaOpd('  Dinas   KESEHATAN ')).toBe('dinas kesehatan');
  });

  it('tanda baca dibuang, supaya titik & tanda hubung tak menggagalkan pencocokan', () => {
    expect(normalkanNamaOpd('Dinas Kesehatan, P2KB.')).toBe(
      normalkanNamaOpd('Dinas Kesehatan P2KB'),
    );
  });

  it('TIDAK menyamakan nama yang memang berbeda', () => {
    // Penjaga terpenting di berkas ini. "Dinas Kesehatan" dan "Dinas Kesehatan
    // dan Keluarga Berencana" adalah dua instansi berbeda, dan pencocokan yang
    // menyamakan keduanya akan menautkan orang ke tempat yang salah.
    expect(normalkanNamaOpd('Dinas Kesehatan')).not.toBe(
      normalkanNamaOpd('Dinas Kesehatan dan Keluarga Berencana'),
    );
  });
});
