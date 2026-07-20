import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('responses')
@Controller('responses')
export class ResponsesController {}
