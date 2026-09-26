# Food Rutine API — Contexto del proyecto

Backend de **Food Rutine** (app de meal prep para universitarios). El frontend (repo `food-rutine`, Next.js) es **local-first**: calcula todo el plan en el navegador (IndexedDB). Este backend **no replica el planificador**: guarda y sincroniza los datos del usuario entre dispositivos y envía avisos push a la hora que el cliente indica.

## Stack

- **NestJS 12** (ESM, `"type": "module"`, imports con extensión `.js`), TypeScript estricto.
- **Prisma 7** con generador `prisma-client` (salida en `src/generated/prisma`, ignorada en git, se genera en `postinstall`) y `@prisma/adapter-pg`. La URL viene de `DATABASE_URL` (`prisma.config.ts`), no del schema.
- **PostgreSQL 17**.
- **Auth**: login con **Google** (ID token verificado con `google-auth-library`) → JWT propio (`@nestjs/jwt` + `passport-jwt`) + refresh token opaco en DB que **rota en cada uso**. Sin contraseñas.
- **Push**: `web-push` (VAPID) + despachador `@nestjs/schedule` cada 30 s.
- Validación global con `class-validator`; Swagger en `/docs`; `helmet`; `@nestjs/throttler`; `@nestjs/terminus` (`/health`).
- Tests: **Vitest** (unitarios colocados `*.spec.ts`, e2e en `test/`). Lint: **oxlint**.

## Arquitectura (hexagonal ligera, igual que UniSpace)

```
src/modules/<feature>/
  domain/                 reglas puras, sin framework (con tests)
  ports/                  interfaces de repositorios/servicios externos
  infrastructure/<tech>/  adaptadores (@Injectable) que implementan los puertos
  application/            casos de uso + DTOs
  presentation/           controllers
  <feature>.tokens.ts     Symbols de DI de los puertos
  <feature>.module.ts
```

| Módulo | Qué hace |
|---|---|
| `auth` | `POST /auth/google`, `/auth/refresh` (rota), `/auth/logout`. Throttle 5/min. |
| `user` | `GET /users/me`. |
| `sync` | `POST /sync/push`, `GET /sync/pull?since=`. Documentos por colección con versión por usuario (`User.syncSeq`). |
| `notifications` | Suscripciones Web Push y avisos programados (`PUT /reminders/:scope`), despachador. |
| `health` | `GET /health` (ping a la DB). |

Global: `src/prisma` (`@Global PrismaModule`), `src/shared/auth` (`@Auth()`, `@CurrentUser()`), `src/shared/filters` (forma de error `{ statusCode, message, error, timestamp, path }`, mapea errores de Prisma). `APP_GUARD`/`APP_FILTER` se registran en `AppModule`.

## Decisiones importantes

- **Sincronización** (`modules/sync/domain/merge.ts`): gana el cambio más reciente según el reloj del dispositivo (acotado a +5 min del servidor para relojes adelantados). **Excepción: porciones** — su estado solo avanza (`frozen/fridge → thawing → packed → eaten/discarded`); nunca se pierde el estado más avanzado.
- Los envíos se serializan por usuario bloqueando su fila (`UPDATE user ... syncSeq + 0`) dentro de la transacción.
- Versiones/cursores viajan como **string** (BigInt no es JSON).
- **Avisos**: el cliente manda la lista completa de un `scope` (p. ej. la semana) y el servidor la reemplaza de forma idempotente (`planReplacement`). Si cambia la hora, vuelve a quedar pendiente. Avisos atrasados > 30 min no se envían.
- `main.ts` exporta `configureApp(app)` para reutilizarlo en e2e; el `bootstrap()` solo corre al ejecutar el archivo.

## Despliegue

- VPS con Docker Compose (`api` + `db` + `tunnel`). Público vía **Cloudflare Tunnel** en el hostname de `cloudflared/config.yml` (solo en el servidor; no documentar el dominio real en el repo) (`cloudflared`, túnel `food-rutine-api` creado por CLI): no hay puertos abiertos en el VPS y Cloudflare termina HTTPS.
- **Docker se salta UFW**: la API publica solo en `127.0.0.1:${API_PORT}` (para depurar) y Postgres no publica puertos.
- `./cloudflared/config.yml` y `./cloudflared/credentials.json` viven solo en el servidor (gitignored).
- La imagen aplica `prisma migrate deploy` al arrancar.

## Comandos

- `pnpm start:dev` · `pnpm test` · `pnpm test:e2e` (requiere DB con migraciones) · `pnpm lint` · `pnpm typecheck` · `pnpm build`
- `pnpm db:migrate:dev` (crear migración) · `pnpm db:migrate` (aplicar)
