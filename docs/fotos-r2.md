# Fotos en Cloudflare R2

Las fotos de tus plantas, de las notas y de las revisiones de salud se guardan en **Cloudflare R2**: gratis hasta 10 GB (unas 30.000 fotos de la app) y las fotos sobreviven aunque el servidor se reinicie.

> **¿Hace falta ya?** No. Mientras pruebas en tu PC, si dejas las variables `R2_*` vacías, las fotos se guardan en la carpeta `apps/api/uploads`. R2 es **imprescindible para Railway** (fase 7), porque allí el disco se borra en cada despliegue.

El panel de Cloudflare suele estar en inglés; los nombres de los botones van tal cual aparecen.

## 1. Crea la cuenta y activa R2

1. Entra en <https://dash.cloudflare.com/sign-up> y crea una cuenta gratuita (no hace falta tener un dominio).
2. En el menú de la izquierda, entra en **R2 Object Storage**.
3. La primera vez te pedirá **añadir un método de pago** (tarjeta o PayPal). Es una verificación: mientras no pases de 10 GB al mes no cobra nada.
4. Pulsa **Purchase R2 / Activate** si te lo pide (el plan es de 0 $).

## 2. Crea el bucket

1. En **R2 Object Storage**, pulsa **Create bucket**.
2. Nombre: `hospital-de-plantas`.
3. Location: **Automatic** (o **Europe (EU)** si quieres que las fotos estén en la UE).
4. Pulsa **Create bucket**. **No** actives el acceso público: la app sirve las fotos a través del API, con enlaces firmados.

## 3. Crea la clave de acceso

1. Vuelve a **R2 Object Storage** (la página principal de R2).
2. A la derecha verás **Account ID**: cópialo (son 32 letras y números).
3. Pulsa **Manage API tokens** (o **API → Manage API tokens**) y luego **Create API token** (en "R2 Account Token" o "User API Token", cualquiera sirve).
4. Rellena:
   - **Token name**: `hospital-de-plantas-api`
   - **Permissions**: **Object Read & Write**
   - **Specify bucket(s)**: **Apply to specific buckets only** → `hospital-de-plantas`
   - **TTL**: Forever
5. Pulsa **Create API Token**. Te enseñará **una sola vez**:
   - **Access Key ID**
   - **Secret Access Key**

   Cópialos ahora. Si los pierdes, borra el token y crea otro.

## 4. Pon las claves en el API

Abre `apps/api/.env` en VS Code (no las pegues en el chat ni en ningún otro sitio) y rellena:

```env
R2_ACCOUNT_ID=el-account-id-del-paso-3
R2_ACCESS_KEY_ID=la-access-key-id
R2_SECRET_ACCESS_KEY=la-secret-access-key
R2_BUCKET=hospital-de-plantas
```

Reinicia el API (`Ctrl + C` y `npm run api:dev`). En la terminal debe salir:

```
[StorageService] Fotos en R2 (bucket "hospital-de-plantas")
```

Si sale `Fotos en disco: …`, falta alguna de las tres primeras variables.

## 5. Comprueba

1. En la app, entra en una planta → **📷 Poner mi foto** → elige una foto.
2. En Cloudflare, abre el bucket: verás una carpeta `plant/` con la foto.

## Problemas típicos

| Lo que ves                                                            | Qué pasa                                                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `InvalidAccessKeyId` o `SignatureDoesNotMatch` en la terminal del API | Access Key o Secret mal copiados (sin espacios al principio o al final).                              |
| `NoSuchBucket`                                                        | El bucket no se llama igual que `R2_BUCKET`.                                                          |
| `AccessDenied`                                                        | El token no tiene **Object Read & Write** o no incluye ese bucket.                                    |
| Las fotos que subiste antes de configurar R2 ya no se ven             | Estaban en `apps/api/uploads`. Vuelve a subirlas, o cópialas al bucket con la misma ruta de carpetas. |

## Cuánto ocupa

La app reduce cada foto a 1280 px y JPEG al 70 % antes de enviarla: unos 200-400 KB. 10 GB dan para unas 30.000 fotos. En el panel de R2, la pestaña **Metrics** del bucket muestra lo que llevas.
