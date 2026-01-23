import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilita CORS para permitir requisições do frontend
  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como curl, Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Lista de origens permitidas
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://agenda-bela-pro.up.railway.app',
        'https://bela-pro-api.up.railway.app',
        'https://bela-pro-production.up.railway.app',
      ];
      
      // Verifica se a origem está na lista ou é um subdomínio do Railway
      if (allowedOrigins.includes(origin) || origin.endsWith('.railway.app')) {
        return callback(null, true);
      }
      
      console.log(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  app.setGlobalPrefix('api/v1');

  // Railway usa PORT, local usa API_PORT
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API rodando na porta ${port}`);
}

void bootstrap();
