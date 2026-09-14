import { Role } from '@prisma/client';
import { parseClaimValues, parseRolePackages, resolveRolesFromClaims } from './sso-role.mapper';

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

describe('parseRolePackages', () => {
  it('membaca bentuk LAMA nilaiKlaim:peran sebagai paket berisi satu peran', () => {
    const map = parseRolePackages('admin-kab:kabupaten,admin-opd:opd');

    // Bentuk lama HARUS tetap sah: env yang sudah terpasang di lingkungan mana
    // pun tak boleh rusak hanya karena format paket ditambahkan.
    expect(map.get('admin-kab')).toEqual([Role.kabupaten]);
    expect(map.get('admin-opd')).toEqual([Role.opd]);
    expect(map.size).toBe(2);
  });

  it('membaca paket berisi beberapa peran, dipisah tanda tambah', () => {
    const map = parseRolePackages('pegawai-dinas:opd+responden,admin:superuser+opd+responden');

    expect(map.get('pegawai-dinas')).toEqual([Role.opd, Role.responden]);
    expect(map.get('admin')).toEqual([Role.superuser, Role.opd, Role.responden]);
  });

  it('memaafkan spasi berlebih & huruf besar', () => {
    const map = parseRolePackages('  Pegawai-Dinas : OPD + Responden  ');

    expect(map.get('pegawai-dinas')).toEqual([Role.opd, Role.responden]);
  });

  it('membuang peran ganda di dalam satu paket', () => {
    expect(parseRolePackages('a:opd+opd+responden').get('a')).toEqual([Role.opd, Role.responden]);
  });

  /**
   * PEMBALIKAN YANG DISENGAJA (keputusan pengguna 6 September 2026): sebelum ini
   * `superuser` sengaja TIDAK dapat dipetakan dari klaim, karena peran itu
   * memegang log aktivitas & manajemen pengguna. Pengguna meminta tipe "admin"
   * dari Helpdesk menjadi superuser di SKEMA, jadi larangan itu dicabut.
   *
   * Pengamannya BUKAN di sini melainkan tiga hal di luar fungsi ini: baku tetap
   * `responden` bila env kosong, penetapan hanya saat akun dibuat, dan
   * pembuatannya tercatat di audit_logs. Lihat spec Bagian A.3.
   */
  it('MENERIMA pemetaan ke superuser -- larangan lama sudah dicabut', () => {
    const map = parseRolePackages('admin:superuser');

    expect(map.get('admin')).toEqual([Role.superuser]);
  });

  it.each([
    ['peran tak dikenal', 'x:raja'],
    ['tanpa titik dua', 'admin-kab'],
    ['paket kosong', 'admin-kab:'],
    ['kunci kosong', ':kabupaten'],
    ['seluruh isi paket tak dikenal', 'a:raja+kaisar'],
  ])('mengabaikan entri cacat (%s)', (_n, raw) => {
    expect(parseRolePackages(raw).size).toBe(0);
  });

  it('paket separuh cacat: peran yang sah tetap terpakai', () => {
    // Entri cacat diabaikan DIAM-DIAM alih-alih menggagalkan boot -- env salah
    // tulis sebaiknya membuat pemetaan tak berlaku, bukan mematikan API.
    expect(parseRolePackages('a:opd+raja').get('a')).toEqual([Role.opd]);
  });

  it.each([[undefined], ['']])('tanpa konfigurasi -> map kosong', (raw) => {
    expect(parseRolePackages(raw as string | undefined).size).toBe(0);
  });

  it('kunci ganda: entri terakhir menang', () => {
    expect(parseRolePackages('a:opd,a:kabupaten').get('a')).toEqual([Role.kabupaten]);
  });
});

describe('resolveRolesFromClaims', () => {
  const map = parseRolePackages(
    'pegawai-dinas:opd+responden,admin:superuser+opd+responden,warga:responden',
  );

  it('satu nilai cocok -> seluruh paketnya', () => {
    expect(resolveRolesFromClaims(['pegawai-dinas'], map)).toEqual([Role.opd, Role.responden]);
  });

  it('tak ada yang cocok -> array kosong (pemanggil yang menentukan bakunya)', () => {
    expect(resolveRolesFromClaims(['tak-dikenal'], map)).toEqual([]);
  });

  it('nilai kosong -> array kosong', () => {
    expect(resolveRolesFromClaims([], map)).toEqual([]);
  });

  it('map kosong -> array kosong walau nilainya ada', () => {
    expect(resolveRolesFromClaims(['admin'], new Map())).toEqual([]);
  });

  /**
   * UNION, bukan peringkat. `ROLE_PRECEDENCE` dibuang bersama pemetaan tunggal:
   * begitu satu klaim dapat membawa beberapa peran, "peran mana yang menang"
   * tak lagi bermakna. Union dapat diramalkan karena tiap entri ditulis manusia
   * di env -- ia tak bergantung pada urutan klaim, yang memang tak dijamin.
   */
  it('beberapa paket cocok -> gabungan, tanpa duplikat, apa pun urutan klaimnya', () => {
    expect(resolveRolesFromClaims(['pegawai-dinas', 'warga'], map)).toEqual([
      Role.opd,
      Role.responden,
    ]);
    expect(resolveRolesFromClaims(['warga', 'pegawai-dinas'], map)).toEqual([
      Role.responden,
      Role.opd,
    ]);
  });

  it('paket bertumpang tindih tidak menghasilkan role ganda', () => {
    const hasil = resolveRolesFromClaims(['admin', 'pegawai-dinas'], map);

    expect([...hasil].sort()).toEqual([Role.opd, Role.responden, Role.superuser].sort());
    expect(hasil.length).toBe(3);
  });
});
