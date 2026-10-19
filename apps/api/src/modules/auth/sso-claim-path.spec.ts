import { ambilJalurKlaim } from './sso-claim-path';

/**
 * Pembaca jalur klaim bersarang (28 September 2026).
 *
 * Contoh payload `userinfo` Helpdesk akhirnya diterima, dan ia BERSARANG:
 * `identity.user_type` menentukan ASN atau masyarakat, `governance.tenant_id`
 * membawa UUID OPD. Kedua pembaca klaim yang ada hanya membaca kunci tingkat
 * atas (`klaim[field]`), jadi keduanya tak akan pernah menemukan apa pun.
 *
 * Fungsi ini sengaja dipisah dan murni: ia dipakai oleh pemeta peran DAN pemeta
 * OPD, dan keduanya titik tempat kesalahan berakibat seseorang memegang hak
 * atau instansi yang bukan miliknya.
 */
describe('ambilJalurKlaim', () => {
  const klaim = {
    sub: 'uuid-pengguna',
    role: 'admin',
    groups: ['admin'],
    identity: {
      user_type: 'asn',
      name: 'Nama Lengkap Pengguna',
    },
    governance: {
      role: 'admin',
      tenant_id: '8b026b5a-0000-4000-8000-000000000000',
      tenant_name: 'Dinas Komunikasi dan Informatika',
      banned_until: null,
    },
  };

  it('membaca kunci tingkat atas persis seperti `klaim[field]`', () => {
    // Jaminan kompatibilitas: seluruh konfigurasi yang sudah terpasang di mana
    // pun memakai nama field tanpa titik, dan tak boleh berubah artinya.
    expect(ambilJalurKlaim(klaim, 'role')).toBe('admin');
    expect(ambilJalurKlaim(klaim, 'groups')).toEqual(['admin']);
  });

  it('menelusuri jalur bersarang yang dipisah titik', () => {
    expect(ambilJalurKlaim(klaim, 'identity.user_type')).toBe('asn');
    expect(ambilJalurKlaim(klaim, 'governance.tenant_id')).toBe(
      '8b026b5a-0000-4000-8000-000000000000',
    );
  });

  it('mengembalikan objeknya sendiri bila jalurnya berhenti di sebuah objek', () => {
    expect(ambilJalurKlaim(klaim, 'governance')).toEqual(klaim.governance);
  });

  it('mengembalikan undefined untuk jalur yang tak ada, tanpa melempar', () => {
    expect(ambilJalurKlaim(klaim, 'identity.nip')).toBeUndefined();
    expect(ambilJalurKlaim(klaim, 'tidak.ada.sama.sekali')).toBeUndefined();
    expect(ambilJalurKlaim(klaim, '')).toBeUndefined();
  });

  it('berhenti bila satu langkah di tengah bukan objek', () => {
    // `role` sebuah string; `role.sesuatu` TIDAK boleh menjadi properti string
    // bawaan JavaScript. Tanpa penjaga ini, `role.length` akan mengembalikan 5
    // dan nilai itu ikut dianggap kandidat peran atau OPD.
    expect(ambilJalurKlaim(klaim, 'role.length')).toBeUndefined();
    expect(ambilJalurKlaim(klaim, 'groups.0')).toBeUndefined();
  });

  it('tidak pernah menembus ke prototipe', () => {
    // `constructor` dan `__proto__` ada pada setiap objek. Membiarkannya
    // terbaca berarti env yang salah tulis dapat menarik keluar fungsi bawaan.
    expect(ambilJalurKlaim(klaim, 'constructor')).toBeUndefined();
    expect(ambilJalurKlaim(klaim, '__proto__')).toBeUndefined();
    expect(ambilJalurKlaim(klaim, 'governance.__proto__')).toBeUndefined();
  });

  it('memaafkan spasi di sekitar tiap langkah', () => {
    expect(ambilJalurKlaim(klaim, ' identity . user_type ')).toBe('asn');
  });

  it('mengembalikan undefined bila klaimnya sendiri tak ada', () => {
    expect(ambilJalurKlaim(undefined, 'identity.user_type')).toBeUndefined();
  });

  it('membedakan nilai null dari ketiadaan', () => {
    // `banned_until: null` ADA dan bernilai null. Pemanggil yang mengabaikan
    // non-string tak terpengaruh, tapi menyamakan keduanya di sini akan
    // menyembunyikan beda yang kelak dibutuhkan.
    expect(ambilJalurKlaim(klaim, 'governance.banned_until')).toBeNull();
  });
});
