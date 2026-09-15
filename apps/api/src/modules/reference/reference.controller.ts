import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComplaintCategoryEntity } from './entities/complaint-category.entity';
import { UnsurEntity } from './entities/unsur.entity';
import { ReferenceService } from './reference.service';

@ApiTags('reference')
@ApiBearerAuth()
@Controller('ref')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  /** Daftar 9 unsur baku SKM (template PermenPANRB 14/2017). */
  @Get('unsur')
  @Roles(Role.kabupaten, Role.opd)
  @ApiOkResponse({ type: UnsurEntity, isArray: true })
  getUnsur(): UnsurEntity[] {
    return this.referenceService.getUnsur();
  }

  /**
   * Daftar kategori baku pengaduan (semua peran terautentikasi).
   *
   * Endpoint `GET /ref/complaint-sub-categories` DIHAPUS 4 September 2026
   * bersama taksonomi sub-kategori (D12/INT-42) -- lihat reference.constants.ts.
   */
  @Get('complaint-categories')
  @ApiOkResponse({ type: ComplaintCategoryEntity, isArray: true })
  getComplaintCategories(): ComplaintCategoryEntity[] {
    return this.referenceService.getComplaintCategories();
  }
}
