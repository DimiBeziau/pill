# pill

Rappel quotidien de pilule (PWA, notifications push) avec suivi des prises. Multi-utilisatrices, chaque espace est isolé. UI en français.

- Next 16 (App Router) + Prisma 7 / SQLite (`better-sqlite3`). `proxy.ts` = ancien middleware (auth par cookie JWT `session`).
- Les routes `/api/*` vérifient elles-mêmes la session (401, pas de redirection) : le service worker les appelle depuis les boutons des notifications.
- Planificateur : `instrumentation.ts` → `lib/scheduler.ts`, une passe par minute dans le process Next (un seul conteneur, pas de cron externe). Logique pure et testée : `tick()`.
- Un jour = une ligne `Intake` (date locale `YYYY-MM-DD` dans le fuseau de l'utilisatrice). Pas de ligne pour un jour passé = oubli.
- Push : `web-push` + clés VAPID (`npm run vapid`, à conserver sinon tous les abonnements sont invalidés). `public/sw.js` gère `push` et `notificationclick` (actions Prise / Rappeler plus tard).
- Prod : `docker compose up -d --build`, réseau externe `public`, hôte NPM `pill:3000` → pill.beziau.dev (HTTPS obligatoire pour le push).
- Vérifs : `npx tsc --noEmit`, `npm test`, `npx eslint`, `npm run build`.
- Tailwind v4 : pas de `@apply` sur une classe maison, utiliser `@utility`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
