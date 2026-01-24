import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'bela-pro-api',
      version: '1.0.3-chatbot', // versão para verificar deploy
      timestamp: new Date().toISOString(),
    };
  }
}
