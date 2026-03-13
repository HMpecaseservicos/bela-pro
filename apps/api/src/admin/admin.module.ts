import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminMessagesService } from './admin-messages.service';
import { AdminMessagesAdminController, AdminMessagesWorkspaceController } from './admin-messages.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, AdminMessagesAdminController, AdminMessagesWorkspaceController],
  providers: [AdminService, AdminMessagesService],
  exports: [AdminService, AdminMessagesService],
})
export class AdminModule {}
