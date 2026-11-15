# Hospital de Plantas 🌿

App móvil para cuidar tus plantas: riego, fertilización, trasplante, clima, diagnóstico con IA y ficha completa de cada especie.

Monorepo con tres paquetes:

| Carpeta | Qué es | Tecnología |
| --- | --- | --- |
| `apps/mobile` | App iOS y Android | Expo SDK 58, Expo Router, TypeScript |
| `apps/api` | Servidor | NestJS 12, Prisma 7, PostgreSQL 16 |
| `packages/shared` | Catálogos y esquemas compartidos | TypeScript + Zod |

**Estado: fase 6 de 7.**

- Fase 6: pestaña Salud con revisión por fotos: Claude mira hasta 3 fotos, pregunta por la tierra, el riego y los cambios recientes, y da diagnóstico, tratamiento paso a paso, cambios de cuidados y fecha de revisión (con aviso). Notas con texto y hasta 4 fotos, foto propia de cada planta, fotos en Cloudflare R2 o en disco ([docs/fotos-r2.md](docs/fotos-r2.md)).

- Fase 1: tema élfico, navegación (Mi jardín con Hoy / Mis plantas, Buscar, Perfil), botón + y Añadir planta con categorías. API con `GET /v1/health` y esquema completo de la base de datos.
- Fase 2: cuentas con email y contraseña, e inicio con Google (Android, build de desarrollo: ver [docs/google-login.md](docs/google-login.md)).
- Fase 5: clima de tu zona (GPS o ciudad) y veredicto por planta (fuera / dentro / fuera de día y dentro de noche / sombra), riego ajustado por calor y lluvia, avisos locales de riego, abono, trasplante y helada, medidor de luz (Android) y modo sin conexión con cola de cambios.
- Fase 4: Mi jardín completo. Cuestionario al añadir una planta, motor de cuidado (riego, cantidad, abono, trasplante y maceta), pestaña Hoy con atrasadas/hoy/próximamente, marcar y deshacer, completar todo, posponer 1–7 días, Mis plantas, detalle con Cuidado, Info y calendario mensual.
- Fase 3: buscar plantas por nombre (español o científico) y por familia, identificar con 1–5 fotos (Pl@ntNet) y ficha Info completa en español generada con Claude y guardada para siempre. Registro (crea tu primer jardín), inicio y cierre de sesión, sesión guardada en el llavero del móvil y renovada sola, todas las rutas del API protegidas salvo las de acceso, límite de intentos y mensajes en español.

---

## 1. Requisitos (una sola vez)

1. **Node.js 22 o superior** → https://nodejs.org (elige la versión LTS).
2. **Docker Desktop** → https://www.docker.com/products/docker-desktop (para Postgres y Redis en tu ordenador).
3. **Expo Go** en tu móvil Android, desde Google Play. (En iPhone también funciona Expo Go mientras no usemos módulos nativos nuevos.)
4. Ordenador y móvil **en la misma wifi**.

Comprueba en una terminal:

```bash
node -v      # v22.x o superior
docker -v
```

## 2. Instalar

```bash
cd hospital-de-plantas
cp apps/api/.env.example apps/api/.env
npm ci
```

`npm ci` instala exactamente las versiones del `package-lock.json`. Si en algún momento usas `npm install` y ves el error `Cannot read properties of null (reading 'edgesOut')`, actualiza npm (`npm i -g npm@latest`) y repite.

## 3. Base de datos

```bash
npm run db:up                 # arranca Postgres (puerto 5440) y Redis en Docker
npm run api:migrate
```

Cuando Prisma pregunte el nombre de la migración, escribe `init`. El último comando crea las tablas y la carpeta `apps/api/prisma/migrations/`. **Súbela a git**: Railway la usa para crear las tablas en producción.

Para ver los datos con una interfaz web: `npm run api:studio`.

## 4. Arrancar el API

```bash
npm run api:dev
```

Abre http://localhost:3000/v1/health → debe responder `{"status":"ok", "database":"up", ...}`.
La documentación interactiva de la API está en http://localhost:3000/docs.

## 5. Arrancar la app

1. Averigua la IP de tu ordenador en la wifi:
   - Windows: `ipconfig` → "Dirección IPv4" (p. ej. `192.168.1.40`)
   - Mac: `ipconfig getifaddr en0`
   - Linux: `hostname -I`
2. Crea el `.env` de la app y pon esa IP:

   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   # edita apps/mobile/.env → EXPO_PUBLIC_API_URL=http://TU_IP:3000/v1
   ```

   Si Expo Go no abre el QR porque Metro anuncia otra IP (pasa en Windows con Hyper-V/WSL), crea `apps/mobile/.env.local` con `REACT_NATIVE_PACKAGER_HOSTNAME=TU_IP`. Tiene que ir en `.env.local`, no en `.env`.

3. Arranca Metro:

   ```bash
   npm run mobile
   ```

4. Escanea el código QR con Expo Go (Android) o con la cámara (iPhone).
   Si ya instalaste la **build de desarrollo** (necesaria para Google), abre esa app en lugar de Expo Go. Para forzar Expo Go: `npm run start:go -w mobile`.
5. Ve a la pestaña **Perfil**: si ves el punto verde "API conectado · base de datos activa", la fase 1 está completa. ✅

Si sale en rojo: revisa que el API está encendido, que la IP del `.env` es la correcta, que el móvil está en la misma wifi y que el firewall de tu ordenador deja pasar el puerto 3000. Tras cambiar `.env`, para Metro y vuelve a lanzar `npm run mobile`.

## 6. Comprobaciones

```bash
npm run typecheck   # tipos de los tres paquetes
npm test            # tests del API
```

## 7. Desplegar el API en Railway (cuando quieras)

1. Sube el repo a GitHub.
2. En https://railway.com → **New Project → Deploy from GitHub repo** → elige el repo.
3. En el mismo proyecto añade **Database → PostgreSQL** (y, desde la fase 5, **Redis**).
4. En el servicio del API → **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referencia a la base de datos)
   - `NODE_ENV` = `production`
   - el resto de `apps/api/.env.example` según la fase (desde la fase 6, las `R2_*`: en Railway el disco se borra en cada despliegue)
5. El archivo `apps/api/railway.json` ya indica cómo construir, aplicar migraciones antes de cada despliegue y arrancar. En **Settings → Config-as-code** apunta a `apps/api/railway.json` y deja el *Root Directory* vacío (la raíz del repo).
6. En **Settings → Networking → Generate Domain** obtienes la URL pública; ponla en `apps/mobile/.env` como `EXPO_PUBLIC_API_URL=https://tu-api.up.railway.app/v1`.

## Estructura

```
hospital-de-plantas/
├─ docker-compose.yml          Postgres 16 + Redis 7 para desarrollo
├─ packages/shared/src/
│  ├─ catalog.ts               categorías, luz, macetas, sustratos… (valores + etiquetas)
│  └─ schemas.ts               validaciones Zod compartidas (login, alta de planta…)
├─ apps/api/
│  ├─ prisma/schema.prisma     modelo de datos completo
│  ├─ prisma.config.ts         conexión de Prisma 7
│  ├─ railway.json             despliegue
│  └─ src/
│     ├─ config/env.ts         variables de entorno validadas al arrancar
│     ├─ prisma/               PrismaService global
│     ├─ health/               GET /v1/health
│     ├─ auth/                 registro, login, Google, refresh, logout, guard global, contraseñas (scrypt)
│     ├─ species/              búsqueda (catálogo + GBIF + Wikipedia), identificación (Pl@ntNet), ficha con Claude
│     │  └─ catalog.data.ts    plantas populares por familia (añade las tuyas aquí)
│     ├─ garden/               plantas, tareas de Hoy, completar, posponer, calendario
│     │  └─ care-engine.ts     motor de cuidado (fórmulas de riego, abono, trasplante y maceta)
│     ├─ weather/              clima y búsqueda de ciudades (Open-Meteo), con caché por zona
│     ├─ storage/              fotos en R2 o disco, enlaces firmados /v1/files/…
│     ├─ notes/                notas con fotos
│     ├─ diagnosis/            revisión de salud con Claude (fotos → preguntas → tratamiento)
│     ├─ ai/ask.ts             llamada a Claude con salida estructurada
│     ├─ usage/                límites diarios por usuario
│     └─ users/                GET y PATCH /v1/me
└─ apps/mobile/src/
   ├─ app/                     pantallas (Expo Router)
   │  ├─ (tabs)/index.tsx      Mi jardín (Hoy / Mis plantas) + botón +
   │  ├─ (tabs)/search.tsx     Buscar
   │  ├─ (tabs)/profile.tsx    Perfil (estado de conexión)
   │  ├─ add.tsx               Añadir planta
   │  ├─ identify.tsx          Identificar con fotos
   │  ├─ plant-setup/[speciesId].tsx  Cuestionario al añadir una planta
   │  ├─ plant/[id].tsx        Detalle de tu planta (Cuidado · Salud · Notas · Info)
   │  ├─ light-meter.tsx       Medidor de luz
   │  ├─ diagnose/[plantId].tsx  Revisión de salud: fotos y síntomas
   │  ├─ diagnosis/[id].tsx    Preguntas y diagnóstico con tratamiento
   │  └─ species/[id].tsx      Ficha Info de una especie
   │  ├─ (auth)/login.tsx      Entrar
   │  ├─ (auth)/register.tsx   Crear cuenta
   ├─ auth/AuthProvider.tsx    sesión: entrar, registrarse, salir, recuperar al abrir
   ├─ components/              Card, Screen, Fab, Button, TextField, iconos SVG…
   ├─ theme/tokens.ts          colores, tipografías y espacios del tema
   └─ lib/
      ├─ api.ts                cliente del API con renovación automática del token
      ├─ offline.ts            caché sin conexión y cola de cambios pendientes
      ├─ notifications.ts      avisos locales (riego, abono, trasplante, helada, revisiones)
      ├─ health.ts             notas, fotos y revisiones de salud
      ├─ media.ts              elegir fotos, reducirlas y mostrarlas
      └─ location.ts           ubicación por GPS o por ciudad
```

## Servicios externos

| Servicio | Para qué | Clave | Coste |
| --- | --- | --- | --- |
| GBIF | Buscar plantas por nombre | No | Gratis |
| Wikipedia | Foto de cada especie | No | Gratis |
| Pl@ntNet | Identificar por fotos | `PLANTNET_API_KEY` | Gratis hasta 500/día |
| Claude (Anthropic) | Ficha Info y revisiones de salud | `ANTHROPIC_API_KEY` | De pago por uso: ficha una vez por especie; unos 5-10 céntimos por revisión completa (máx. 3 al día por persona, `DIAGNOSE_DAILY_LIMIT`) |
| Cloudflare R2 | Guardar las fotos | `R2_*` | Gratis hasta 10 GB |
| Google | Inicio de sesión | `GOOGLE_WEB_CLIENT_ID` | Gratis |
| Open-Meteo | Tiempo y búsqueda de ciudades | No | Gratis (uso no comercial) |

Sin `PLANTNET_API_KEY` o `ANTHROPIC_API_KEY` la app sigue funcionando y explica qué falta.

## Tema visual

Pergamino, musgo, corteza y oro viejo. Titulares en *Cormorant Garamond*, texto en *Nunito*. Todo sale de `apps/mobile/src/theme/tokens.ts`: cambia un color ahí y cambia en toda la app.

## Próximas fases

2. ~~Autenticación con email y Google~~ ✅ · Apple desactivado hasta tener cuenta de Apple Developer
3. ~~Especies, búsqueda, identificación por fotos y ficha Info con IA~~ ✅
4. ~~Mi jardín: cuestionario, motor de cuidado, tareas, posponer, calendario~~ ✅
5. ~~Clima, luxómetro, notificaciones y modo sin conexión~~ ✅
6. ~~Salud (diagnóstico con IA) y notas con fotos~~ ✅
7. Jardín compartido, pruebas y publicación
