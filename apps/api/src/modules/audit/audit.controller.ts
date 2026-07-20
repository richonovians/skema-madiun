import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {}
