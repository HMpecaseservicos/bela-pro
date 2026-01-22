import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilita CORS para permitir requisições do frontend
  app.enableCors({
    origin: true, // Permite qualquer origem em produção (Railway, Vercel, etc.)
    credentials: true,
  });
  
  app.setGlobalPrefix('api/v1');

  // Railway usa PORT, local usa API_PORT
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API rodando na porta ${port}`);
}

void bootstrap();
