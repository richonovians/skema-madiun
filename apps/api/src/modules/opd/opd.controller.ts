import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('opd')
@Controller('opd')
export class OpdController {}
