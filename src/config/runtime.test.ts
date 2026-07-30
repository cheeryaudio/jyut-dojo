import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './runtime';

describe('resolveApiBaseUrl', () => {
  it('uses an explicit override in every runtime', () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrlOverride: ' https://api.example.com/custom/ ',
        isDevelopment: true,
        isNative: true,
      }),
    ).toBe('https://api.example.com/custom');
  });

  it('uses the hosted API for native builds', () => {
    expect(resolveApiBaseUrl({ isDevelopment: false, isNative: true })).toBe(
      'https://jyut.benbox.dev/api',
    );
  });

  it('uses the local API for web development', () => {
    expect(resolveApiBaseUrl({ isDevelopment: true, isNative: false })).toBe(
      'http://localhost:3251/api',
    );
  });

  it('uses the same-origin API path for production web builds', () => {
    expect(resolveApiBaseUrl({ isDevelopment: false, isNative: false })).toBe('/api');
  });

  it('ignores an empty override', () => {
    expect(
      resolveApiBaseUrl({ apiBaseUrlOverride: '   ', isDevelopment: true, isNative: false }),
    ).toBe('http://localhost:3251/api');
  });
});
