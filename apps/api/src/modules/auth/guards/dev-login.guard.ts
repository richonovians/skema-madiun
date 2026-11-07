import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Membuka `POST /auth/dev-login` hanya bila saklar `DEV_LOGIN_ENABLED`
 * dinyalakan tersurat (7 November 2026). Alasannya di `devLogin` pada
 * `config/configuration.ts`.
 *
 * Dipasang BERSAMA `NonProductionGuard`, bukan menggantikannya. Konfigurasi
 * sudah mematikan saklar ini di produksi, jadi penjagaannya berlapis dua dan
 * masing-masing cukup sendirian.
 *
 * 404, bukan 403, dengan alasan yang sama dengan `NonProductionGuard`:
 * keberadaan rute ini tak boleh terbaca dari luar.
 */
@Injectable()
export class DevLoginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(): boolean {
    if (this.configService.get<boolean>('devLogin.enabled') !== true) {
      throw new NotFoundException();
    }
    return true;
  }
}
