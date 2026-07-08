# ClipOps — Chuleta de comandos

> Requisito: **Docker Desktop abierto** (es el "daemon"; si no está, los `docker` fallan).
> App → http://localhost:3000 · Base de datos → localhost:5432

## ⚡ TL;DR (lo que usarás siempre)

```bash
# Desarrollo del día a día (recarga en caliente):
docker compose up -d db      # 1) prende solo la base de datos
npm run dev                  # 2) arranca la app  (Ctrl+C para apagarla)

# Prender TODO como un deploy (app + db en Docker):
docker compose up -d --build

# Apagar TODO:
docker compose down
```

---

## 1. Desarrollo día a día (recomendado) 🧑‍💻

Recarga en caliente: editas y se actualiza solo. La DB vive en Docker, la app en tu terminal.

```bash
docker compose up -d db      # enciende la base de datos en segundo plano
npm run dev                  # arranca Next.js en http://localhost:3000
# ...trabajas...
# Ctrl+C                     # apaga la app
docker compose stop db       # (opcional) apaga la base de datos
```

## 2. Modo "app prendida" (Docker) — como tu .jar de Spring 🐳

Construye la imagen y corre app + db juntos. Útil para probar "como en producción" o en la VPS.

```bash
docker compose up -d --build   # prende todo (rebuild). Sin --build si no cambiaste código.
docker compose ps              # ver qué está corriendo
docker compose logs -f app     # ver logs de la app en vivo (Ctrl+C para salir)
docker compose down            # apaga y borra los contenedores (los datos se conservan)
```

| Spring Boot | ClipOps (Docker) |
| --- | --- |
| `java -jar app.jar` / Run | `docker compose up -d --build` |
| Parar el programa | `docker compose down` |
| Ver logs en consola | `docker compose logs -f app` |

### Encender / apagar sin reconstruir

```bash
docker compose stop            # pausa los contenedores (no los borra)
docker compose start           # los vuelve a encender
docker compose restart app     # reinicia solo la app
docker compose up -d --build app   # reconstruye y reinicia solo la app
```

## 3. Base de datos (Prisma) 🗄️

```bash
npm run db:push        # aplica el esquema (prisma/schema.prisma) a la base
npm run db:seed        # carga datos de ejemplo (EA Sports FC)
npm run db:studio      # abre Prisma Studio (explorador visual) en :5555
npm run db:generate    # regenera el cliente Prisma (tras cambiar el esquema)
```

> Tras editar `prisma/schema.prisma` en desarrollo: corre `npm run db:push`.
> En Docker, el esquema se aplica solo al arrancar (lo hace `docker-entrypoint.sh`).

### Resetear la base de datos (¡borra los datos!)

```bash
docker compose down -v         # apaga todo y BORRA el volumen de Postgres
docker compose up -d db        # base limpia
npm run db:push && npm run db:seed
```

## 4. Utilidades 🔧

```bash
npm install            # instalar dependencias (primera vez / tras cambios en package.json)
npm run build          # build de producción (verifica tipos + lint)
npm run lint           # solo linter
docker compose logs -f db   # logs de la base de datos
```

## 5. IA local (análisis de clips) 🤖

El análisis de clips (score + título + hashtags) corre **en tu PC** con tu GPU,
no en el VPS. Necesitas dos servicios locales encendidos:

```powershell
# Enciende todo (Ollama con CORS + whisper-server) — corre esto y listo:
powershell -ExecutionPolicy Bypass -File scripts\start-local-ai.ps1
```

Instalación en una PC nueva (una sola vez):

```powershell
# 1) Ollama + modelo de visión
#    Instala desde https://ollama.com/download y luego:
ollama pull qwen3.5:4b

# 2) whisper.cpp (binarios oficiales, sin compilar nada)
mkdir "$env:USERPROFILE\tools\whisper-release" ; cd "$env:USERPROFILE\tools\whisper-release"
curl.exe -sL -o whisper.zip https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip
tar -xf whisper.zip

# 3) Modelo de transcripción (ggml-small, 466MB, multilenguaje)
mkdir "$env:USERPROFILE\tools\whisper-models" ; cd "$env:USERPROFILE\tools\whisper-models"
curl.exe -sL -o ggml-small.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

> El repo fuente está clonado en `%USERPROFILE%\tools\whisper.cpp` por si algún
> día queremos compilar con CUDA. Con el modelo `small` en CPU sobra para
> clips cortos, y así la VRAM queda libre para `qwen3.5:4b`.

- **El botón "Analizar clip" está deshabilitado** → falta un servicio: corre `scripts\start-local-ai.ps1`.
- **Error de CORS con Ollama** → lo arrancaste sin `OLLAMA_ORIGINS`: cierra Ollama (icono de la bandeja) y usa el script.

## Problemas comunes

- **`Can't reach database at localhost:5432`** → la DB no está prendida: `docker compose up -d db`.
- **`failed to connect to the docker API`** → abre **Docker Desktop** y espera a que diga "running".
- **El puerto 3000 está ocupado** → tienes la app en Docker Y `npm run dev` a la vez. Apaga uno: `docker compose stop app`.
- **Cambié el esquema y la app no lo ve** → `npm run db:push` (dev) o `docker compose up -d --build app` (Docker).
