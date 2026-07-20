import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health check publik untuk memverifikasi aplikasi berjalan: GET /api/v1/health
  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
