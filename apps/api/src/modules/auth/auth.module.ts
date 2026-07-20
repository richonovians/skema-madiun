import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER } from './auth.constants';
import { RolesGuard } from './guards/roles.guard';
import { StubAuthProvider } from './providers/stub-auth.provider';

/**
 * Modul fondasi autentikasi (global). Mengikat token AUTH_PROVIDER ke StubAuthProvider
 * (dev) dan mendaftarkan RolesGuard sebagai guard global. BUKAN autentikasi nyata —
 * tidak ada JWT/OIDC/Helpdesk. Untuk mengaktifkan SSO nanti: ganti StubAuthProvider.
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    StubAuthProvider,
    { provide: AUTH_PROVIDER, useExisting: StubAuthProvider },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, AUTH_PROVIDER],
})
export class AuthModule {}
