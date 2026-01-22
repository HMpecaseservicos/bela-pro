/**
 * Message Templates Module
 * 
 * Módulo isolado para gerenciamento de templates de mensagem.
 * Não depende de outros módulos de negócio.
 * 
 * @module message-templates
 */

import { Module } from '@nestjs/common';
import { MessageTemplatesController } from './message-templates.controller';
import { MessageTemplatesService } from './message-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MessageTemplatesController],
  providers: [MessageTemplatesService],
  exports: [MessageTemplatesService],
})
export class MessageTemplatesModule {}
