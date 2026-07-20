import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {}
