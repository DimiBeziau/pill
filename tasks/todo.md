# pill — état

## Fait
- [x] Socle Next 16 + Prisma/SQLite + Docker (réseau `public`, pill.beziau.dev)
- [x] Comptes multi-utilisatrices (e-mail/mot de passe, cookie JWT, anti brute-force)
- [x] Notifications push (VAPID) + service worker avec actions Prise / Rappeler plus tard
- [x] Planificateur (heure perso, report, relances, plafond journalier)
- [x] Suivi : écran du jour, calendrier mensuel, série, régularité, retard moyen, régularisation d'oublis
- [x] Tests (temps, stats, rappels/prises) + build Docker vérifié

## À faire / idées
- [ ] Déploiement prod : créer `.env`, host NPM, tester un push réel sur mobile
- [ ] Pause de la pilule (arrêt 7 jours) si besoin
- [ ] Export CSV de l'historique
