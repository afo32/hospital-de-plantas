# Inicio de sesión con Google — guía paso a paso

El botón **Continuar con Google** usa un módulo nativo que **no existe en Expo Go**. Por eso hace falta una **build de desarrollo**: tu propia versión de la app, instalada en el móvil como una app normal, que carga el código desde tu ordenador igual que Expo Go.

Orden recomendado (la build tarda ~15–20 min en la nube; mientras, configuras Google Cloud):

1. Git (EAS lo necesita)
2. Cuenta de Expo y build de desarrollo
3. Huella SHA-1
4. Google Cloud: pantalla de consentimiento y dos clientes
5. Pegar el ID en los `.env`
6. Probar

---

## 1. Git

EAS sube el proyecto desde git. En la carpeta `hospital-de-plantas`:

```powershell
git init
git add .
git commit -m "Fase 2: inicio de sesión"
```

Los `.env` no se suben (están en `.gitignore`). Comprueba con `git status` que no aparece ningún `.env`.

## 2. Cuenta de Expo y build de desarrollo

1. Crea una cuenta gratis en https://expo.dev/signup
2. Instala la herramienta e inicia sesión:
   ```powershell
   npm install -g eas-cli
   eas login
   ```
3. Vincula la app a tu cuenta (crea el proyecto en expo.dev y añade su `projectId` a `app.json`):
   ```powershell
   cd apps/mobile
   eas init
   ```
   Si pregunta si crear el proyecto, responde **Yes**. Después guarda el cambio en git:
   ```powershell
   git add app.json
   git commit -m "Proyecto EAS"
   ```
4. Lanza la build (Android):
   ```powershell
   eas build --profile development --platform android
   ```
   - *Generate a new Android Keystore?* → **Yes** (EAS la guarda por ti).
   - Espera a que termine (puedes cerrar la terminal y seguirla en expo.dev → tu proyecto → Builds).
5. Al terminar te da un **QR / enlace**. Ábrelo en el móvil, descarga el `.apk` e instálalo (Android pedirá permitir instalar desde el navegador: acéptalo).

## 3. Huella SHA-1

Google necesita la huella del certificado con el que se firmó la build.

```powershell
eas credentials -p android
```

Elige el perfil **development** → verás `SHA1 Fingerprint: AA:BB:CC:...`. Cópiala.
(También aparece en expo.dev → tu proyecto → Credentials → Android.)

## 4. Google Cloud

1. Entra en https://console.cloud.google.com con tu cuenta de Google.
2. Arriba, en el selector de proyectos → **Proyecto nuevo** → nombre `Hospital de Plantas` → Crear. Asegúrate de que queda seleccionado.
3. Menú ☰ → **APIs y servicios → Pantalla de consentimiento de OAuth** (puede llamarse *Google Auth Platform*) → **Comenzar**:
   - Nombre de la app: `Hospital de Plantas`
   - Correo de asistencia: tu email
   - Público: **Externo**
   - Información de contacto: tu email → Crear
4. En **Público** (*Audience*) → **Usuarios de prueba** → **Agregar usuarios** → añade tu Gmail (y el de quien vaya a probar). Mientras la app esté en modo *Prueba*, solo esas cuentas pueden entrar.
5. En **Clientes** → **Crear cliente**:
   - Tipo: **Aplicación web**
   - Nombre: `Hospital de Plantas – Web`
   - Crear → **copia el ID de cliente** (termina en `.apps.googleusercontent.com`). Este es el importante.
6. Otra vez **Crear cliente**:
   - Tipo: **Android**
   - Nombre: `Hospital de Plantas – Android (desarrollo)`
   - Nombre del paquete: `com.hospitaldeplantas.app`
   - Huella SHA-1: la del paso 3
   - Crear. De este no hay que copiar nada: Google lo usa para reconocer tu app.

## 5. Pegar el ID de cliente web

El **mismo** ID (el del cliente *Aplicación web*) en dos sitios:

`apps/api/.env`
```
GOOGLE_WEB_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
```

`apps/mobile/.env`
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
```

## 6. Probar

1. Reinicia el servidor: `npm run api:dev`
2. Arranca Metro desde la raíz: `npm run mobile` (o `npx expo start -c` desde `apps/mobile`).
   Con la build de desarrollo instalada, Metro arranca en modo *development build*.
3. Abre la app **Hospital de Plantas** del móvil (no Expo Go). Te muestra los servidores de tu red: elige el de tu ordenador o escanea el QR.
4. En **Entrar** verás **Continuar con Google** → elige tu cuenta → estás dentro, con tu jardín creado.

Para seguir usando Expo Go: `npm run start:go -w mobile`.

## Problemas frecuentes

| Mensaje | Causa | Solución |
| --- | --- | --- |
| *DEVELOPER_ERROR* | El cliente Android no coincide | Revisa el paquete `com.hospitaldeplantas.app` y la SHA-1 del perfil **development**. Los cambios en Google Cloud pueden tardar unos minutos. |
| *No se pudo verificar tu cuenta de Google* | El servidor tiene otro ID | `GOOGLE_WEB_CLIENT_ID` (API) y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (app) deben ser el mismo, el del cliente **web**. Reinicia el API. |
| El botón no aparece | Estás en Expo Go, falta el ID en `apps/mobile/.env` o el servidor no lo tiene | Usa la build de desarrollo, revisa los dos `.env` y reinicia Metro con `-c`. |
| *Access blocked / app not verified* | Tu cuenta no está como usuario de prueba | Añádela en Público → Usuarios de prueba. |

## Más adelante

- **iPhone**: requiere cuenta de Apple Developer. Se añadirá un cliente iOS y el plugin con su `iosUrlScheme`.
- **Publicar en Google Play**: habrá que añadir otra huella SHA-1 (la de la firma de Play) como segundo cliente Android.
