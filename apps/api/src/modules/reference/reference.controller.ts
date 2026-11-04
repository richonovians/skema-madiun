import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListComplaintCategoryQueryDto } from './dto/list-complaint-category-query.dto';
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
  @ApiOperation({
    summary: 'Daftar kategori baku pengaduan.',
    description:
      'Sejak 4 November 2026 setiap kategori membawa `tingkat` (kabupaten/kecamatan). ' +
      'Tanpa kueri `tingkat`, seluruh kategori kedua tingkat dikembalikan.',
  })
  @ApiOkResponse({ type: ComplaintCategoryEntity, isArray: true })
  getComplaintCategories(@Query() query: ListComplaintCategoryQueryDto): ComplaintCategoryEntity[] {
    return this.referenceService.getComplaintCategories(query.tingkat);
  }
}
