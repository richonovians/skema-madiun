import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER } from './auth.constants';
import { NonProductionGuard } from './guards/non-production.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthProvider } from './interfaces/auth-provider.interface';
import { SessionAuthProvider } from './providers/session-auth.provider';
import { StubAuthProvider } from './providers/stub-auth.provider';
import { SessionModule } from './session/session.module';

/**
 * Modul fondasi autentikasi (global). Mendaftarkan RolesGuard sebagai guard global.
 *
 * Token AUTH_PROVIDER terikat KONDISIONAL berdasarkan NODE_ENV (INT-2):
 * - `test` → StubAuthProvider, agar seluruh e2e (memakai header x-dev-*) TETAP jalan
 *   tanpa satu pun berkas test disentuh.
 * - selainnya (development/production) → SessionAuthProvider, jalur sungguhan yang
 *   dipakai frontend via dev-login (dev/staging) atau nanti callback SSO (production).
 * Satu titik keputusan di factory ini — modul bisnis tak pernah tahu/peduli mana yang
 * aktif (itulah gunanya seam AuthProvider).
 */
@Global()
@Module({
  imports: [SessionModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    StubAuthProvider,
    SessionAuthProvider,
    NonProductionGuard,
    {
      provide: AUTH_PROVIDER,
      inject: [ConfigService, StubAuthProvider, SessionAuthProvider],
      useFactory: (
        config: ConfigService,
        stub: StubAuthProvider,
        session: SessionAuthProvider,
      ): AuthProvider => (config.get<string>('app.nodeEnv') === 'test' ? stub : session),
    },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, AUTH_PROVIDER, SessionModule],
})
export class AuthModule {}
