import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('chatbot-test')
export class ChatbotTestController {
  @Get('health')
  health() {
    return { status: 'ok', module: 'chatbot-test', timestamp: new Date().toISOString() };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() body: any) {
    console.log('Webhook received:', JSON.stringify(body).slice(0, 200));
    return { status: 'received' };
  }
}
