import { JwtService } from '@nestjs/jwt';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const buildService = (secret = 'test-secret', expiresInMs = 3_600_000) =>
    new SessionService(new JwtService({ secret, signOptions: { expiresIn: expiresInMs / 1000 } }));

  it('issue menghasilkan token JWT (3 segmen dipisah titik)', () => {
    const service = buildService();
    const token = service.issue(42);
    expect(token.split('.')).toHaveLength(3);
  });

  it('verify token hasil issue sendiri → mengembalikan payload sub=userId', () => {
    const service = buildService();
    const token = service.issue(42);
    expect(service.verify(token)).toEqual(expect.objectContaining({ sub: 42 }));
  });

  it('verify string acak (bukan JWT) → null', () => {
    const service = buildService();
    expect(service.verify('bukan-jwt-sama-sekali')).toBeNull();
  });

  it('verify token dengan secret berbeda (ditandatangani pihak lain) → null', () => {
    const issuer = buildService('secret-lain');
    const verifier = buildService();
    const token = issuer.issue(42);
    expect(verifier.verify(token)).toBeNull();
  });

  it('verify token kedaluwarsa → null', () => {
    // expiresIn negatif → exp sudah di masa lalu saat token diterbitkan, tanpa perlu delay nyata.
    const service = buildService('test-secret', -1000);
    const token = service.issue(42);
    expect(service.verify(token)).toBeNull();
  });
});
