# di_web — AI Development Guide

> **Git policy — never auto-commit or auto-push.** Leave work in the working tree.
> Run `git commit`, `git push`, or `gh pr create` **only when the user explicitly asks
> in that turn**. Approval for an earlier change does not carry forward, and finishing a
> task is not permission to commit it. Stay on the current branch (no feature branches).

## What it is

`@sudobility/di_web` — a TypeScript library of web implementations of the DI service
interfaces in `@sudobility/di`, using browser APIs + React. Also ships a shared service
worker and a Vite plugin for it.

- ESM only (`"type": "module"`); entry `dist/index.js`, types `dist/index.d.ts`.
- Second export path: `@sudobility/di_web/vite` → the service worker plugin.
- Package manager: **Bun**. React 18/19 peer. TypeScript 6.x. Vitest + jsdom.
- License BUSL-1.1.

## Commands (verified against package.json)

```bash
bun install            # needs GitHub Packages auth — see Gotchas
bun run build          # tsc, then cp src/sw/*.js -> dist/sw/ (the .js workers are NOT compiled)
bun run build:watch
bun run typecheck      # tsc --noEmit
bun run test:unit      # Vitest run (there is NO `test` script — use test:unit)
bun run test:watch
bun run test:coverage  # V8 coverage, 80% global thresholds
bun run lint           # eslint src (flat config)
bun run lint:fix
bun run format         # prettier
```

`prepublishOnly` runs clean + test:unit + build. CI (`.github/workflows/ci-cd.yml`)
delegates to the shared `johnqh/workflows` reusable workflow and publishes to GitHub
Packages (`publish-target: github`).

## Layout

```
src/
├── index.ts            # Public API barrel; also re-exports Firebase from @sudobility/di/web
├── info/               # WebInfoService + InfoBanner/useInfoBanner (toast banner)
├── alert/              # WebAlertService + AlertModal/useAlertModal (modal confirm dialog)
├── initialize/         # initializeWebApp() orchestrator + WebAppInitOptions
└── sw/                 # register.ts, vite-plugin-service-worker.ts, sw.js, firebase-messaging-sw.js
tests/                  # index.test.ts, initialize.test.ts, sw-register.test.ts, vite-plugin.test.ts
```

## Architecture

### Singleton + observable pattern (every service)
Each service module (`info`, `alert`) exposes the same quartet:
- `create*Service()` — bare constructor.
- `initialize*Service(instance?)` — sets a module-scoped singleton **once** (second call
  is a no-op) AND cross-registers the instance with `@sudobility/di` so `get*Service()`
  works from either package.
- `get*Service()` — returns the singleton or **throws** if not initialized.
- `reset*Service()` — nullifies the singleton (tests only).

Services hold a `Set<Listener>` and expose `subscribe(listener): () => void`. `subscribe`
immediately invokes the listener with current state and returns an unsubscribe fn. React
hooks (`useInfoBanner`, `useAlertModal`) wire this into `useState`/`useEffect`.

### initializeWebApp (`src/initialize/initialize.ts`)
Async; initializes core services **in this order** and returns the analytics service:
1. storage  2. Firebase DI service  3. Firebase Analytics  4. network  5. info
Then optional callbacks: `initializeI18n`, `registerServiceWorker` (`true` → dynamic-import
the shared `registerServiceWorker()`; or a custom `() => void`), `initWebVitals`.

`WebAppInitOptions`: required `firebaseConfig`; optional `firebaseInitOptions`,
`initializeI18n`, `registerServiceWorker`, `initWebVitals`.

**NOT handled here** (do not add — the code deliberately omits them): RevenueCat /
subscriptions, Firebase Auth, the alert service. There is no `revenueCatConfig` option and
no `RevenueCatConfig` type in this package.

### Service worker (`src/sw/`)
`sw.js` is a hand-written plain-JS worker (copied, never compiled). Strategies:

| Strategy | For | Cache | TTL | Limit |
|----------|-----|-------|-----|-------|
| Cache First | JS/CSS/fonts/static | `sudobility-static-v1` | 7 d | 100 |
| Cache First | images | `sudobility-images-v1` | 30 d | 30 |
| Network First | HTML / default | `sudobility-dynamic-v1` | 1 d | 50 |
| Stale While Revalidate | `/locales/*` | `sudobility-dynamic-v1` | 1 d | 50 |

`register.ts`: `registerServiceWorker(opts?)` is a **no-op unless production**
(`import.meta.env.PROD`, override with `forceEnable`); guards unsupported/insecure contexts;
retries with exponential backoff; 24h update interval. `unregisterServiceWorker()` returns a
`Promise<boolean>`.

`vite-plugin-service-worker.ts`: `serviceWorkerPlugin({ includeFirebaseMessaging? })` emits
the worker(s) into the build (`generateBundle`) and serves them in dev (`configureServer`).
It intentionally avoids importing `vite` types (uses structural inline types) to dodge dup-
version conflicts in consuming apps. The firebase messaging worker's `process.env.VITE_*`
and `__FIREBASE_SDK_VERSION__` placeholders are substituted at build time.

## Dependencies

Peers (all required except vite): `@sudobility/di` ^1.5.85, `@sudobility/types` ^1.9.78,
`@sudobility/components` ^5.3.64 (provides `<Banner>`), `react` ^18||^19, `vite` (optional,
5/6/7). Subpath imports used internally: `@sudobility/di/web`, `/info`, `/interfaces`.

## Conventions

- TS strict mode with every strict/extra check on (`exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`, etc.). Target ES2020, `moduleResolution: bundler`.
- `exactOptionalPropertyTypes` is on: only assign an optional field when the value is
  defined (see how `show()` conditionally sets `duration`). Don't set `foo: undefined`.
- ESLint flat config (`eslint.config.js`); `src/sw/*.js` are ignored. `_`-prefixed vars and
  all function args are exempt from no-unused-vars. `no-explicit-any` is a warning.
- Adding a service: create `src/<name>/<name>.web.ts` implementing the `@sudobility/di`
  interface, follow the singleton+observable quartet, add a React hook/component, barrel-
  export from `src/<name>/index.ts` and `src/index.ts`, add tests, then
  `bun run typecheck && bun run test:unit && bun run build`.

## Gotchas

- **`bun install` needs GitHub Packages auth.** `.npmrc` points `@sudobility` at
  `npm.pkg.github.com`; a token with `read:packages` (env `GH_PACKAGES_READ_TOKEN`) must be
  available or install fails. `node_modules/` is not checked in.
- **No `test` script** — use `test:unit` / `test:watch` / `test:coverage`.
- **Service worker `.js` files are copied, not compiled.** Edits to `src/sw/sw.js` /
  `firebase-messaging-sw.js` only reach `dist/` via the `cp` step in `build`; they are
  excluded from tsc and ESLint. Keep them plain browser JS (no TS, no bundler-only syntax).
- `MIGRATION.md` is historical (extraction from mail_box) and lists peers/issues that no
  longer match this package — don't treat it as current.
