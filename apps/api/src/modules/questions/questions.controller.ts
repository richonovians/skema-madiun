import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionEntity } from './entities/question.entity';
import { QuestionsService } from './questions.service';

@ApiTags('questions')
@ApiBearerAuth()
@Roles(Role.opd) // superuser lolos via bypass RolesGuard
@Controller()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /** Daftar pertanyaan survei. */
  @Get('surveys/:surveyId/questions')
  @ApiOkResponse({ type: QuestionEntity, isArray: true })
  findAll(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<QuestionEntity[]> {
    return this.questionsService.findAllForSurvey(surveyId, user);
  }

  /** Tambah pertanyaan (baku/kustom). */
  @Post('surveys/:surveyId/questions')
  @Audit('question')
  @ApiOkResponse({ type: QuestionEntity })
  create(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<QuestionEntity> {
    return this.questionsService.create(surveyId, dto, user);
  }

  /** Terapkan template 9 unsur SKM. */
  @Post('surveys/:surveyId/questions/template')
  @Audit('question', 'apply_template')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: QuestionEntity, isArray: true })
  applyTemplate(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<QuestionEntity[]> {
    return this.questionsService.applyTemplate(surveyId, user);
  }

  /** Ubah urutan pertanyaan. */
  @Patch('surveys/:surveyId/questions/reorder')
  @Audit('question', 'reorder')
  @ApiOkResponse({ type: QuestionEntity, isArray: true })
  reorder(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: ReorderQuestionsDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<QuestionEntity[]> {
    return this.questionsService.reorder(surveyId, dto, user);
  }

  /** Ubah pertanyaan. */
  @Patch('questions/:id')
  @Audit('question')
  @ApiOkResponse({ type: QuestionEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<QuestionEntity> {
    return this.questionsService.update(id, dto, user);
  }

  /** Hapus pertanyaan. */
  @Delete('questions/:id')
  @Audit('question')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUser): Promise<void> {
    return this.questionsService.remove(id, user);
  }
}
