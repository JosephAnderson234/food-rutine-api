import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/main.js';

/**
 * E2E contra una base real: requiere `.env` con DATABASE_URL y las migraciones aplicadas
 * (`pnpm exec prisma migrate deploy`).
 */
describe('API (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde con la base conectada', () =>
    request(app.getHttpServer()).get('/health').expect(200));

  it('POST /auth/google valida el cuerpo', () =>
    request(app.getHttpServer()).post('/auth/google').send({}).expect(400));

  it('las rutas de sync exigen sesión', () =>
    request(app.getHttpServer()).get('/sync/pull').expect(401));

  it('GET /push/public-key es público', () =>
    request(app.getHttpServer()).get('/push/public-key').expect(200));
});
