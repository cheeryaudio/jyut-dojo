import { Capacitor } from '@capacitor/core';

const WEB_DEVELOPMENT_API_BASE_URL = 'http://localhost:3251/api';
const NATIVE_API_BASE_URL = 'https://jyut.benbox.dev/api';

export interface RuntimeEnvironment {
  apiBaseUrlOverride?: string;
  isDevelopment: boolean;
  isNative: boolean;
}

export interface RuntimeConfig {
  apiBaseUrl: string;
}

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function resolveApiBaseUrl({
  apiBaseUrlOverride,
  isDevelopment,
  isNative,
}: RuntimeEnvironment): string {
  const override = apiBaseUrlOverride ? normalizeApiBaseUrl(apiBaseUrlOverride) : '';

  if (override) return override;
  if (isNative) return NATIVE_API_BASE_URL;
  if (isDevelopment) return WEB_DEVELOPMENT_API_BASE_URL;
  return '/api';
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    apiBaseUrl: resolveApiBaseUrl({
      apiBaseUrlOverride: import.meta.env.VITE_API_BASE_URL,
      isDevelopment: import.meta.env.DEV,
      isNative: Capacitor.isNativePlatform(),
    }),
  };
}
