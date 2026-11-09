# @sudobility/di_web

Web-specific implementations of dependency injection services for Sudobility applications. Implements interfaces from `@sudobility/di` using browser APIs and React, plus a shared service worker with a Vite plugin.

This is an ESM-only TypeScript library (`"type": "module"`). It is published to **GitHub Packages** under the `@sudobility` scope, not the public npm registry.

## Installation

The `@sudobility/*` packages live on GitHub Packages. Configure the scope registry once (e.g. in a project `.npmrc`) and authenticate with a GitHub token that has `read:packages`:

```
@sudobility:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_READ_TOKEN}
```

Then install the package and its peer dependencies:

```bash
bun install @sudobility/di_web @sudobility/di @sudobility/types @sudobility/components
```

Optional peer dependency for the service worker Vite plugin:

```bash
bun install vite  # Vite 5, 6, or 7
```

## Usage

### App Initialization

`initializeWebApp` sets up the core DI services in order: storage, Firebase, Firebase Analytics, network, and info. i18n, service-worker registration, and web-vitals are optional callbacks. (RevenueCat/subscriptions and Firebase Auth are intentionally NOT initialized here — each app wires those separately.)

```typescript
import { initializeWebApp } from '@sudobility/di_web';

const analytics = await initializeWebApp({
  firebaseConfig: { apiKey: '...', projectId: '...' },
  // firebaseInitOptions: { ... },      // optional: toggle analytics/messaging
  // initializeI18n: () => { ... },     // optional
  registerServiceWorker: true,          // optional: true | custom () => void
  // initWebVitals: () => { ... },      // optional
});
```

### Info Banner (Toast Notifications)

```typescript
import { getInfoService, InfoBanner } from '@sudobility/di_web';
import { InfoType } from '@sudobility/types';

// Show notifications from anywhere
getInfoService().show('Saved', 'Changes saved successfully', InfoType.SUCCESS);
getInfoService().show('Error', 'Something went wrong', InfoType.ERROR, 10000);

// Render once in app root
function App() {
  return (<><AppContent /><InfoBanner /></>);
}
```

Auto-dismiss defaults to 5000 ms; pass `0` as the interval to disable it.

### Alert Modal (Confirmation Dialogs)

The web has no built-in modal confirmation, so `WebAlertService` manages modal state and renders through the `<AlertModal />` component (mirrors the React Native `AlertInterface`).

```typescript
import { initializeAlertService, AlertModal, getAlertService } from '@sudobility/di_web';

// Initialize once and render <AlertModal /> at the app root
initializeAlertService();

function App() {
  return (<><AppContent /><AlertModal /></>);
}

// Anywhere
getAlertService().alert('Delete?', 'This cannot be undone.', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'OK', onPress: () => doThing() },
]);
```

With no buttons provided, a single "OK" button is shown.

### Service Worker (Vite Plugin)

```typescript
// vite.config.ts
import { serviceWorkerPlugin } from '@sudobility/di_web/vite';

export default {
  plugins: [
    serviceWorkerPlugin({ includeFirebaseMessaging: true }),
  ],
};
```

The plugin emits `sw.js` (and optionally `firebase-messaging-sw.js`) into the build output and serves them from the dev server. Caching strategies: Cache First (static assets, images), Network First (HTML), Stale While Revalidate (locale files under `/locales/`).

For production without Vite, call `registerServiceWorker()` directly (no-op outside production unless `forceEnable: true`).

## Public API

| Export | Purpose |
|--------|---------|
| `initializeWebApp` | Orchestrator for all core DI service initialization |
| `WebInfoService` / `InfoBanner` / `useInfoBanner` | Observable banner/toast notifications with auto-dismiss |
| `WebAlertService` / `AlertModal` / `useAlertModal` | Observable modal confirmation dialog |
| `registerServiceWorker` / `unregisterServiceWorker` | Service worker lifecycle helpers (`@sudobility/di_web`) |
| `serviceWorkerPlugin` | Vite plugin, exported from `@sudobility/di_web/vite` |
| Firebase re-exports | `getFirebaseService`, `initializeFirebaseService`, analytics, and FCM types re-exported from `@sudobility/di/web` for convenience |

Each service follows a singleton + observable pattern: `initialize*Service()`, `get*Service()`, `reset*Service()` (testing), and `subscribe(listener)`. Initializing also cross-registers the instance with `@sudobility/di`, so `getInfoService()` / `getAlertService()` resolve from either package.

## Development

```bash
bun install
bun run build          # Compile (tsc) + copy sw.js & firebase-messaging-sw.js to dist/sw/
bun run build:watch    # Watch mode
bun run typecheck      # TypeScript check (tsc --noEmit)
bun run test:unit      # Run tests once (Vitest, jsdom)
bun run test:watch     # Watch mode
bun run test:coverage  # With V8 coverage report (80% thresholds)
bun run lint           # ESLint
bun run lint:fix       # ESLint auto-fix
bun run format         # Prettier
```

Tests live in `tests/` (Vitest with the jsdom environment). Source is under `src/` with one directory per service (`info/`, `alert/`, `initialize/`, `sw/`).

## License

BUSL-1.1
