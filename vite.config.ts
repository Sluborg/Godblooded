import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

function shortCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

// Every deploy gets a god's name, A to Z and round again, so Stefan can see which build runs.
const RELEASE_NAMES = [
  'Anubis',
  'Baldr',
  'Cronus',
  'Demeter',
  'Eos',
  'Freyja',
  'Geb',
  'Hermes',
  'Isis',
  'Jord',
  'Khonsu',
  'Loki',
  'Maat',
  'Nut',
  'Odin',
  'Ptah',
  'Quirinus',
  'Ra',
  'Set',
  'Thor',
  'Ullr',
  'Vidar',
  'Wadjet',
  'Xanthus',
  'Ymir',
  'Zeus',
];

function releaseName(): string {
  const run = Number(process.env.GITHUB_RUN_NUMBER);
  if (!Number.isFinite(run) || run <= 0) return 'Local';
  return RELEASE_NAMES[(run - 1) % RELEASE_NAMES.length];
}

// BASE_PATH is set by the deploy workflow from GITHUB_REPOSITORY, e.g. "/Godblooded/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${shortCommit()}`),
    __APP_NAME__: JSON.stringify(releaseName()),
  },
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Godblooded',
        short_name: 'Godblooded',
        description: 'Build a town, hire Godbloods, watch them fight.',
        theme_color: '#8a1c2b',
        background_color: '#1a1410',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        lang: 'en',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,png,webp,mp3,ogg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
