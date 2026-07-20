import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Modul infrastruktur (global) yang menyediakan PrismaService ke seluruh aplikasi
 * tanpa perlu di-import berulang. Ini BUKAN modul bisnis.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
