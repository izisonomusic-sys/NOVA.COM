import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

const bootLogger = new Logger('Bootstrap');

function checkRequiredEnv() {
  const required = [
    'DATABASE_URL',
    'DIRECT_URL',
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
  ];

  const missing = required.filter(
    (key) =>
      !process.env[key] ||
      process.env[key]!.includes('YOUR_') ||
      process.env[key]!.includes('TON-PROJET') ||
      process.env[key]!.includes('COLLE_ICI'),
  );

  if (missing.length) {
    bootLogger.error(
      `Démarrage annulé : variables manquantes ou non renseignées dans apps/api/.env -> ${missing.join(', ')}`,
    );
    process.exit(1);
  }
}

async function main() {
  checkRequiredEnv();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://nova-com-web.vercel.app',
    ...(process.env.FRONTEND_URL || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked origin: ${origin}`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT || 4000);

  await app.listen(port, '0.0.0.0');

  bootLogger.log(`API démarrée sur http://localhost:${port}`);
}

main().catch((err) => {
  bootLogger.error(
    `L'API n'a pas pu démarrer : ${err?.message || err}`,
    err?.stack,
  );
  process.exit(1);
});
