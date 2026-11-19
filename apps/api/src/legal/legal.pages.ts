/** Páginas públicas que pide Google Play: política de privacidad y cómo borrar la cuenta. */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Hospital de Plantas</title>
<style>
  body{margin:0;background:#F4ECD8;color:#4A3A2C;font:16px/1.6 Georgia,'Times New Roman',serif}
  main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
  h1{color:#34472A;font-size:2em;line-height:1.15;margin:0 0 4px}
  h2{color:#34472A;font-size:1.3em;margin:28px 0 6px;border-bottom:1px solid #CDBB94;padding-bottom:4px}
  .muted{color:#7A6552;font-style:italic} a{color:#4F6B3A}
  li{margin:4px 0} .card{background:#FBF6EA;border:1px solid #CDBB94;border-radius:14px;padding:16px 18px;margin:16px 0}
</style></head><body><main>${body}</main></body></html>`;
}

const contact = (email: string | undefined) =>
  email
    ? `escribe a <a href="mailto:${esc(email)}">${esc(email)}</a>`
    : 'escribe al correo de contacto que aparece en la ficha de la app en Google Play';

export function privacyPage(email: string | undefined, updated: string): string {
  return page(
    'Política de privacidad',
    `<h1>Política de privacidad</h1>
<p class="muted">Hospital de Plantas · actualizada el ${esc(updated)}</p>
<p>Hospital de Plantas es una app gratuita y sin anuncios para cuidar plantas. Esta página explica qué datos guarda, para qué y cómo borrarlos.</p>

<h2>Qué datos guardamos</h2>
<ul>
<li><b>Cuenta:</b> tu email, tu nombre y, si entras con Google, el identificador de tu cuenta de Google. La contraseña se guarda cifrada (nunca en claro).</li>
<li><b>Tus plantas y cuidados:</b> las plantas que añades, sus macetas y ubicación en casa, los riegos, abonados y trasplantes, las notas y los diagnósticos de salud.</li>
<li><b>Fotos:</b> las que subes de tus plantas, de tus notas y de las revisiones de salud.</li>
<li><b>Ubicación aproximada:</b> solo si la activas, redondeada a unos 1 km, para saber el tiempo de tu zona. No guardamos tu ubicación exacta ni la seguimos en segundo plano.</li>
<li><b>Avisos:</b> un identificador de tu móvil para enviarte notificaciones, si las permites.</li>
</ul>

<h2>Para qué los usamos</h2>
<p>Solo para que la app funcione: calcular el riego y los cuidados, avisarte, mostrar el clima, identificar plantas y diagnosticar problemas. <b>No vendemos tus datos, no mostramos publicidad y no los usamos para perfiles comerciales.</b></p>

<h2>Con quién se comparten</h2>
<p>Con los servicios que hacen funcionar la app, solo con lo necesario para cada tarea:</p>
<ul>
<li><b>Railway</b> (servidor y base de datos) y <b>Cloudflare R2</b> (almacenamiento de fotos).</li>
<li><b>Anthropic (Claude):</b> las fotos y los datos de la planta de una revisión de salud, y el nombre de las especies para escribir sus fichas. Se envían para generar la respuesta, no para entrenar modelos.</li>
<li><b>Pl@ntNet:</b> las fotos que usas para identificar una planta.</li>
<li><b>Open-Meteo:</b> tus coordenadas aproximadas, para el tiempo.</li>
<li><b>Google:</b> si entras con Google. <b>Expo y Firebase Cloud Messaging:</b> para entregar las notificaciones.</li>
<li><b>Las personas de tus jardines compartidos</b> ven tu nombre, las plantas de ese jardín y lo que haces en él.</li>
</ul>

<h2>Cuánto tiempo los guardamos</h2>
<p>Mientras tengas la cuenta. Si borras una planta se borran sus fotos, notas y diagnósticos. Si borras la cuenta se borra todo (mira abajo).</p>

<h2>Tus derechos</h2>
<p>Puedes ver y cambiar tus datos en la app, y borrarlos en cualquier momento. Para acceder, corregir, exportar o borrar tus datos, o para cualquier duda, ${contact(email)}.</p>

<h2>Borrar tu cuenta</h2>
<p>En la app: <b>Perfil → Borrar mi cuenta</b>. Más detalles en <a href="borrar-cuenta">cómo borrar tu cuenta</a>.</p>

<h2>Menores</h2>
<p>La app no está dirigida a menores de 13 años.</p>`,
  );
}

/** Página puente: los enlaces https se pueden pulsar en WhatsApp; desde aquí se abre la app. */
export function invitePage(code: string): string {
  const safe = esc(code);
  const app = `hospitaldeplantas://unirse/${encodeURIComponent(code)}`;
  return page(
    'Invitación a un jardín',
    `<h1>Te han invitado a un jardín 🌿</h1>
<p>Para unirte necesitas la app <b>Hospital de Plantas</b> instalada en el móvil.</p>
<div class="card" style="text-align:center">
<p><a href="${app}" style="display:inline-block;background:#4F6B3A;color:#FBF6EA;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:bold">Abrir la invitación en la app</a></p>
<p class="muted">Si no se abre, entra en la app → <b>Perfil → Unirme con un código</b> y escribe:</p>
<p style="font-size:2em;letter-spacing:4px;color:#34472A;margin:6px 0"><b>${safe}</b></p>
</div>
<p class="muted">La invitación sirve para una persona y caduca a los 7 días.</p>
<script>setTimeout(function(){location.href=${JSON.stringify(app)}},400)</script>`,
  );
}

export function deleteAccountPage(email: string | undefined): string {
  return page(
    'Borrar tu cuenta',
    `<h1>Borrar tu cuenta de Hospital de Plantas</h1>
<div class="card">
<p><b>Desde la app</b> (lo más rápido):</p>
<ol><li>Abre Hospital de Plantas e inicia sesión.</li><li>Ve a la pestaña <b>Perfil</b>.</li><li>Baja del todo y pulsa <b>Borrar mi cuenta</b>.</li><li>Confirma. Se borra al momento.</li></ol>
</div>
<div class="card">
<p><b>Sin la app:</b> ${contact(email)} desde el email de tu cuenta con el asunto «Borrar mi cuenta». La borramos en un máximo de 30 días y te confirmamos por email.</p>
</div>
<h2>Qué se borra</h2>
<ul>
<li>Tu cuenta: email, nombre, contraseña, ubicación, ajustes y sesiones abiertas.</li>
<li>Los jardines en los que eres la única persona, con todas sus plantas, cuidados, notas, diagnósticos y fotos.</li>
<li>Tus notas y sus fotos en jardines compartidos.</li>
</ul>
<h2>Qué se conserva</h2>
<ul>
<li>En jardines compartidos con otras personas, los riegos que hiciste se quedan <b>sin tu nombre</b>, para no estropear el calendario de los demás. Si eras el dueño, el jardín pasa a la persona que lleva más tiempo en él.</li>
</ul>
<p><a href="privacidad">Política de privacidad</a></p>`,
  );
}
