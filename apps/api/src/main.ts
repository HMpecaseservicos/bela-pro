import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOriginsRaw = process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN;
  const allowedOrigins = (corsOriginsRaw ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0) {
        const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
        const isRailway = origin.endsWith('.railway.app');
        return callback(null, isLocal || isRailway);
      }

      return callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  });

  const portRaw = process.env.PORT ?? process.env.API_PORT ?? '3000';
  const port = Number(portRaw);
  await app.listen(Number.isFinite(port) ? port : 3000);
}
bootstrap();
