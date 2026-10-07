import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PenerbitSesi } from './penerbit-sesi.service';
import { PenyimpanSesiMemori } from './penyimpan-sesi.memori';
import { SessionService } from './session.service';

/**
 * Satu pintu untuk "terbitkan token DAN daftarkan sesinya" (7 Oktober 2026).
 *
 * Ada tiga tempat yang menerbitkan sesi: dev-login, callback SSO, dan
 * pergantian peran. Membiarkan ketiganya memanggil `issue()` lalu `simpan()`
 * sendiri-sendiri berarti cepat atau lambat salah satunya lupa mendaftar, dan
 * karena pemeriksaannya GAGAL TERTUTUP akibatnya bukan sesi yang tak dapat
 * dicabut melainkan orang yang tak dapat masuk sama sekali.
 */
describe('PenerbitSesi', () => {
  const buat = () => {
    const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: 3600 } });
    const sessionService = new SessionService(jwt, {
      get: (kunci: string) => (kunci === 'session.idleMinutes' ? 60 : 12),
    } as unknown as ConfigService);
    const penyimpan = new PenyimpanSesiMemori();
    return { penerbit: new PenerbitSesi(sessionService, penyimpan), sessionService, penyimpan };
  };

  it('token yang diterbitkan langsung tercatat hidup di penyimpan', async () => {
    const { penerbit, sessionService, penyimpan } = buat();

    const token = await penerbit.terbitkan(42);

    const sid = sessionService.verify(token)?.sid as string;
    await expect(penyimpan.hidup(sid)).resolves.toBe(true);
  });

  it('mencatat pemilik dan pagu mutlaknya dari token itu sendiri', async () => {
    // Pagunya DIBACA dari token, bukan dihitung ulang. Menghitungnya dua kali
    // dari sumber yang sama membuka peluang catatan hidup lebih lama daripada
    // tokennya begitu salah satu tempat diubah dan yang lain terlupa. Alasan
    // yang sama sudah tertulis di SessionCookieService soal `Max-Age`.
    const { penerbit, sessionService, penyimpan } = buat();

    const token = await penerbit.terbitkan(42);

    const payload = sessionService.verify(token);
    const daftar = await penyimpan.daftar(42);
    expect(daftar).toHaveLength(1);
    expect(daftar[0].abs).toBe(payload?.abs);
  });

  it('menyimpan keterangan perangkat bila diberikan', async () => {
    const { penerbit, penyimpan } = buat();

    await penerbit.terbitkan(42, undefined, { ua: 'Firefox', ip: '10.0.0.9' });

    const [sesi] = await penyimpan.daftar(42);
    expect(sesi.ua).toBe('Firefox');
    expect(sesi.ip).toBe('10.0.0.9');
  });

  it('peran yang dipilih ikut terbawa ke dalam token', async () => {
    // KONTROL: pendaftaran ke penyimpan tak boleh menghilangkan klaim `act`
    // yang sudah bekerja sebelumnya.
    const { penerbit, sessionService } = buat();

    const token = await penerbit.terbitkan(42, Role.opd);

    expect(sessionService.verify(token)?.act).toBe(Role.opd);
  });

  it('dua penerbitan menghasilkan dua sesi terdaftar, bukan saling menimpa', async () => {
    const { penerbit, penyimpan } = buat();

    await penerbit.terbitkan(42);
    await penerbit.terbitkan(42);

    await expect(penyimpan.daftar(42)).resolves.toHaveLength(2);
  });
});
