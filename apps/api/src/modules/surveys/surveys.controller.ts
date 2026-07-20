import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('surveys')
@Controller('surveys')
export class SurveysController {}
