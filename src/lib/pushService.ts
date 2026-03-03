/**
 * pushService — manages Web Push subscriptions on the client side.
 *
 * Flow:
 * 1. When notifications are enabled, call `subscribeToPush(slots, settings)`.
 * 2. This registers a PushManager subscription using the VAPID public key.
 * 3. The subscription (endpoint + keys) is upserted into `push_subscriptions`
 *    in Supabase so the Edge Function can deliver notifications server-side.
 * 4. When settings change (different slots, minutesBefore), call
 *    `updatePushSchedule(slots, settings)` to keep the server in sync.
 * 5. When notifications are disabled, call `unsubscribeFromPush()`.
 */

import { supabase } from './supabase';
import type { SlotDefinition, NotificationSettings } from '../types';

const VAPID_PUBLIC_KEY = import.meta.env['VITE_VAPID_PUBLIC_KEY'] as string | undefined;

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function getOrCreateSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null;
  const reg = await getRegistration();
  if (!reg) return null;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });
  }
  return sub;
}

function slotSnapshot(slots: SlotDefinition[]) {
  return slots.map((s) => ({ id: s.id, time: s.time, label: s.label, doText: s.doText }));
}

/** Subscribe this device to Web Push and save the subscription to Supabase. */
export async function subscribeToPush(
  userId: string | null,
  slots: SlotDefinition[],
  settings: NotificationSettings
): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const sub = await getOrCreateSubscription();
    if (!sub) return false;

    const keys = sub.toJSON().keys as { p256dh: string; auth: string };
    const row = {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
      timezone: getUserTimezone(),
      minutes_before: settings.minutesBefore,
      enabled_slots: slotSnapshot(slots),
    };

    if (!supabase) return false;
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });

    if (error) {
      console.warn('[Push] subscribe upsert failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Push] subscribeToPush error:', e);
    return false;
  }
}

/** Update the schedule snapshot stored server-side (call after settings change). */
export async function updatePushSchedule(
  slots: SlotDefinition[],
  settings: NotificationSettings
): Promise<void> {
  if (!isPushSupported() || !supabase) return;
  try {
    const reg = await getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;

    await supabase
      .from('push_subscriptions')
      .update({
        minutes_before: settings.minutesBefore,
        enabled_slots: slotSnapshot(slots),
      })
      .eq('endpoint', sub.endpoint);
  } catch (e) {
    console.warn('[Push] updatePushSchedule error:', e);
  }
}

/** Remove the push subscription from the browser and from Supabase. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported() || !supabase) return;
  try {
    const reg = await getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;

    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch (e) {
    console.warn('[Push] unsubscribeFromPush error:', e);
  }
}
