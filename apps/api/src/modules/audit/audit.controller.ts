import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { AuditService } from './audit.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Log aktivitas admin (siapa mengubah apa, kapan) — Admin Kabupaten. */
  @Get()
  @Roles(Role.kabupaten)
  @ApiOkResponse({ type: AuditLogEntity, isArray: true })
  findAll(@Query() query: ListAuditLogQueryDto): Promise<PaginatedResult<AuditLogEntity>> {
    return this.auditService.findAll(query);
  }
}
