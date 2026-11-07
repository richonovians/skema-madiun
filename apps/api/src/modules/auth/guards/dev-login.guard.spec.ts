import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DevLoginGuard } from './dev-login.guard';

const buat = (enabled: boolean | undefined) =>
  new DevLoginGuard({ get: jest.fn().mockReturnValue(enabled) } as unknown as ConfigService);

describe('DevLoginGuard', () => {
  it('saklar mati -> 404, bukan 403', () => {
    expect(() => buat(false).canActivate()).toThrow(NotFoundException);
  });

  it('konfigurasi tak menyebutnya sama sekali -> 404 (gagal tertutup)', () => {
    expect(() => buat(undefined).canActivate()).toThrow(NotFoundException);
  });

  it('saklar hidup -> diizinkan', () => {
    expect(buat(true).canActivate()).toBe(true);
  });
});
