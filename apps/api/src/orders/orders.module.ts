// LOJA UNIFICADA: Módulo de Pedidos (Orders)
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [PrismaModule, forwardRef(() => FinancialModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
