import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { lastValueFrom, of } from 'rxjs';
import { SESSION_COOKIE, SessionCookieService } from './session-cookie.service';
import { HEADER_SESI_BERAKHIR, SessionRefreshInterceptor } from './session-refresh.interceptor';
import { SessionService } from './session.service';

/**
 * PERPANJANGAN SESI SELAMA DIPAKAI (17 September 2026, laporan pengguna: sesi
 * kemarin masih hidup hari ini).
 *
 * Jendela menganggur yang pendek saja tidak cukup: tanpa perpanjangan, orang
 * yang sedang bekerja akan terlempar keluar tepat di tengah mengisi formulir.
 * Interceptor inilah yang memperbaruinya, dan justru karena ia menulis cookie
 * pada respons mana pun, batas-batasnya yang perlu dijaga ketat.
 */
const RAHASIA = 'rahasia-uji-yang-cukup-panjang-untuk-hmac';

const buatKonfig = (jendelaMenit: number, paguJam = 12) =>
  ({
    get: (kunci: string) => {
      if (kunci === 'session.idleMinutes') return jendelaMenit;
      if (kunci === 'session.ttlHours') return paguJam;
      return undefined;
    },
  }) as unknown as ConfigService;

const buat = (jendelaMenit: number, paguJam = 12) => {
  const jwt = new JwtService({ secret: RAHASIA });
  const config = buatKonfig(jendelaMenit, paguJam);
  const sessionService = new SessionService(jwt, config);
  const cookieService = new SessionCookieService(jwt, config);
  return {
    sessionService,
    interceptor: new SessionRefreshInterceptor(sessionService, cookieService),
  };
};

interface ResponsPalsu {
  headers: Record<string, unknown>;
  setHeader: (nama: string, nilai: unknown) => void;
  getHeader: (nama: string) => unknown;
}

const responsPalsu = (): ResponsPalsu => {
  const headers: Record<string, unknown> = {};
  return {
    headers,
    setHeader: (nama, nilai) => {
      headers[nama.toLowerCase()] = nilai;
    },
    getHeader: (nama) => headers[nama.toLowerCase()],
  };
};

const konteks = (req: Record<string, unknown>, res: ResponsPalsu): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  }) as unknown as ExecutionContext;

const handler: CallHandler = { handle: () => of({ ok: true }) } as unknown as CallHandler;

const jalankan = async (
  interceptor: SessionRefreshInterceptor,
  req: Record<string, unknown>,
): Promise<ResponsPalsu> => {
  const res = responsPalsu();
  await lastValueFrom(interceptor.intercept(konteks(req, res), handler));
  return res;
};

const dariCookie = (token: string) => ({ headers: { cookie: `${SESSION_COOKIE}=${token}` } });

describe('SessionRefreshInterceptor', () => {
  it('memperbarui cookie ketika jendela menganggur tinggal separuh', async () => {
    // Token berjendela 10 menit dinilai oleh layanan berjendela 60 menit.
    const { sessionService: penerbit } = buat(10);
    const { interceptor } = buat(60);
    const token = penerbit.issue(42);

    const res = await jalankan(interceptor, dariCookie(token));

    expect(String(res.getHeader('Set-Cookie'))).toContain(`${SESSION_COOKIE}=`);
    expect(Number(res.getHeader(HEADER_SESI_BERAKHIR))).toBeGreaterThan(Date.now() / 1000);
  });

  it('tidak menyentuh apa pun selama sesinya masih segar', async () => {
    const { sessionService, interceptor } = buat(60);

    const res = await jalankan(interceptor, dariCookie(sessionService.issue(42)));

    expect(res.getHeader('Set-Cookie')).toBeUndefined();
    expect(res.getHeader(HEADER_SESI_BERAKHIR)).toBeUndefined();
  });

  /**
   * PENJAGA TERPENTING. `POST /auth/logout` menyetel cookie kosong untuk
   * mengakhiri sesi; interceptor yang menimpanya sesudah itu akan menerbitkan
   * kembali sesi yang baru saja dimatikan, dan logout berhenti bekerja tanpa
   * satu pun galat yang terlihat.
   */
  it('tidak menimpa cookie sesi yang sudah ditulis handler, mis. logout', async () => {
    const { sessionService: penerbit } = buat(10);
    const { interceptor, sessionService } = buat(60);
    void sessionService;
    const res = responsPalsu();
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0`);

    await lastValueFrom(
      interceptor.intercept(konteks(dariCookie(penerbit.issue(42)), res), handler),
    );

    expect(String(res.getHeader('Set-Cookie'))).toContain(`${SESSION_COOKIE}=;`);
    expect(res.getHeader(HEADER_SESI_BERAKHIR)).toBeUndefined();
  });

  /**
   * Jalur dev-login memegang tokennya sendiri di localStorage, bukan cookie.
   * Menulis cookie sesi untuknya akan membuat dua sumber kebenaran yang bisa
   * berbeda isi.
   */
  it('mengabaikan permintaan tanpa cookie sesi (jalur Bearer)', async () => {
    const { sessionService: penerbit } = buat(10);
    const { interceptor } = buat(60);

    const res = await jalankan(interceptor, {
      headers: { authorization: `Bearer ${penerbit.issue(42)}` },
    });

    expect(res.getHeader('Set-Cookie')).toBeUndefined();
  });

  it('tidak memperpanjang melewati pagu mutlak', async () => {
    const { sessionService: penerbit } = buat(10, 10 / 60); // pagu 10 menit
    const { interceptor } = buat(60);
    const token = penerbit.issue(42);

    const res = await jalankan(interceptor, dariCookie(token));

    const berakhir = Number(res.getHeader(HEADER_SESI_BERAKHIR));
    expect(berakhir).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 10 * 60 + 2);
  });

  it('token lama tanpa pagu dibiarkan habis sendiri', async () => {
    const jwt = new JwtService({ secret: RAHASIA });
    const { interceptor } = buat(60);
    // Bentuk token sebelum 17 September 2026: tanpa klaim `abs`.
    const lawas = jwt.sign({ sub: 42 }, { expiresIn: 300 });

    const res = await jalankan(interceptor, dariCookie(lawas));

    expect(res.getHeader('Set-Cookie')).toBeUndefined();
  });
});
