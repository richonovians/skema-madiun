import { Module } from '@nestjs/common';
import { DevLoginGuard } from '../guards/dev-login.guard';
import { NonProductionGuard } from '../guards/non-production.guard';
import { DevLoginController } from './dev-login.controller';

/**
 * Wadah `POST /auth/dev-login` (16 November 2026, BUG-066). Diimpor
 * `AppModule` HANYA bila `devLoginAktif(process.env)` benar; selain itu rutenya
 * tak pernah ada, sehingga tak dapat dibedakan dari rute karangan. Alasannya di
 * `DevLoginController`.
 *
 * `AuthService` tidak diimpor: `AuthModule` bersifat @Global() dan
 * mengekspornya.
 */
@Module({
  controllers: [DevLoginController],
  providers: [NonProductionGuard, DevLoginGuard],
})
export class DevLoginModule {}
