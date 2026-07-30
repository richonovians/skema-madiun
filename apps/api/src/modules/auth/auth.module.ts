import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER } from './auth.constants';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthProvider } from './providers/session-auth.provider';
import { StubAuthProvider } from './providers/stub-auth.provider';
import { SessionModule } from './session/session.module';

/**
 * Modul fondasi autentikasi (global). Mendaftarkan RolesGuard sebagai guard global.
 *
 * Token AUTH_PROVIDER MASIH terikat ke StubAuthProvider (header dev) — BELUM ke
 * SessionAuthProvider, meski keduanya sudah terdaftar di seam ini (INT-1). Alasannya:
 * belum ada endpoint yang menerbitkan token sesi (dev-login, INT-2), jadi mengalihkan
 * binding sekarang akan membuat SELURUH request kehilangan cara login sampai INT-2
 * selesai. Begitu dev-login ada, ganti baris `useExisting` di bawah ke SessionAuthProvider
 * — satu baris, tanpa menyentuh modul bisnis mana pun (itulah gunanya seam ini).
 */
@Global()
@Module({
  imports: [SessionModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    StubAuthProvider,
    SessionAuthProvider,
    { provide: AUTH_PROVIDER, useExisting: StubAuthProvider },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, AUTH_PROVIDER, SessionModule],
})
export class AuthModule {}
