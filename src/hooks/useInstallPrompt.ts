/**
 * Captures the browser's `beforeinstallprompt` event so we can show our own
 * custom install UI instead of the default browser mini-infobar.
 *
 * Returns:
 *  - `canInstall`   — true when the browser has an installable prompt ready
 *  - `isInstalled`  — true when already running as a standalone PWA
 *  - `isIOS`        — true on iOS Safari (needs manual "Add to Home Screen")
 *  - `prompt()`     — call this to show the native install dialog
 *  - `dismiss()`    — records "later" so we don't pester for 7 days
 *  - `shouldShow`   — false if already installed, dismissed recently, or iOS
 *                     (iOS gets its own instructional UI inside the modal)
 */
import { useEffect, useState, useCallback } from 'react';

const DISMISS_KEY = 'pwa-install-dismissed-until';
const SNOOZE_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isDismissedRecently(): boolean {
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
}

function isIOSDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone);
  const [canInstall, setCanInstall] = useState(false);
  const isIOS = isIOSDevice();

  useEffect(() => {
    if (isInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Track when the app gets installed via the prompt
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled]);

  const prompt = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setCanInstall(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setCanInstall(false);
  }, []);

  const shouldShow =
    !isInstalled &&
    !isDismissedRecently() &&
    (canInstall || isIOS);

  return { canInstall, isInstalled, isIOS, shouldShow, prompt, dismiss };
}
