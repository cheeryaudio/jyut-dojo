/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected by vite.config.ts from package.json at build time. */
declare const __APP_VERSION__: string;
/** Build date (YYYY-MM-DD), or BUILD_STAMP when set. */
declare const __BUILD_STAMP__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
