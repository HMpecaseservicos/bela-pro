import { Module } from '@nestjs/common';
import { ChatbotTestController } from './chatbot-test.controller';

@Module({
  controllers: [ChatbotTestController],
})
export class ChatbotTestModule {}
