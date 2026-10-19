import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthEntity } from './app.health.entity';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health check publik untuk memverifikasi aplikasi berjalan: GET /api/v1/health
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Periksa aplikasi berjalan. Publik, tanpa sesi.' })
  @ApiOkResponse({ type: HealthEntity })
  getHealth(): HealthEntity {
    return new HealthEntity(this.appService.getHealth());
  }
}
