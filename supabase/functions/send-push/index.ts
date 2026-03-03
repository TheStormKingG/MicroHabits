/**
 * send-push — Supabase Edge Function
 *
 * Runs every minute via pg_cron.  For each push subscription it checks whether
 * any habit slot notification is due right now (within a ±30-second window),
 * and if so fires a Web Push notification to the device.
 *
 * Invoke URL (for manual testing):
 *   POST https://zjitygdluivlhzbhhtfn.supabase.co/functions/v1/send-push
 *
 * Environment variables required (set in Supabase dashboard → Settings → Edge Functions):
 *   VAPID_PUBLIC_KEY  — BNv7BEoQ...
 *   VAPID_PRIVATE_KEY — UQCL8WBu...
 *   VAPID_EMAIL       — mailto:you@example.com
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@microhabits.app';

// ─── VAPID JWT ────────────────────────────────────────────────────────────────

function base64UrlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function makeVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_EMAIL };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signing = `${headerB64}.${payloadB64}`;

  const keyData = base64UrlDecode(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    // Web Push VAPID private keys are raw 32-byte EC scalars — wrap in PKCS#8 DER
    buildPkcs8(keyData),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signing)
  );
  return `${signing}.${base64UrlEncode(sig)}`;
}

/** Wrap a raw 32-byte EC private key scalar in minimal PKCS#8 DER for SubtleCrypto */
function buildPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS#8 header for P-256 private key (ASN.1 DER)
  const oidHeader = new Uint8Array([
    0x30, 0x41,               // SEQUENCE (65 bytes)
    0x02, 0x01, 0x00,         // INTEGER version = 0
    0x30, 0x13,               // SEQUENCE (19 bytes) — AlgorithmIdentifier
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
    0x04, 0x27,               // OCTET STRING (39 bytes) — privateKey
    0x30, 0x25,               // SEQUENCE (37 bytes)
    0x02, 0x01, 0x01,         // INTEGER version = 1
    0x04, 0x20,               // OCTET STRING (32 bytes) — private key scalar
  ]);
  const result = new Uint8Array(oidHeader.length + rawKey.length);
  result.set(oidHeader);
  result.set(rawKey, oidHeader.length);
  return result.buffer;
}

// ─── Web Push ─────────────────────────────────────────────────────────────────

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: { title: string; body: string; tag: string; url: string }
): Promise<boolean> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  let jwt: string;
  try {
    jwt = await makeVapidJwt(audience);
  } catch (e) {
    console.error('JWT generation failed:', e);
    return false;
  }

  const body = JSON.stringify(payload);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'TTL': '86400',
    },
    body,
  });

  if (!res.ok) {
    console.warn(`Push failed (${res.status}) for endpoint: ${subscription.endpoint.slice(0, 60)}`);
  }
  return res.ok;
}

// ─── Time helpers ──────────────────────────────────────────────────────────────

/** Returns minutes since midnight in the given timezone */
function minutesSinceMidnight(timezone: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

/** Convert "HH:mm" to total minutes */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('*');

  if (error) {
    console.error('Failed to fetch subscriptions:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions' }));
  }

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subs) {
    const nowMin = minutesSinceMidnight(sub.timezone ?? 'UTC');
    const slots = (sub.enabled_slots ?? []) as Array<{ id: string; time: string; label: string; doText: string }>;
    const minutesBefore: number = sub.minutes_before ?? 5;

    for (const slot of slots) {
      const notifyAt = timeToMinutes(slot.time) - minutesBefore;
      // Fire if within ±1 minute of scheduled time
      if (Math.abs(nowMin - notifyAt) <= 1) {
        const ok = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth_key: sub.auth_key },
          {
            title: `⏰ ${slot.label}`,
            body: `Time to: ${slot.doText}`,
            tag: `habit-${slot.id}`,
            url: '/MicroHabits/',
          }
        );
        if (ok) sent++;
        // If 410 Gone, mark for cleanup
        else staleEndpoints.push(sub.endpoint);
      }
    }
  }

  // Remove dead subscriptions
  if (staleEndpoints.length) {
    await db
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  return new Response(JSON.stringify({ sent, total: subs.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
