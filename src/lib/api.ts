import { Capacitor } from '@capacitor/core';

/**
 * Base URL for the sync + events API.
 *
 * In a browser deployment the API is served same-origin under `/api`. In dev
 * (Vite) or when running natively inside Capacitor there is no co-located
 * server, so we point at the hosted instance.
 */
export function apiBase(): string {
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform() && !import.meta.env.DEV) {
    return `${window.location.origin}/api`;
  }
  return 'https://jyut.benbox.dev/api';
}
