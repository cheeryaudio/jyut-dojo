import { getRuntimeConfig } from '../config/runtime';

/** Base URL for the optional sync and events API. */
export function apiBase(): string {
  return getRuntimeConfig().apiBaseUrl;
}
