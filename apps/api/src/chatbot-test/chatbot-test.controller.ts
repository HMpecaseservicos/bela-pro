import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('api/v1/chatbot-test')
export class ChatbotTestController {
  @Get('health')
  health() {
    return { status: 'ok', module: 'chatbot-test', timestamp: new Date().toISOString() };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() body: any) {
    return { status: 'received' };
  }
}
