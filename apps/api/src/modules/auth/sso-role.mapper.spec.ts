import { Role } from '@prisma/client';
import { parseClaimValues, parseRoleMap, resolveRoleFromClaims } from './sso-role.mapper';

describe('parseClaimValues', () => {
  /**
   * Bentuk klaim `groups`/`role` Helpdesk BELUM dikonfirmasi (butir 04 dokumen
   * permintaan), jadi parser ini harus memaklumi bentuk apa pun yang masuk akal
   * dan TIDAK boleh melempar galat untuk bentuk yang tak dikenal -- galat di sini
   * berarti login gagal total hanya karena bentuk klaim di luar dugaan.
   */
  it.each([
    ['string tunggal', 'admin-kab', undefined, ['admin-kab']],
    ['string dipisah koma', 'admin-kab,admin-opd', undefined, ['admin-kab', 'admin-opd']],
    ['string dipisah spasi', 'admin-kab admin-opd', undefined, ['admin-kab', 'admin-opd']],
    ['array string', ['admin-kab', 'x'], undefined, ['admin-kab', 'x']],
    ['array objek {name}', [{ name: 'Admin-Kab' }], undefined, ['admin-kab']],
    ['array objek {slug}', [{ slug: 'admin-opd' }], undefined, ['admin-opd']],
    ['array objek {id} angka', [{ id: 12 }], undefined, ['12']],
    ['objek tunggal {name}', { name: 'admin-kab' }, undefined, ['admin-kab']],
    ['klaim role saja', undefined, 'admin-opd', ['admin-opd']],
    ['groups + role digabung', ['a'], 'b', ['a', 'b']],
  ])('%s', (_nama, groups, role, harapan) => {
    expect(parseClaimValues(groups, role)).toEqual(harapan);
  });

  it('menormalkan huruf besar & spasi tepi', () => {
    expect(parseClaimValues([' Admin-KAB '], ' ADMIN-OPD ')).toEqual(['admin-kab', 'admin-opd']);
  });

  it('membuang duplikat', () => {
    expect(parseClaimValues(['a', 'A', ' a '], 'a')).toEqual(['a']);
  });

  it.each([
    ['keduanya kosong', undefined, undefined],
    ['null', null, null],
    ['string kosong', '   ', ''],
    ['angka', 42, true],
    ['array berisi null & angka', [null, 7, {}], undefined],
    ['array bersarang', [['a']], undefined],
  ])('bentuk tak dipakai -> array kosong, tanpa melempar (%s)', (_n, groups, role) => {
    expect(() => parseClaimValues(groups, role)).not.toThrow();
    expect(parseClaimValues(groups, role)).toEqual([]);
  });
});

describe('parseRoleMap', () => {
  it('membaca pasangan nilaiKlaim:peran', () => {
    const map = parseRoleMap('admin-kab:kabupaten,admin-opd:opd');

    expect(map.get('admin-kab')).toBe(Role.kabupaten);
    expect(map.get('admin-opd')).toBe(Role.opd);
    expect(map.size).toBe(2);
  });

  it('memaafkan spasi berlebih & huruf besar pada kunci', () => {
    const map = parseRoleMap('  Admin-Kab : kabupaten ,  admin-opd:opd  ');

    expect(map.get('admin-kab')).toBe(Role.kabupaten);
    expect(map.size).toBe(2);
  });

  /**
   * INI PEMERIKSAAN KEAMANAN, bukan sekadar validasi bentuk. `superuser`
   * memegang log aktivitas & manajemen pengguna; membiarkannya dipetakan dari
   * klaim berarti menyerahkan penetapan hak tertinggi kepada sistem di luar
   * kendali kita.
   */
  it('MENOLAK pemetaan ke superuser', () => {
    const map = parseRoleMap('bos:superuser,admin-opd:opd');

    expect(map.has('bos')).toBe(false);
    expect(map.get('admin-opd')).toBe(Role.opd);
  });

  it.each([
    ['peran tak dikenal', 'x:raja'],
    ['tanpa titik dua', 'admin-kab'],
    ['peran kosong', 'admin-kab:'],
    ['kunci kosong', ':kabupaten'],
  ])('mengabaikan entri cacat (%s)', (_n, raw) => {
    expect(parseRoleMap(raw).size).toBe(0);
  });

  it.each([[undefined], ['']])('tanpa konfigurasi -> map kosong', (raw) => {
    expect(parseRoleMap(raw as string | undefined).size).toBe(0);
  });

  it('kunci ganda: entri terakhir menang', () => {
    expect(parseRoleMap('a:opd,a:kabupaten').get('a')).toBe(Role.kabupaten);
  });
});

describe('resolveRoleFromClaims', () => {
  const map = parseRoleMap('admin-kab:kabupaten,admin-opd:opd,warga:responden');

  it('satu nilai cocok -> peran itu', () => {
    expect(resolveRoleFromClaims(['admin-opd'], map)).toBe(Role.opd);
  });

  it('tak ada yang cocok -> null (pemanggil yang menentukan bakunya)', () => {
    expect(resolveRoleFromClaims(['tak-dikenal'], map)).toBeNull();
  });

  it('nilai kosong -> null', () => {
    expect(resolveRoleFromClaims([], map)).toBeNull();
  });

  it('map kosong -> null walau nilainya ada', () => {
    expect(resolveRoleFromClaims(['admin-kab'], new Map())).toBeNull();
  });

  /**
   * Urutan kemenangan DITETAPKAN (kabupaten > opd > responden), bukan "yang
   * pertama ditemukan": urutan klaim dari Helpdesk tak dijamin stabil, dan peran
   * yang berubah-ubah antar login jauh lebih membingungkan daripada satu aturan
   * yang selalu sama. Batas atasnya tetap `kabupaten` karena `superuser` tak
   * pernah bisa dipetakan.
   */
  it('beberapa cocok -> peran paling tinggi, apa pun urutan klaimnya', () => {
    expect(resolveRoleFromClaims(['admin-opd', 'admin-kab'], map)).toBe(Role.kabupaten);
    expect(resolveRoleFromClaims(['admin-kab', 'admin-opd'], map)).toBe(Role.kabupaten);
    expect(resolveRoleFromClaims(['warga', 'admin-opd'], map)).toBe(Role.opd);
  });
});
