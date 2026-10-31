# Hockey Dynasty — état de la base de données

Saison cible : **2026–2027**. Ce dépôt contient l’application et les instantanés de données utilisés par le jeu.

## Couverture vérifiée au 30 octobre 2026

- **LNH :** 32/32 fichiers d’effectifs, 801 joueurs.
- **LAH :** 32/32 fichiers d’effectifs, 934 joueurs. Les clubs-écoles sont sélectionnables dans l’application.
- **Registre central :** 2 210 fiches uniques construites à partir des instantanés LNH, LAH et espoirs.
- **Espoirs :** 29/32 fichiers de listes non vides; les sources LNH publiques ne retournent pas de liste exploitable pour DET, UTA et VAN.
- **Contrats :** 799/801 joueurs LNH appariés à un dossier contractuel dans le jeu de données CC0; 482/801 ont une ligne salariale/cap hit 2026–2027 exploitable. Les autres valeurs restent « À vérifier » au lieu d’être inventées.
- **Entraîneurs LNH :** 32 équipes, 158 fiches initiales. Les rôles et les changements en cours de saison doivent être revérifiés avant la version finale.
- **Choix de repêchage :** la base des propriétaires et conditions 2027–2029 reste à importer. Les faux choix de démonstration ont été retirés de l’application.

## Scripts de synchronisation

- `scripts/sync-nhl-data.mjs` — effectifs LNH et listes d’espoirs accessibles par l’API NHL.
- `scripts/sync-ahl-data.mjs` — affiliations et effectifs LAH.
- `scripts/build-player-registry.mjs` — registre central, avec les cotes importées uniquement quand l’identifiant correspond.
- `scripts/sync-contracts.mjs` — contrats, salaires par saison et clauses à partir de [ehlersio/nhl-contracts](https://github.com/ehlersio/nhl-contracts), sous licence CC0-1.0.
- `scripts/validate-database.mjs` — audit de couverture; il échoue volontairement si des domaines requis restent absents.

## Principes de données

- Aucun droit LNH n’est déduit uniquement de l’affiliation LAH.
- Les cotes issues de `data/ratings.json` sont des estimations ajustées à partir des données de performance, pas des rapports de dépistage; le potentiel reste inconnu lorsqu’il n’existe pas de source vérifiée.
- Les salaires, contrats, conditions de choix et cotes non confirmés ne sont pas fabriqués.
- La synchronisation peut publier les données disponibles même si l’audit final échoue; un audit rouge indique qu’il reste des données à compléter.
