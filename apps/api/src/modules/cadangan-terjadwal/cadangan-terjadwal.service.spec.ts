import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { PrismaService } from '../../prisma/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { CadanganTerjadwalService } from './cadangan-terjadwal.service';

/**
 * CADANGAN HARIAN TERJADWAL (BUG-073, 12 November 2026).
 *
 * PRD meminta "backup database terjadwal harian"; sebelum ini yang ada hanya
 * perintah tangan `pnpm cadangan`. Keputusan pengguna: penjadwal DI DALAM
 * aplikasi, dengan preseden `AuditRetensiService` -- penggelaran dikerjakan tim
 * lain, dan cron yang menuntut mereka memasangnya besar kemungkinannya tak
 * pernah dipasang.
 *
 * Yang dijaga berkas ini:
 * 1. MENYALA HANYA DENGAN `BACKUP_DIR`. Di produksi, ketiadaannya dicatat
 *    sebagai galat setiap boot -- tidak menolak menyala (keputusan pengguna).
 * 2. JAM WIB, bukan jam server. Server produksi bisa berjalan dalam UTC, dan
 *    02.00 UTC adalah 09.00 WIB: jam kerja.
 * 3. SATU CADANGAN walau API berjalan di beberapa instance (kunci advisory).
 * 4. RETENSI HANYA SESUDAH BERHASIL. Rentetan kegagalan tak boleh ikut
 *    memusnahkan cadangan lama yang masih baik.
 * 5. GAGAL MENGABARI ADMIN KABUPATEN, dan tak pernah menjatuhkan API.
 */
type Nilai = { dir?: string | null; jam?: number; hari?: number; produksi?: boolean };

function buat(nilai: Nilai = {}, dapatKunci = true) {
  const tx = { $queryRaw: jest.fn().mockResolvedValue([{ dapat: dapatKunci }]) };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  } as unknown as PrismaService;
  const config = {
    get: jest.fn((kunci: string) => {
      if (kunci === 'backup.dir') return nilai.dir ?? null;
      if (kunci === 'backup.jam') return nilai.jam ?? 2;
      if (kunci === 'backup.retentionDays') return nilai.hari ?? 14;
      if (kunci === 'app.nodeEnv') return nilai.produksi ? 'production' : 'development';
      return undefined;
    }),
  } as unknown as ConfigService;
  const notifikasi = {
    notifyBackupFailed: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
  const service = new CadanganTerjadwalService(prisma, config, notifikasi);
  return { service, prisma, tx, notifikasi };
}

/** Folder cadangan bernama persis seperti buatan `cadangan.cjs`. */
const folderCadangan = (dir: string, stempel: string) =>
  fs.mkdirSync(path.join(dir, `skm-${stempel}`), { recursive: true });

describe('CadanganTerjadwalService', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cadangan-terjadwal-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('jedaKeJamJalan (WIB)', () => {
    it('01.00 WIB menuju 02.00 WIB = satu jam', () => {
      const { service } = buat({ jam: 2 });
      // 18.00 UTC = 01.00 WIB.
      expect(service.jedaKeJamJalan(new Date('2026-11-12T18:00:00.000Z'))).toBe(60 * 60 * 1000);
    });

    it('02.30 WIB menuju 02.00 WIB besok = 23,5 jam', () => {
      const { service } = buat({ jam: 2 });
      expect(service.jedaKeJamJalan(new Date('2026-11-12T19:30:00.000Z'))).toBe(
        23.5 * 60 * 60 * 1000,
      );
    });

    it('tepat pada jamnya menunggu sehari penuh, bukan nol', () => {
      // Nol akan menjalankannya lagi seketika sesudah giliran barusan selesai.
      const { service } = buat({ jam: 2 });
      expect(service.jedaKeJamJalan(new Date('2026-11-12T19:00:00.000Z'))).toBe(
        24 * 60 * 60 * 1000,
      );
    });
  });

  describe('saat boot', () => {
    it('tanpa BACKUP_DIR di produksi: galat tercatat, tak ada timer', () => {
      const galat = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const timer = jest.spyOn(global, 'setTimeout');
      const { service } = buat({ dir: null, produksi: true });

      service.onApplicationBootstrap();

      expect(galat).toHaveBeenCalledWith(expect.stringMatching(/BACKUP_DIR/));
      expect(timer).not.toHaveBeenCalled();
    });

    it('tanpa BACKUP_DIR di pengembangan: diam, tak ada timer', () => {
      const galat = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const timer = jest.spyOn(global, 'setTimeout');
      const { service } = buat({ dir: null });

      service.onApplicationBootstrap();

      expect(galat).not.toHaveBeenCalled();
      expect(timer).not.toHaveBeenCalled();
    });

    it('dengan BACKUP_DIR: timer dipasang, dan dilepas saat modul ditutup', () => {
      const pasang = jest.spyOn(global, 'setTimeout');
      const lepas = jest.spyOn(global, 'clearTimeout');
      const { service } = buat({ dir });

      service.onApplicationBootstrap();
      expect(pasang).toHaveBeenCalledTimes(1);

      service.onModuleDestroy();
      expect(lepas).toHaveBeenCalledTimes(1);
    });
  });

  describe('jalankan', () => {
    const sekarang = new Date('2026-11-12T19:00:00.000Z');

    it('instance yang tak mendapat kunci melewati gilirannya', async () => {
      const { service, notifikasi } = buat({ dir }, false);
      const skrip = jest.spyOn(service, 'jalankanSkrip');

      const hasil = await service.jalankan(sekarang);

      expect(hasil).toEqual({ status: 'dilewati' });
      expect(skrip).not.toHaveBeenCalled();
      expect(notifikasi.notifyBackupFailed).not.toHaveBeenCalled();
    });

    it('berhasil: tak ada notifikasi, dan cadangan yang kedaluwarsa dipangkas', async () => {
      folderCadangan(dir, '20261020-190000'); // 23 hari sebelumnya
      folderCadangan(dir, '20261110-190000'); // 2 hari sebelumnya
      const { service, notifikasi } = buat({ dir, hari: 14 });
      jest.spyOn(service, 'jalankanSkrip').mockResolvedValue({ ok: true });

      const hasil = await service.jalankan(sekarang);

      expect(hasil).toEqual({ status: 'berhasil', dipangkas: ['skm-20261020-190000'] });
      expect(fs.readdirSync(dir)).toEqual(['skm-20261110-190000']);
      expect(notifikasi.notifyBackupFailed).not.toHaveBeenCalled();
    });

    it('gagal: Admin Kabupaten dikabari, dan cadangan lama TIDAK dipangkas', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      folderCadangan(dir, '20261020-190000');
      const { service, notifikasi } = buat({ dir, hari: 14 });
      jest
        .spyOn(service, 'jalankanSkrip')
        .mockResolvedValue({ ok: false, pesan: 'GAGAL: spawn pg_dump ENOENT' });

      const hasil = await service.jalankan(sekarang);

      expect(hasil).toEqual({ status: 'gagal', pesan: 'GAGAL: spawn pg_dump ENOENT' });
      expect(notifikasi.notifyBackupFailed).toHaveBeenCalledWith(sekarang);
      expect(fs.readdirSync(dir)).toEqual(['skm-20261020-190000']);
    });

    it('galat tak terduga dari skrip diperlakukan sebagai gagal, tidak dilempar', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const { service, notifikasi } = buat({ dir });
      jest.spyOn(service, 'jalankanSkrip').mockRejectedValue(new Error('EACCES'));

      await expect(service.jalankan(sekarang)).resolves.toEqual({
        status: 'gagal',
        pesan: 'EACCES',
      });
      expect(notifikasi.notifyBackupFailed).toHaveBeenCalledWith(sekarang);
    });
  });

  describe('pangkasCadanganLama', () => {
    const sekarang = new Date('2026-11-12T19:00:00.000Z');

    it('hanya folder bernama `skm-<stempel>` yang lebih tua dari batasnya', () => {
      folderCadangan(dir, '20261020-190000'); // kedaluwarsa
      folderCadangan(dir, '20261029-190001'); // 13 hari 23:59:59 -- masih disimpan
      folderCadangan(dir, '20261111-190000'); // baru
      fs.mkdirSync(path.join(dir, 'catatan-operator'));
      fs.writeFileSync(path.join(dir, 'skm-20261001-000000'), 'berkas, bukan folder');

      const dipangkas = buat({ dir, hari: 14 }).service.pangkasCadanganLama(dir, 14, sekarang);

      expect(dipangkas).toEqual(['skm-20261020-190000']);
      expect(fs.readdirSync(dir).sort()).toEqual([
        'catatan-operator',
        'skm-20261001-000000',
        'skm-20261029-190001',
        'skm-20261111-190000',
      ]);
    });
  });
});
