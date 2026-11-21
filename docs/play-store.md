# Publicar en Google Play

Orden recomendado. El paso más largo no es técnico: con una **cuenta personal nueva**, Google exige una **prueba cerrada con al menos 12 personas durante 14 días seguidos** antes de dejarte publicar para todo el mundo. Empieza a buscar a esas 12 personas desde ya (familia, amigos, compañeros…).

**Antes de empezar:** el API en Railway con R2 ([railway.md](railway.md)) y los avisos push configurados ([push-firebase.md](push-firebase.md)).

## 1. Crea la cuenta de desarrollador

1. Entra en <https://play.google.com/console/signup> con la cuenta de Google que quieras usar para la app.
2. Elige **Para mí mismo/a** (cuenta personal).
3. Paga la cuota única de **25 $** y completa la **verificación de identidad** (DNI y, a veces, verificar un móvil Android). Puede tardar unos días.

## 2. Prepara lo que pide la ficha

| Qué | Detalle |
|---|---|
| Icono | 512 × 512 px, PNG. Sale de `apps/mobile/assets/images/icon.png` (amplíalo si hace falta). |
| Gráfico de funciones | 1024 × 500 px, PNG o JPG. Un banner con el nombre y una planta. |
| Capturas de pantalla | Mínimo 2, de móvil (por ejemplo Mi jardín, la ficha de una planta, Salud). Hazlas con la build de *preview*. |
| Descripción corta | Hasta 80 caracteres. Ej.: «Riego, clima y diagnóstico con IA para tus plantas, con aire de la Comarca». |
| Descripción larga | Hasta 4000 caracteres: qué hace la app, función por función. |
| Política de privacidad | `https://TU-DOMINIO/v1/privacidad` (la sirve el API; revísala y ajústala en `apps/api/src/legal/legal.pages.ts`). |
| Borrado de cuenta | `https://TU-DOMINIO/v1/borrar-cuenta` (y en la app: Perfil → Borrar mi cuenta). |
| Email de contacto | El mismo que `SUPPORT_EMAIL`. |

> La política de privacidad es una plantilla razonable, no asesoría legal. Léela entera y cambia lo que no encaje.

## 3. Haz la build de producción

```powershell
cd apps/mobile
eas build --profile production --platform android
```

Sale un archivo **.aab** (el formato que pide Google Play). Descárgalo desde el enlace que da EAS. Cada build de producción sube sola el número de versión (`autoIncrement`).

## 4. Crea la app en Play Console

1. **Crear aplicación** → nombre `Hospital de Plantas`, idioma **Español (España)**, **Aplicación**, **Gratis**. Acepta las declaraciones.
2. En el **Panel**, completa **Configura tu aplicación**:
   - **Acceso a la aplicación**: la app necesita iniciar sesión → **Todas o algunas funciones están restringidas** → añade una **cuenta de prueba** (email y contraseña) creada en tu API de Railway, con un par de plantas, para que la revisen.
   - **Anuncios**: No.
   - **Clasificación de contenido**: rellena el cuestionario (categoría *Utilidad/Productividad*; sin violencia, etc.).
   - **Público objetivo**: 13 años o más (mejor **18+** si no quieres requisitos extra de menores).
   - **Seguridad de los datos**: mira la tabla de abajo.
   - **Política de privacidad**: la URL del paso 2.
   - **Eliminación de cuentas**: la URL de borrado del paso 2.
   - **Categoría**: *Casa y hogar* o *Estilo de vida*.
3. **Ficha de Play Store principal**: descripciones, icono, gráfico y capturas.

### Seguridad de los datos (Data safety)

- **¿Recoge o comparte datos?** Sí. **¿Cifrado en tránsito?** Sí (HTTPS). **¿Pueden pedir que se borren?** Sí.

| Tipo de dato | Recogido | Compartido | Para qué | ¿Opcional? |
|---|---|---|---|---|
| Email, nombre | Sí | No | Gestión de la cuenta | No |
| Ubicación aproximada | Sí | No | Funcionalidad de la app (clima) | Sí |
| Fotos | Sí | No* | Funcionalidad de la app | Sí |
| Otro contenido generado por el usuario (notas, plantas) | Sí | No | Funcionalidad de la app | Sí |
| ID de dispositivo u otros (token de avisos) | Sí | No | Funcionalidad (notificaciones) | Sí |

\* Enviar las fotos a Anthropic o a Pl@ntNet para analizarlas cuenta como uso por *proveedores de servicios*, que Google no considera "compartir".

## 5. Google Sign-In con la firma de Google Play

Google Play vuelve a firmar la app con **su** clave, así que el SHA-1 cambia y "Continuar con Google" daría `DEVELOPER_ERROR`.

> La clave de firma solo aparece **después de subir el primer `.aab`**: haz primero el paso 6 (prueba interna) y vuelve aquí.

1. Play Console → tu app → menú de la izquierda **Protegida con Play → Protección de Play Store → Gestiona la firma de aplicaciones de Play**.
2. En **Clave de firma de aplicaciones** verás la clave **clásica** (y quizá una **anterior** y una **poscuántica**). Copia el **SHA-1** de la clásica. Si hay una *anterior*, copia también la suya.
3. Google Cloud Console (en el proyecto de Firebase, número `1051586701895`) → **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth → Android**: paquete `com.hospitaldeplantas.app` y ese SHA-1. Crea un cliente por cada SHA-1 (clásica y anterior). La poscuántica no hace falta.
4. La **clave de subida** no se pone en ningún cliente: solo sirve para que Google sepa que el `.aab` es tuyo.

Deja también el cliente Android que ya tienes (el de tus builds de EAS). El cliente **web** no cambia.

## 6. Prueba interna (tú)

1. **Prueba y lanza → Pruebas → Prueba interna → Crear versión**.
2. Sube el `.aab` (la primera vez tiene que ser a mano; después puedes usar `eas submit`).
3. En **Testers**, crea una lista con tu email → guarda → copia el **enlace para unirse** y ábrelo en tu móvil.
4. Instala desde Play Store y prueba todo: entrar con email y con Google, añadir planta, avisos, foto, salud, invitar a alguien.

## 7. Prueba cerrada (12 personas, 14 días)

1. **Pruebas → Prueba cerrada → Crear canal** (o usa *Alfa*) → **Crear versión** con el mismo `.aab`.
2. **Testers**: lo más cómodo es un **grupo de Google** (<https://groups.google.com>) al que añades a las 12+ personas; pon su email en el canal.
3. Envía la versión a revisión (la primera tarda de horas a pocos días).
4. Manda a cada persona el **enlace para unirse**. Cada una tiene que: aceptar, instalar desde Play Store y **usarla** de vez en cuando.
5. Mete a 14-15 personas por si alguna se sale: si en algún momento bajan de 12, el contador vuelve a empezar.

## 8. Pide el acceso a producción

Cuando la consola lo permita (14 días con 12 personas), en el **Panel → Solicitar acceso a producción** responde las preguntas sobre la prueba: qué te dijeron, qué cambiaste… Sé concreto. Google tarda unos días en contestar.

Después: **Producción → Crear versión** con el último `.aab` → revisión → publicada.

## Actualizaciones

```powershell
cd apps/mobile
eas build --profile production --platform android
eas submit --profile production --platform android
```

`eas submit` necesita una clave de cuenta de servicio de Google Cloud con permiso en tu Play Console, guardada como `apps/mobile/play-service-account.json` (ignorada por git). Se crea en Google Cloud (**IAM → Cuentas de servicio → Crear clave JSON**) y luego se invita ese email en Play Console → **Usuarios y permisos** con permiso para publicar. La guía de Expo «Creating a Google Service Account key for uploading to Google Play» lo explica con capturas. Mientras no la tengas, sube el `.aab` a mano.

Los cambios solo del API se publican con `git push`: Railway despliega solo, sin pasar por Google.
