import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SessionService } from './session.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('session.jwtSecret'),
        // expiresIn dalam detik (number) — hindari template literal string yang tak
        // cocok dengan tipe StringValue milik @nestjs/jwt.
        signOptions: { expiresIn: (config.get<number>('session.ttlHours') ?? 24) * 3600 },
      }),
    }),
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
