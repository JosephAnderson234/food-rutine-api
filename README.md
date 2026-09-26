# Food Rutine API

Backend de **Food Rutine**, una app de meal prep para estudiantes universitarios: horario → comidas → compras → preparación → táperes → mochila → gym.

El frontend ([food-rutine](https://github.com/JosephAnderson234/food-rutine)) es *local-first*: calcula el plan en el navegador y funciona sin internet. Esta API agrega lo que un navegador solo no puede:

- **Login con Google** y sesiones con refresh token rotativo.
- **Sincronización entre dispositivos** (celular ↔ laptop) con resolución de conflictos.
- **Avisos push programados** que llegan aunque la app esté cerrada ("Pasar taper #5 a la refri · 21:00").

## Stack

NestJS 12 (ESM) · TypeScript · Prisma 7 · PostgreSQL 17 · Web Push (VAPID) · Vitest · Docker

Arquitectura hexagonal ligera por módulo (`domain` → `ports` → `infrastructure` → `application` → `presentation`). Detalles en [`CLAUDE.md`](./CLAUDE.md).

## Endpoints

| Método | Ruta | |
|---|---|---|
| `POST` | `/auth/google` | Login con el ID token de Google |
| `POST` | `/auth/refresh` | Renueva la sesión (rota el refresh token) |
| `POST` | `/auth/logout` | Cierra la sesión del dispositivo |
| `GET` | `/users/me` | Perfil |
| `POST` | `/sync/push` | Envía cambios del dispositivo |
| `GET` | `/sync/pull?since=` | Trae cambios posteriores al cursor |
| `GET` | `/push/public-key` | Clave VAPID pública |
| `POST`/`DELETE` | `/push/subscriptions` | Registra / quita un dispositivo |
| `PUT` | `/reminders/:scope` | Reemplaza los avisos de un grupo (idempotente) |
| `GET` | `/health` | Estado del servicio y la DB |

Documentación interactiva en `/docs` (Swagger).

## Sincronización

Cada documento (porción, casilla, ajuste…) guarda la hora del cambio en el dispositivo. **Gana el cambio más reciente**, con una excepción: el estado de una porción solo avanza (`congelada → descongelando → empacada → comida`). Si en el celular marcaste "comida" y la laptop desactualizada manda "descongelando", se conserva "comida".

## Desarrollo

```bash
cp .env.example .env          # completa los valores
pnpm install                  # genera también el cliente de Prisma
pnpm db:migrate               # aplica migraciones a DATABASE_URL
pnpm start:dev                # http://localhost:3000/docs
pnpm test                     # unitarios
pnpm test:e2e                 # contra la base real
```

Claves VAPID: `pnpm exec web-push generate-vapid-keys`.

## Producción (Docker)

```bash
docker compose up -d --build
```

Se publica con **Cloudflare Tunnel** (servicio `tunnel`): sin puertos abiertos en el servidor y con HTTPS de Cloudflare. Postgres no publica puertos y la API solo escucha en `127.0.0.1`. La imagen aplica las migraciones al arrancar.

Producción: `https://api.tu-dominio.com` (docs en `/docs`).

## Licencia

MIT
