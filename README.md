# Pill

Application PWA de rappel de pilule : notification push à l'heure choisie, réponse en un geste (« prise » ou « rappelle-moi dans 1 h ») et suivi complet (calendrier, série, régularité, retard moyen). Plusieurs utilisatrices, chacune avec son espace.

## Fonctionnement

- À l'heure de rappel (réglable, dans le fuseau de l'utilisatrice) une notification est envoyée sur tous ses appareils.
- Boutons de la notification : **✅ Prise** et **⏰ Dans X** (durée réglable). Sur iOS, qui n'affiche pas ces boutons, un tap ouvre l'app avec les mêmes choix.
- Sans réponse, relance automatique toutes les N minutes (réglable, désactivable, 6 notifications max par jour).
- L'historique permet de régulariser un oubli (60 jours max) ou d'annuler une prise saisie par erreur. Une prise après plus de 3 h de retard est signalée en orange.

## Déploiement (pill.beziau.dev)

```bash
cp .env.example .env
openssl rand -hex 32          # → SESSION_SECRET
npm install && npm run vapid  # → VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (à conserver)
docker compose up -d --build
```

Dans Nginx Proxy Manager : `pill.beziau.dev` → hôte `pill`, port `3000`, SSL actif (le push exige HTTPS). Le conteneur rejoint le réseau externe `public`. La base SQLite est dans `./data`.

Après avoir créé les comptes, passer `REGISTRATION_ENABLED=false` dans `.env` puis `docker compose up -d` pour fermer les inscriptions.

iPhone : les notifications ne fonctionnent qu'une fois l'app ajoutée à l'écran d'accueil (iOS 16.4+).

## Développement

```bash
cp .env.example .env   # puis renseigner les clés
npm install
npx prisma migrate dev
npm run dev            # http://localhost:3000
npm test && npx tsc --noEmit && npx eslint
```

Le push fonctionne sur `localhost` (contexte sécurisé).
