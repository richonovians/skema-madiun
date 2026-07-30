import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Menutup rute di lingkungan production — melempar 404 (BUKAN 403), agar keberadaan
 * rute dev (mis. /auth/dev-login) tidak bocor ke pengguna tak berwenang di production
 * (403 mengonfirmasi rute ada tapi ditolak; 404 tak bisa dibedakan dari rute yang
 * memang tak ada).
 */
@Injectable()
export class NonProductionGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(): boolean {
    if (this.configService.get<string>('app.nodeEnv') === 'production') {
      throw new NotFoundException();
    }
    return true;
  }
}
