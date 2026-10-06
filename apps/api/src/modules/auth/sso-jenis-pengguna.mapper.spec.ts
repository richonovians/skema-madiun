import { JenisPengguna } from '@prisma/client';
import { petakanJenisPengguna } from './sso-jenis-pengguna.mapper';

/**
 * Pemeta `identity.user_type` Helpdesk ke enum `JenisPengguna`.
 *
 * MENGAPA DIUJI SEKERAS INI untuk dua nilai saja: keluarannya menjadi
 * SATU-SATUNYA ukuran gerbang "boleh dijadikan Admin OPD" di produksi. Satu
 * nilai yang diterka salah di sini berarti seseorang memperoleh -- atau
 * kehilangan -- hak mengelola sebuah instansi.
 */
describe('petakanJenisPengguna', () => {
  it('memetakan `asn` ke JenisPengguna.asn', () => {
    expect(petakanJenisPengguna('asn')).toBe(JenisPengguna.asn);
  });

  it('memetakan `masyarakat` ke JenisPengguna.masyarakat', () => {
    expect(petakanJenisPengguna('masyarakat')).toBe(JenisPengguna.masyarakat);
  });

  it('memaafkan beda kapital dan spasi di tepi', () => {
    // Pengkodean Helpdesk TERUKUR tidak seragam antar endpoint untuk medan
    // lain (`jenis_kelamin`: "Laki-laki" vs "L"), jadi menuntut huruf kecil
    // persis berarti gerbangnya gagal karena hal yang bukan urusannya.
    expect(petakanJenisPengguna('  ASN ')).toBe(JenisPengguna.asn);
  });

  it('MENOLAK nilai di luar daftar, bukan menebak', () => {
    // `pegawai` masuk akal bagi manusia dan tetap ditolak. Menebaknya sebagai
    // ASN berarti memberi hak atas dasar kemiripan kata.
    expect(petakanJenisPengguna('pegawai')).toBeNull();
  });

  it('menolak nilai yang bukan string tanpa memaksanya', () => {
    // Tiga bentuk kekosongan yang TERUKUR hadir sekaligus pada satu payload
    // sungguhan: null, string kosong, dan medan yang tak dikirim.
    expect(petakanJenisPengguna(null)).toBeNull();
    expect(petakanJenisPengguna(undefined)).toBeNull();
    expect(petakanJenisPengguna('')).toBeNull();
    expect(petakanJenisPengguna(1)).toBeNull();
  });
});
