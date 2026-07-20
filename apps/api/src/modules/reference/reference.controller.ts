import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('reference')
@Controller('ref')
export class ReferenceController {}
