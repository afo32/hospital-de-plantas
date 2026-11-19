import type { Reminders } from '@hdp/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { remindersSchema } from '@hdp/shared';
import { api } from './api';

/**
 * Avisos LOCALES: el móvil los programa con antelación a partir de las tareas de los próximos 14 días
 * y de la previsión del tiempo. No necesitan Firebase ni servidor de push.
 * Se reprograman cada vez que abres el jardín, marcas una tarea o cambias los ajustes.
 */

const CHANNEL_TASKS = 'tareas';
const CHANNEL_WEATHER = 'clima';
/** Canal de los avisos push del jardín compartido (el servidor lo indica en cada aviso). */
const CHANNEL_GARDEN = 'jardin';
const ALERT_HOUR = 18;

let configured = false;

function configure() {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL_TASKS, {
      name: 'Riego y cuidados',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#4F6B3A',
    });
    void Notifications.setNotificationChannelAsync(CHANNEL_WEATHER, {
      name: 'Alertas de clima',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#9C3D2E',
    });
    void Notifications.setNotificationChannelAsync(CHANNEL_GARDEN, {
      name: 'Tu jardín compartido',
      description: 'Cuando alguien riega, añade una planta o revisa su salud',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#B8893B',
    });
  }
}

/** Pide permiso si aún no se ha pedido. Devuelve true si se pueden mostrar avisos. */
export async function ensureNotificationPermission(ask = true): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  configure();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const list = (names: string[]) =>
  names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} y ${names.length - 3} más`;

function at(day: string, hour: number): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d!, hour, 0, 0);
}

/** Construye los avisos a partir de los recordatorios del servidor. */
export function buildNotifications(r: Reminders, now = new Date()) {
  const out: { date: Date; title: string; body: string; channelId: string }[] = [];
  for (const d of r.days) {
    const lines: string[] = [];
    if (r.notifyWater && d.water.length) lines.push(`Regar: ${list(d.water)}`);
    if (r.notifyCare && d.fertilize.length) lines.push(`Abonar: ${list(d.fertilize)}`);
    if (r.notifyCare && d.repot.length) lines.push(`Trasplantar: ${list(d.repot)}`);
    if (r.notifyCare && d.checkup.length) lines.push(`Revisar su salud: ${list(d.checkup)}`);
    if (!lines.length) continue;
    const date = at(d.day, r.reminderHour);
    if (date <= now) continue;
    const total = d.water.length + d.fertilize.length + d.repot.length + d.checkup.length;
    out.push({
      date,
      title:
        d.water.length && r.notifyWater
          ? `🌿 Hoy toca regar ${d.water.length === 1 ? d.water[0] : `${d.water.length} plantas`}`
          : `🌿 ${total === 1 ? 'Una tarea' : `${total} tareas`} en tu jardín`,
      body: lines.join('\n'),
      channelId: CHANNEL_TASKS,
    });
  }
  if (r.notifyWeather) {
    for (const a of r.alerts) {
      const date = at(a.day, ALERT_HOUR);
      if (date > now) out.push({ date, title: `❄️ ${a.title}`, body: a.body, channelId: CHANNEL_WEATHER });
    }
  }
  return out;
}

/**
 * Borra los avisos programados y vuelve a programarlos con los datos actuales de TODOS tus jardines.
 * Se llama al abrir el jardín, al marcar tareas y cuando llega un aviso de que alguien regó.
 */
export async function syncReminders(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  if (!(await ensureNotificationPermission(false))) return 0;
  const reminders = remindersSchema.parse(await api('/me/reminders'));
  await Notifications.cancelAllScheduledNotificationsAsync();
  const items = buildNotifications(reminders);
  for (const n of items) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { url: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: n.channelId },
    });
  }
  return items.length;
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
