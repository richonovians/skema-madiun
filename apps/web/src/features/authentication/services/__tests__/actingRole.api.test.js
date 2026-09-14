import { setActingRole } from '../actingRole.api';
import { saveSession } from '../authStorage';
import api from '@/services/api';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

/**
 * Laporan pengguna 14 September 2026: akun warga ber-peran banyak yang belum
 * menyetujui PDP tetap dipantulkan dari /persetujuan.
 *
 * Rantainya: saat login, akun ber-peran banyak belum punya `actingRole`,
 * sehingga backend melaporkan `consentRequired: false` -- yang berarti "belum
 * dapat ditentukan", BUKAN "sudah menyetujui". `saveSession` menulis cookie
 * `consent=1` dari nilai itu. Lalu perannya dipilih, dan SEBELUM perbaikan ini
 * `setActingRole` hanya memperbarui cookie `role` sambil membiarkan `consent=1`
 * yang keliru itu -- sehingga proxy menganggapnya sudah menyetujui dan
 * memantulkannya dari satu-satunya halaman yang dapat memperbaiki keadaannya.
 *
 * Yang diperiksa di sini penanda SUNGGUHAN di peramban (localStorage & cookie),
 * bukan bahwa suatu fungsi terpanggil: yang dibaca proxy memang penanda itu.
 */
const b64url = (o) =>
  Buffer.from(JSON.stringify(o))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const tokenPalsu = () =>
  `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub: '21',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.uji`;

const jawaban = (consentRequired) => ({
  data: { role: 'responden', expiresAt: Math.floor(Date.now() / 1000) + 3600, consentRequired, token: tokenPalsu() },
});

beforeEach(() => {
  localStorage.clear();
  document.cookie.split(';').forEach((c) => {
    const nama = c.split('=')[0].trim();
    if (nama) document.cookie = `${nama}=; path=/; max-age=0`;
  });
  api.post.mockReset();

  // Titik berangkatnya: akun ber-peran banyak masuk sebagai ADMIN. Admin tak
  // pernah dimintai persetujuan, jadi penandanya sah bernilai '1'.
  //
  // Skenario ini tetap hidup meski `saveSession` sudah tak lagi mengaku sudah
  // menyetujui saat peran belum dipilih: berpindah ke peran warga di TENGAH
  // SESI lewat menu akun melewati login sepenuhnya, dan tanpa koreksi di sini
  // penanda admin tadi ikut terbawa ke peran warga.
  saveSession(tokenPalsu(), 'kabupaten', false);
});

describe('setActingRole menyelaraskan penanda persetujuan', () => {
  it('masuk sebagai admin memang menandai beres -- itu titik berangkatnya', () => {
    expect(localStorage.getItem('consent')).toBe('1');
  });

  it('berpindah ke peran yang MASIH butuh persetujuan mencabut penanda itu', async () => {
    api.post.mockResolvedValue(jawaban(true));

    await setActingRole('responden');

    expect(localStorage.getItem('consent')).toBe('0');
    expect(document.cookie).not.toMatch(/consent=1/);
  });

  it('berpindah ke peran yang tak butuh persetujuan menandainya sudah beres', async () => {
    // Dimulai dari '0' dengan sengaja: kalau prasyaratnya dibiarkan '1' seperti
    // hasil login, uji ini hijau bahkan ketika fungsinya tak menulis apa pun.
    localStorage.setItem('consent', '0');
    api.post.mockResolvedValue(jawaban(false));

    await setActingRole('kabupaten');

    expect(localStorage.getItem('consent')).toBe('1');
  });

  /**
   * Respons lama (sebelum backend mengirim `consentRequired`) tak boleh
   * mencabut penanda milik warga yang sudah menyetujui. `undefined` berarti
   * "tak ada kabar", dan tak ada kabar bukan alasan mengubah keadaan.
   */
  it('respons tanpa kabar persetujuan tidak mengubah penanda yang ada', async () => {
    // Berangkat dari '0' -- warga yang BELUM menyetujui. Ini yang membuat uji
    // ini berarti: bila `undefined` diperlakukan sebagai "tidak butuh
    // persetujuan", penandanya berbalik jadi '1' dan gerbangnya hilang justru
    // bagi orang yang harus melewatinya. Prasyarat '1' membuat uji ini hampa --
    // mutasinya sempat lolos hijau karena itu.
    localStorage.setItem('consent', '0');
    api.post.mockResolvedValue({ data: { role: 'responden', token: tokenPalsu() } });

    await setActingRole('responden');

    expect(localStorage.getItem('consent')).toBe('0');
  });

  it('cookie peran tetap diperbarui seperti sebelumnya', async () => {
    api.post.mockResolvedValue(jawaban(true));

    await setActingRole('responden');

    expect(document.cookie).toMatch(/role=responden/);
  });
});
