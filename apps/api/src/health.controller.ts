import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'bela-pro-api',
      version: '1.0.0-mvp', // MVP sem chatbot
      timestamp: new Date().toISOString(),
    };
  }
}
