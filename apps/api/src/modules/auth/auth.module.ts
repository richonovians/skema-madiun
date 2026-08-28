import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER, SSO_SOURCE } from './auth.constants';
import { ConsentService } from './consent.service';
import { NonProductionGuard } from './guards/non-production.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthProvider } from './interfaces/auth-provider.interface';
import { HelpdeskSsoClient } from './providers/helpdesk-sso.client';
import { SessionAuthProvider } from './providers/session-auth.provider';
import { StubAuthProvider } from './providers/stub-auth.provider';
import { SessionModule } from './session/session.module';
import { SsoService } from './sso.service';
import { SsoStateService } from './sso-state.service';

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
  // `AuditModule` (2026-08-27) supaya login & logout dapat dicatat ke log
  // aktivitas. Diimpor eksplisit walau AuthModule sendiri @Global(): global
  // berarti apa yang diekspor modul ini terlihat di mana-mana, BUKAN sebaliknya.
  imports: [SessionModule, AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    StubAuthProvider,
    SessionAuthProvider,
    NonProductionGuard,
    ConsentService,
    SsoService,
    SsoStateService,
    // SSO_SOURCE terikat LANGSUNG ke klien nyata, tanpa percabangan NODE_ENV
    // seperti AUTH_PROVIDER di bawah. Alasannya: ia tak pernah tersentuh sampai
    // seseorang benar-benar membuka /auth/sso/login, dan tanpa kredensial
    // terisi SsoService sudah menolak lebih dulu dengan 503 yang menyebut kunci
    // mana yang kosong. Jadi tak ada gunanya stub di lingkungan test.
    { provide: SSO_SOURCE, useClass: HelpdeskSsoClient },
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
  // `ConsentService` ikut diekspor (2026-08-27): ResponsesService &
  // ComplaintsService memakainya untuk menolak pengiriman data tanpa persetujuan
  // PDP. Karena modul ini @Global(), keduanya cukup menyuntikkannya tanpa
  // mengimpor AuthModule -- dan penegakannya jadi satu definisi, bukan dua
  // pemeriksaan serupa yang bisa diam-diam berbeda.
  exports: [AuthService, ConsentService, AUTH_PROVIDER, SessionModule],
})
export class AuthModule {}
