import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
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
}
