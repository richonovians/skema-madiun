import * as net from 'node:net';
import type Redis from 'ioredis';
import { BATAS_PERINTAH_MS, buatKlienRedis, tutupKlienRedis } from './klien-redis';

/**
 * Peladen yang menerima sambungan lalu tak pernah menjawab, tiruan Redis yang
 * hang (BUG-071). `docker pause` menghasilkan keadaan yang sama: sambungan tetap
 * terbuka tanpa jawaban, jadi tak ada galat yang dapat memicu jatah coba ulang.
 */
async function nyalakanPeladenBisu(): Promise<{ port: number; tutup: () => Promise<void> }> {
  const soket = new Set<net.Socket>();
  const peladen = net.createServer((s) => {
    soket.add(s);
    s.on('error', () => undefined);
  });
  await new Promise<void>((siap) => peladen.listen(0, '127.0.0.1', siap));
  return {
    port: (peladen.address() as net.AddressInfo).port,
    tutup: () =>
      new Promise((selesai) => {
        soket.forEach((s) => s.destroy());
        peladen.close(() => selesai());
      }),
  };
}

/** Porta yang baru saja dilepas: tak ada yang mendengarkan, tiruan Redis mati. */
async function ambilPortaKosong(): Promise<number> {
  const peladen = net.createServer();
  await new Promise<void>((siap) => peladen.listen(0, '127.0.0.1', siap));
  const { port } = peladen.address() as net.AddressInfo;
  await new Promise((selesai) => peladen.close(selesai));
  return port;
}

async function ukurPenolakan(klien: Redis): Promise<{ ms: number; galat: unknown }> {
  const mulai = Date.now();
  try {
    await klien.get('apa-saja');
  } catch (galat) {
    return { ms: Date.now() - mulai, galat };
  }
  return { ms: Date.now() - mulai, galat: null };
}

describe('buatKlienRedis', () => {
  let klien: Redis | undefined;

  afterEach(() => {
    klien?.disconnect();
    klien = undefined;
  });

  it('menolak perintah pada Redis yang hang, tidak menunggu tanpa batas', async () => {
    const peladen = await nyalakanPeladenBisu();
    klien = buatKlienRedis(`redis://127.0.0.1:${peladen.port}`);
    klien.on('error', () => undefined);

    const { ms, galat } = await ukurPenolakan(klien);
    await peladen.tutup();

    expect(galat).toBeInstanceOf(Error);
    expect(ms).toBeLessThan(BATAS_PERINTAH_MS + 1000);
  });

  it('menolak perintah pada Redis yang mati dalam batas yang sama', async () => {
    klien = buatKlienRedis(`redis://127.0.0.1:${await ambilPortaKosong()}`);
    klien.on('error', () => undefined);

    const { ms, galat } = await ukurPenolakan(klien);

    expect(galat).toBeInstanceOf(Error);
    expect(ms).toBeLessThan(BATAS_PERINTAH_MS + 1000);
  });
});

describe('tutupKlienRedis', () => {
  it('tak melempar dan memutus sambungan ketika QUIT tak terjawab', async () => {
    const peladen = await nyalakanPeladenBisu();
    const klien = buatKlienRedis(`redis://127.0.0.1:${peladen.port}`);
    klien.on('error', () => undefined);

    await expect(tutupKlienRedis(klien)).resolves.toBeUndefined();
    await peladen.tutup();

    expect(klien.status).toBe('end');
  });
});
