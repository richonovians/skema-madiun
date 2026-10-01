import { adaptMe, samarkanNik } from '../me.adapter';

/**
 * IDENTITAS PADA HALAMAN PROFIL SENDIRI (1 Oktober 2026).
 *
 * Adapter ini memaku `nik`, `nikMasked`, `phone`, dan `address` ke null dengan
 * catatan "TIDAK ADA di skema manapun". Itu benar ketika ditulis, dan menjadi
 * TIDAK BENAR pada hari ini: `users.nik`, `users.nomor_hp`, dan `users.alamat`
 * lahir bersama penyalinan identitas dari akun Helpdesk, dan `GET /auth/me`
 * sudah mengirimkannya dalam keadaan terdekripsi.
 *
 * Akibat dari catatan yang usang itu bukan sekadar komentar yang keliru:
 * halaman profil menggambar tiga tanda hubung dan MENJELASKANNYA dengan
 * kalimat "belum tersedia karena tidak disimpan sistem" -- menyalahkan sistem
 * atas data yang sebenarnya sudah ada.
 */
describe('samarkanNik', () => {
  /**
   * PENYAMARAN, bukan pemotongan. Empat digit pertama & empat terakhir cukup
   * bagi pemiliknya untuk mengenali nomornya sendiri, sementara dua belas
   * digit di tengah -- yang memuat tanggal lahir dan nomor urut -- tidak ikut
   * terbaca orang yang kebetulan melihat layarnya.
   *
   * DUA IMPLEMENTASI, DISENGAJA (keputusan pengguna 1 Oktober 2026). Jalur
   * pengaduan menyamarkan di BACKEND (`apps/api` common/identitas/nik.ts)
   * karena NIK di sana milik orang lain; jalur ini menyamarkan di TAMPILAN
   * karena NIK-nya milik pemilik sesi itu sendiri. Keduanya harus menghasilkan
   * bentuk yang SAMA -- kalau salah satunya diubah, ubah pasangannya.
   */
  it('menyisakan empat digit awal dan empat digit akhir', () => {
    expect(samarkanNik('3520041502050002')).toBe('3520 04•• •••• 0002');
  });

  it('bentuk yang bukan 16 digit dikembalikan tersamar seluruhnya', () => {
    expect(samarkanNik('12345')).toBe('•••••');
    expect(samarkanNik('35200415020500021234')).toBe('•'.repeat(20));
  });

  it('kosong tetap null, bukan deretan titik', () => {
    expect(samarkanNik(null)).toBeNull();
    expect(samarkanNik('')).toBeNull();
    expect(samarkanNik(undefined)).toBeNull();
  });
});

describe('adaptMe — identitas dari akun Helpdesk', () => {
  const me = (over = {}) => ({
    id: 1,
    nama: 'Siti Aminah',
    email: 'siti@example.go.id',
    roles: ['responden'],
    actingRole: 'responden',
    isActive: true,
    createdAt: '2026-07-04T04:51:33.647Z',
    lastLoginAt: null,
    respondentProfile: null,
    nik: '3520041502050002',
    nomorHp: '+62895396662038',
    alamat: 'Dusun Timang Desa Waduk',
    ...over,
  });

  it('memetakan nomor HP & alamat apa adanya', () => {
    const hasil = adaptMe(me());

    expect(hasil.phone).toBe('+62895396662038');
    expect(hasil.address).toBe('Dusun Timang Desa Waduk');
  });

  it('NIK disamarkan, dan nilai penuhnya tetap tersedia', () => {
    const hasil = adaptMe(me());

    expect(hasil.nikMasked).toBe('3520 04•• •••• 0002');
    expect(hasil.nik).toBe('3520041502050002');
  });

  /**
   * `/auth/me` TIDAK menjamin ketiganya ada: SSO melayani ASN maupun warga
   * umum, dan akun yang belum login ulang sejak kolomnya dibuat tak punya
   * satu pun. Null yang tersurat membuat kartunya menyembunyikan barisnya
   * dengan sengaja, bukan menggambar tanda hubung.
   */
  it('medan yang tak dikirim backend menjadi null, bukan undefined', () => {
    const hasil = adaptMe(me({ nik: null, nomorHp: null, alamat: null }));

    expect(hasil.nik).toBeNull();
    expect(hasil.nikMasked).toBeNull();
    expect(hasil.phone).toBeNull();
    expect(hasil.address).toBeNull();
  });

  it('respons lama tanpa ketiga kunci itu sama sekali tidak meledak', () => {
    // Kuncinya DIHAPUS, bukan diisi null: respons lama memang tak memuatnya
    // sama sekali, dan `undefined` berperilaku berbeda dari `null` pada
    // `??`. Ditulis begini, bukan dengan destrukturisasi sisa, supaya tak
    // meninggalkan tiga variabel tak terpakai yang diperingatkan ESLint.
    const tanpaIdentitas = { ...me() };
    delete tanpaIdentitas.nik;
    delete tanpaIdentitas.nomorHp;
    delete tanpaIdentitas.alamat;

    const hasil = adaptMe(tanpaIdentitas);

    expect(hasil.nik).toBeNull();
    expect(hasil.nikMasked).toBeNull();
    expect(hasil.phone).toBeNull();
    expect(hasil.address).toBeNull();
  });
});
