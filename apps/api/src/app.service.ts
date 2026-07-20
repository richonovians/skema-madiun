import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'skm-api',
      timestamp: new Date().toISOString(),
    };
  }
}
