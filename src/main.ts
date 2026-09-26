import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

/** Configuración compartida por el servidor real y los tests e2e. */
export function configureApp(app: NestExpressApplication): void {
  // Detrás de nginx: la IP real del cliente (para el rate limit) viene en X-Forwarded-For.
  app.set('trust proxy', 1);
  app.use(helmet());
  // Los lotes de sincronización pueden pesar más que el límite por defecto (100 KB).
  app.useBodyParser('json', { limit: '5mb' });

  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  // Sin cookies: la sesión viaja en Authorization, así que no hace falta `credentials`.
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Food Rutine API')
    .setDescription(
      'Backend de la app de meal prep: login con Google, sincronización entre dispositivos ' +
        'y avisos push programados. Errores: `{ statusCode, message, error, timestamp, path }`.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .addTag('auth', 'Login con Google, renovación y cierre de sesión')
    .addTag('users', 'Perfil del usuario')
    .addTag('sync', 'Sincronización de datos entre dispositivos')
    .addTag('push', 'Suscripciones Web Push')
    .addTag('reminders', 'Avisos programados')
    .addTag('health', 'Estado del servicio')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(
    `API en http://localhost:${port} · docs en /docs`,
  );
}

// Solo al ejecutar este archivo (no al importarlo desde los tests).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await bootstrap();
}
