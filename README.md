# ClipOps

Operaciones de contenido en un solo lugar: gestiona tus **clips** (videos base) y
sus **posts** (publicaciones por plataforma), con cola de publicación, captions &
hashtags y métricas.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui ·
PostgreSQL · Prisma · Docker Compose**.

---

## 🚀 Quick start (Docker Compose)

Requisitos: Docker + Docker Compose.

```bash
docker compose up --build
```

Esto levanta dos contenedores:

| Servicio | Descripción              | Puerto |
| -------- | ------------------------ | ------ |
| `app`    | Next.js 14 (producción)  | 3000   |
| `db`     | PostgreSQL 16            | 5432   |

Al arrancar, el contenedor `app` sincroniza el esquema con la base de datos
(`prisma db push`) y luego inicia Next.js. Abre **http://localhost:3000**.

> No necesitas crear un `.env` para `docker compose up`: el `docker-compose.yml`
> trae valores por defecto. Para producción/VPS, crea un `.env` (ver abajo) y
> cambia las credenciales.

Para correr en segundo plano en una VPS:

```bash
docker compose up -d --build
```

---

## 🧑‍💻 Desarrollo local (sin Docker para la app)

Útil si quieres hot-reload con `npm run dev` y solo Postgres en Docker.

```bash
# 1. Copia las variables de entorno
cp .env.example .env

# 2. Instala dependencias
npm install

# 3. Levanta solo la base de datos
docker compose up -d db

# 4. Sincroniza el esquema y genera el cliente Prisma
npm run db:push

# 5. Arranca el servidor de desarrollo
npm run dev
```

App en **http://localhost:3000**.

---

## 🔐 Variables de entorno

Todas están documentadas en [`.env.example`](.env.example):

| Variable              | Descripción                                           |
| --------------------- | ----------------------------------------------------- |
| `POSTGRES_USER`       | Usuario de PostgreSQL                                  |
| `POSTGRES_PASSWORD`   | Contraseña de PostgreSQL                               |
| `POSTGRES_DB`         | Nombre de la base de datos                             |
| `POSTGRES_PORT`       | Puerto expuesto por el contenedor `db`                |
| `DATABASE_URL`        | Cadena de conexión que usa Prisma                     |
| `APP_PORT`            | Puerto expuesto por el contenedor `app`               |
| `NODE_ENV`            | `development` / `production`                          |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app                                 |

> Dentro de Docker, la app se conecta a la base de datos por el host `db`
> (lo define `docker-compose.yml`). Para `npm run dev` en tu máquina usa
> `localhost` en `DATABASE_URL`.

---

## 🗄️ Modelo de datos

Dos entidades principales, claramente separadas (ver
[`prisma/schema.prisma`](prisma/schema.prisma)):

### `Clip` — el video base (vive en Google Drive)

`title`, `driveLink`, `status`, `type`, `duration`, `quality`, `notes`,
`tags`, `responsible`.

### `Post` — una publicación de un clip en una plataforma

`platform`, `caption`, `hashtags`, `audio`, `status`, `plannedDate`,
`publishedDate`, `url`, `responsible`, `notes`.

**Relación:** un `Clip` tiene muchos `Post` (uno por plataforma / intento).

---

## 🧭 Estructura del proyecto

```
ClipOps/
├── docker-compose.yml        # app (Next.js) + db (PostgreSQL)
├── Dockerfile                # imagen multi-stage de producción
├── docker-entrypoint.sh      # prisma db push + next start
├── .env.example              # todas las variables necesarias
├── prisma/
│   └── schema.prisma         # entidades Clip y Post
└── src/
    ├── app/                  # App Router
    │   ├── today/            # Today Ops
    │   ├── clips/            # Clips
    │   ├── queue/            # Cola de publicación
    │   ├── captions/         # Captions & Hashtags
    │   ├── metrics/          # Métricas
    │   └── dashboard/        # Dashboard
    ├── components/
    │   ├── layout/           # sidebar, app-shell, helpers
    │   ├── posts/            # filas de la cola
    │   └── ui/               # componentes base de shadcn/ui
    └── lib/                  # prisma client, queries, helpers
```

## 📜 Scripts

| Comando             | Acción                                       |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo (hot reload)          |
| `npm run build`     | `prisma generate` + build de producción      |
| `npm run start`     | Sirve el build de producción                 |
| `npm run lint`      | ESLint (next/core-web-vitals)                |
| `npm run db:push`   | Sincroniza el esquema con la base de datos   |
| `npm run db:seed`   | Carga datos de ejemplo (EA Sports FC)        |
| `npm run db:studio` | Abre Prisma Studio                           |

---

## 📝 Notas

- El esquema se sincroniza con `prisma db push` (ideal para arrancar rápido).
  Para un flujo de producción con historial, migra a `prisma migrate deploy`.
- Los componentes de `src/components/ui` siguen las convenciones de
  [shadcn/ui](https://ui.shadcn.com) y puedes añadir más con su CLI.
