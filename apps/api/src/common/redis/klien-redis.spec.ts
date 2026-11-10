import * as net from 'node:net';
import { Logger } from '@nestjs/common';
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

/**
 * Galat koneksi dicatat SEKALI per pemadaman (10 November 2026).
 *
 * Tanpa listener `error`, ioredis mencetak setiap kegagalan sebagai
 * "[ioredis] Unhandled error event" lengkap dengan stack trace. Saat Docker
 * menyala ulang di bawah `pnpm dev` yang sudah jalan, itu menjadi puluhan blok
 * `Command timed out` yang menenggelamkan log lain, padahal aplikasinya tetap
 * jalan. Yang dibutuhkan operator dua baris: kapan Redis putus, kapan kembali.
 */
describe('buatKlienRedis -- pencatatan putus-sambung', () => {
  let klien: Redis | undefined;
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    klien?.disconnect();
    klien = undefined;
    warn.mockRestore();
    log.mockRestore();
  });

  it('memasang listener error sendiri, jadi ioredis tak mencetak "Unhandled error event"', () => {
    klien = buatKlienRedis(`redis://127.0.0.1:1`, { lazyConnect: true });

    expect(klien.listenerCount('error')).toBeGreaterThan(0);
  });

  it('banyak galat beruntun pada Redis yang mati hanya menghasilkan satu peringatan', async () => {
    klien = buatKlienRedis(`redis://127.0.0.1:${await ambilPortaKosong()}`);

    // Beberapa percobaan sambung ulang dan beberapa perintah yang gagal.
    await Promise.allSettled([klien.get('a'), klien.get('b'), klien.get('c')]);
    await new Promise((r) => setTimeout(r, 600));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/Redis tak terjangkau/);
  });

  it('pulih lalu putus lagi: satu baris pulih, lalu satu peringatan baru', () => {
    klien = buatKlienRedis(`redis://127.0.0.1:1`, { lazyConnect: true });

    klien.emit('error', new Error('Command timed out'));
    klien.emit('error', new Error('Command timed out'));
    klien.emit('ready');
    klien.emit('error', new Error('connect ECONNREFUSED'));

    expect(warn).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toMatch(/Redis tersambung lagi/);
  });

  it('sambungan pertama yang lancar tidak dicatat sebagai "tersambung lagi"', () => {
    klien = buatKlienRedis(`redis://127.0.0.1:1`, { lazyConnect: true });

    klien.emit('ready');

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('peringatan tidak memuat URL Redis, yang dapat berisi kata sandi', () => {
    klien = buatKlienRedis(`redis://:rahasia-sekali@127.0.0.1:1`, { lazyConnect: true });

    klien.emit('error', new Error('connect ECONNREFUSED 127.0.0.1:1'));

    expect(String(warn.mock.calls[0][0])).not.toContain('rahasia-sekali');
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
