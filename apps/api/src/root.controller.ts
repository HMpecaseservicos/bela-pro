import { Controller, Get } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  getRoot() {
    return {
      service: 'bela-pro-api',
      status: 'ok',
      health: '/api/v1/health',
      timestamp: new Date().toISOString(),
    };
  }
}
