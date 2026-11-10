import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Sistema único de notificações do app.
 * - No APK (Android): notificações nativas do sistema via @capacitor/local-notifications.
 * - No navegador (desenvolvimento): Web Notification API, quando permitida.
 * Nenhuma notificação é desenhada dentro do app.
 */

export type NotificationChannelId = 'maintenance' | 'investments';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface NativeNotificationPayload {
  /** Chave de deduplicação: a mesma chave substitui a notificação anterior. */
  tag: string;
  title: string;
  body: string;
  channel: NotificationChannelId;
  /** Aba do app a abrir quando o usuário tocar na notificação. */
  targetTab?: 'maintenance' | 'investments' | 'dashboard';
}

const CHANNELS: Array<{
  id: NotificationChannelId;
  name: string;
  description: string;
  importance: 1 | 2 | 3 | 4 | 5;
}> = [
  {
    id: 'maintenance',
    name: 'Alertas de Manutenção',
    description: 'Avisos de troca de óleo, pneus, relação e demais itens da moto.',
    importance: 4,
  },
  {
    id: 'investments',
    name: 'Investimentos',
    description: 'Depósitos, confirmações de PIX e solicitações de resgate.',
    importance: 5,
  },
];

type TapHandler = (targetTab: string | undefined) => void;

let initialized = false;
let tapHandler: TapHandler | null = null;

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function tagToNotificationId(tag: string): number {
  // Hash FNV-1a de 32 bits reduzido a 31 bits positivos (Android exige int32 > 0).
  let hash = 0x811c9dc5;
  for (let i = 0; i < tag.length; i++) {
    hash ^= tag.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const id = hash & 0x7fffffff;
  return id === 0 ? 1 : id;
}

export function onNotificationTap(handler: TapHandler | null): void {
  tapHandler = handler;
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (isNativePlatform()) {
    try {
      const res = await LocalNotifications.checkPermissions();
      const st = String(res?.display || '').toLowerCase();
      if (st === 'granted') return 'granted';
      if (st === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const p = Notification.permission;
    return p === 'default' ? 'prompt' : (p as NotificationPermissionState);
  }
  return 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      const st = String(res?.display || '').toLowerCase();
      return st === 'granted' ? 'granted' : st === 'denied' ? 'denied' : 'prompt';
    } catch {
      return 'unsupported';
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const p = await Notification.requestPermission();
      return p === 'default' ? 'prompt' : (p as NotificationPermissionState);
    } catch {
      return 'unsupported';
    }
  }
  return 'unsupported';
}

/** Cria os canais Android e registra o listener de toque. Idempotente. */
export async function initNativeNotifications(): Promise<void> {
  if (initialized || !isNativePlatform()) {
    initialized = true;
    return;
  }
  initialized = true;
  try {
    for (const ch of CHANNELS) {
      await LocalNotifications.createChannel({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        importance: ch.importance,
        visibility: 1,
        vibration: true,
        lights: true,
        sound: 'default',
      });
    }
    await LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const target = (event?.notification?.extra as { targetTab?: string } | undefined)?.targetTab;
      tapHandler?.(target);
    });
  } catch (err) {
    console.warn('Aviso ao inicializar canais de notificação:', err);
  }
}

/**
 * Dispara uma notificação nativa. Retorna true se foi entregue ao sistema.
 * Nunca lança erro: falha de notificação não pode quebrar o fluxo do app.
 */
export async function sendNativeNotification(payload: NativeNotificationPayload): Promise<boolean> {
  try {
    if (isNativePlatform()) {
      await initNativeNotifications();
      let perm = await getNotificationPermission();
      if (perm !== 'granted') {
        perm = await requestNotificationPermission();
      }
      if (perm !== 'granted') return false;

      const notifItem: any = {
        id: tagToNotificationId(payload.tag),
        title: payload.title,
        body: payload.body,
        channelId: payload.channel,
        smallIcon: 'ic_stat_notify',
        sound: 'default',
        extra: { targetTab: payload.targetTab },
      };

      try {
        await LocalNotifications.schedule({
          notifications: [notifItem],
        });
        return true;
      } catch (errSchedule) {
        console.warn('Falha com smallIcon customizado, agendando com ícone padrão:', errSchedule);
        delete notifItem.smallIcon;
        await LocalNotifications.schedule({
          notifications: [notifItem],
        });
        return true;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await Notification.requestPermission();
      }
      if (perm === 'granted') {
        const n = new Notification(payload.title, { body: payload.body, tag: payload.tag });
        n.onclick = () => {
          window.focus();
          tapHandler?.(payload.targetTab);
        };
        return true;
      }
    }
  } catch (err) {
    console.error('Falha ao disparar notificação nativa:', err);
  }
  return false;
}
