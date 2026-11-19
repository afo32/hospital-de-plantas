# Subir el API a Railway

Hasta ahora el API corre en tu PC y el móvil solo lo ve dentro de tu wifi. En Railway queda en internet, con su propia base de datos, y la app funciona en cualquier sitio.

**Coste:** el plan Hobby de Railway son 5 $/mes e incluye 5 $ de uso; lo que pase de ahí se cobra aparte. El API y Postgres encendidos todo el mes suelen quedarse entre 5 y 8 $ al mes. Las fotos van a Cloudflare R2 (gratis hasta 10 GB). Puedes poner un límite de gasto en **Account → Usage → Usage limits**.

**Antes de empezar:**

- El repo en GitHub (privado está bien).
- R2 configurado ([fotos-r2.md](fotos-r2.md)): en Railway el disco se borra en cada despliegue, así que sin R2 perderías las fotos.

## 1. Crea el proyecto

1. Entra en <https://railway.com> con tu cuenta de GitHub.
2. **New Project → Deploy from GitHub repo** → elige `hospital-de-plantas`. Si no aparece, pulsa **Configure GitHub App** y dale acceso a ese repo.
3. Se crea un servicio con el repo. **No te preocupes si el primer despliegue falla**: aún faltan las variables.

## 2. Añade la base de datos

En el mismo proyecto: **+ Create → Database → PostgreSQL**. Railway crea el servicio `Postgres`.

## 3. Configura el servicio del API

Abre el servicio del repo (no el de Postgres):

1. **Settings → Config-as-code → Railway Config File**: déjalo **vacío**. Railway lee solo el `railway.json` de la raíz del repo, que dice cómo construir (`npm run build`), aplicar las migraciones antes de cada despliegue, arrancar (`npm start`) y comprobar que responde (`/v1/health`).
2. **Settings → Source → Root Directory**: déjalo vacío (la raíz del repo).
3. **Variables → Raw Editor**, pega esto y cambia los valores:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=pon-aqui-un-secreto-nuevo-de-al-menos-48-caracteres
JWT_ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=30
GOOGLE_WEB_CLIENT_ID=el-mismo-de-tu-apps/api/.env
FEATURE_APPLE_LOGIN=false
PLANTNET_API_KEY=la-de-tu-.env
ANTHROPIC_API_KEY=la-de-tu-.env
ANTHROPIC_MODEL=claude-sonnet-5-5
IDENTIFY_DAILY_LIMIT=10
DIAGNOSE_DAILY_LIMIT=3
R2_ACCOUNT_ID=la-de-tu-.env
R2_ACCESS_KEY_ID=la-de-tu-.env
R2_SECRET_ACCESS_KEY=la-de-tu-.env
R2_BUCKET=hospital-de-plantas
PUSH_BATCH_SECONDS=60
SUPPORT_EMAIL=un-email-de-contacto-para-la-politica-de-privacidad
PUBLIC_URL=https://TU-DOMINIO
```

- `JWT_ACCESS_SECRET`: genera uno **nuevo** (no reutilices el de tu PC) con:
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
- `${{Postgres.DATABASE_URL}}` se escribe tal cual: Railway lo sustituye por la URL de la base de datos.
- `SUPPORT_EMAIL` aparece en la política de privacidad. Puede ser un Gmail creado para la app.
- `PUBLIC_URL`: rellénala después del paso 4 (sin `/v1` al final). Con ella, las invitaciones llevan un enlace `https://…` que se puede pulsar en WhatsApp y abre la app.

4. Pulsa **Deploy** (arriba). En **Deployments** verás la construcción; tarda 2-4 minutos.

## 4. Dale una dirección pública

**Settings → Networking → Generate Domain**. Te da algo como `hospital-de-plantas-production.up.railway.app`.

Comprueba en el navegador:

- `https://TU-DOMINIO/v1/health` → `{"status":"ok", … "database":"up"}`
- `https://TU-DOMINIO/v1/privacidad` → la política de privacidad
- `https://TU-DOMINIO/docs` → la documentación del API

## 5. Apunta la app a Railway

En `apps/mobile/eas.json`, en los perfiles **preview** y **production**, cambia:

```json
"EXPO_PUBLIC_API_URL": "https://TU-DOMINIO/v1",
"EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "el-mismo-de-apps/mobile/.env"
```

Para probar con Railway sin pasar por la tienda:

```powershell
cd apps/mobile
eas build --profile preview --platform android
```

Instala ese APK. Es una app normal (sin Metro), conectada a Railway: funciona fuera de casa.

> Tu `apps/mobile/.env` sigue apuntando a tu PC para desarrollar. Los perfiles de `eas.json` solo afectan a las builds de EAS.

> Las cuentas y plantas de tu PC **no** pasan a Railway: es una base de datos nueva y vacía. Tendrás que volver a crear tu cuenta.

## Problemas típicos

| Lo que ves | Qué pasa |
|---|---|
| `railpack process exited with an error` | Railway no encuentra cómo arrancar (*No start command*). Comprueba que el repo tiene `railway.json` en la raíz y que **Config File** está vacío o dice `railway.json`. Si no, copia aquí las líneas de **Build Logs** justo encima del error. |
| El despliegue falla en `prisma migrate deploy` | `DATABASE_URL` no apunta a Postgres. Revisa que pusiste `${{Postgres.DATABASE_URL}}`. |
| `Variables de entorno no válidas` en los logs | Falta una variable obligatoria o el secreto es corto. El mensaje dice cuál. |
| La app dice "No se pudo conectar con el servidor" | La URL de `eas.json` no termina en `/v1`, o la build se hizo antes de cambiarla. |
| En los logs: `Fotos en disco` | Faltan las `R2_*`: las fotos se perderían en el siguiente despliegue. |
