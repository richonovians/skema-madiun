import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { DokumentasiService } from './dokumentasi.service';

/**
 * Pintu ber-peran untuk dokumen OpenAPI.
 *
 * UI Swagger (`/api/docs`) wajib MATI di produksi. Endpoint ini TIDAK mati di
 * sana: halaman Dokumentasi API Admin Kabupaten memakainya, dan katalog yang
 * terbit dari kode adalah satu-satunya katalog yang tak dapat melayang dari
 * kenyataan -- `docs/Routes-List-API-dan-Frontend.md` yang dirawat tangan sudah
 * tertinggal (masih menyebut peran `superuser` yang dilebur 15 September 2026)
 * dan membuktikan itu.
 *
 * Konsekuensinya disadari: seluruh bentuk API terpapar kepada peran
 * `kabupaten`. Itu pilihan tersurat pemilik produk, bukan efek samping.
 */
@ApiTags('dokumentasi')
@ApiBearerAuth()
@Controller('dokumentasi')
export class DokumentasiController {
  constructor(private readonly dokumentasi: DokumentasiService) {}

  /** Dokumen OpenAPI seluruh API (Kabupaten). */
  @Get('openapi')
  @Roles(Role.kabupaten)
  @ApiOperation({ summary: 'Dokumen OpenAPI seluruh API (Kabupaten).' })
  ambilOpenApi() {
    return this.dokumentasi.ambilDokumen();
  }
}
