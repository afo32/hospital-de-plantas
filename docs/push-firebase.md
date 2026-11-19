# Avisos push del jardín compartido (Firebase)

Los avisos de riego, abono y helada son **locales**: no necesitan nada de esto. Esta guía es solo para los avisos que manda el **servidor** cuando otra persona hace algo en un jardín compartido ("Ana · Mi jardín: Regó Monstera y Pothos").

Cómo funciona: el API manda el aviso al servicio de push de **Expo**, que lo entrega a través de **Firebase Cloud Messaging (FCM)**. Hacen falta dos archivos de Firebase:

| Archivo | Qué es | Dónde va |
|---|---|---|
| `google-services.json` | Identifica la app en Firebase. No es secreto. | `apps/mobile/google-services.json` (se sube a git) |
| Clave de cuenta de servicio (`…-firebase-adminsdk-….json`) | Permite a Expo enviar avisos. **Es secreta.** | Se sube a Expo con `eas credentials`. **Nunca** al repo ni al chat. |

Todo es gratis. Tiempo: unos 15 minutos.

## 1. Crea el proyecto en Firebase

1. Entra en <https://console.firebase.google.com> con tu cuenta de Google.
2. **Crear un proyecto** → nombre: `hospital-de-plantas` → puedes desactivar Google Analytics → **Crear proyecto**.

## 2. Añade la app Android y descarga `google-services.json`

1. En la página del proyecto, pulsa el icono de **Android**.
2. **Nombre del paquete de Android**: `com.hospitaldeplantas.app` (exactamente así).
3. Apodo: `Hospital de Plantas`. El SHA-1 no hace falta aquí.
4. **Registrar app** → **Descargar google-services.json**.
5. Guarda el archivo en `apps/mobile/google-services.json` (al lado de `app.json`).
6. Los siguientes pasos del asistente (añadir el SDK) sáltalos: Expo lo hace solo. Pulsa **Siguiente** hasta terminar.

## 3. Crea la clave de cuenta de servicio

1. En Firebase: ⚙️ (arriba a la izquierda) → **Configuración del proyecto** → pestaña **Cuentas de servicio**.
2. **Generar nueva clave privada** → **Generar clave**. Se descarga un archivo tipo `hospital-de-plantas-firebase-adminsdk-xxxxx.json`.
3. Déjalo en **Descargas** (fuera del proyecto). El `.gitignore` también lo ignora por si acaso.

## 4. Sube la clave a Expo

Desde `apps/mobile`:

```powershell
cd apps/mobile
eas init
eas credentials
```

`eas init` se asegura de que la app está enlazada a tu proyecto de Expo (si dice que ya lo está, perfecto).

En `eas credentials` elige:

1. **Android**
2. **production** (las credenciales de push valen para todas las builds de la misma app)
3. **Google Service Account**
4. **Manage your Google Service Account Key for Push Notifications (FCM V1)**
5. **Set up a Google Service Account Key for Push Notifications (FCM V1)** → **Upload a new service account key**
6. Escribe la ruta del archivo, por ejemplo `C:\Users\juanc\Downloads\hospital-de-plantas-firebase-adminsdk-xxxxx.json`

También se puede hacer en la web: expo.dev → tu proyecto → **Credentials** → Android → **FCM V1 service account key** → **Add a service account key**.

## 5. Rehaz la build

```powershell
git add google-services.json
git commit -m "Firebase para avisos push"
eas build --profile development --platform android
```

(El archivo tiene que estar en git: EAS solo sube a sus servidores lo que no está ignorado.)

## 6. Comprueba

1. Instala la build nueva en tu móvil y entra. Acepta los avisos.
2. En la terminal del API no tiene que salir nada raro. En la base de datos (`npx prisma studio` → **PushToken**) debe aparecer tu token `ExponentPushToken[…]`.
3. Invita a otra persona (o crea otra cuenta en otro móvil) y que riegue una planta. A los ~60 segundos te llega el aviso.

## Problemas típicos

| Lo que ves | Qué pasa |
|---|---|
| La build falla con `google-services.json` no encontrado | El archivo no está en `apps/mobile/` o no está en git. |
| No aparece ningún token en **PushToken** | La app no tiene permiso de avisos, o la build es anterior a esta fase. En Perfil pulsa **Activar avisos en este móvil**. |
| En la terminal del API: `InvalidCredentials` | La clave del paso 3 no se subió a Expo, o es de otro proyecto de Firebase. |
| El aviso tarda | Es a propósito: el servidor espera 60 s para juntar varias acciones en un aviso. Cámbialo con `PUSH_BATCH_SECONDS` en `apps/api/.env`. |
