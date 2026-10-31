# Hockey Dynasty — état de la base de données

Saison cible : **2026–2027**. Ce dépôt contient l’application et les instantanés de données utilisés par le jeu.

## Couverture observée au 31 octobre 2026

- **LNH :** 32/32 fichiers d’effectifs valides, environ 801 joueurs au dernier audit.
- **LAH :** 32/32 fichiers d’effectifs synchronisés; le dernier audit comptait 806 entrées de joueurs dans les fichiers. Les totaux peuvent varier après nettoyage des doublons et corrections de parsing.
- **Registre central :** 2 320 fiches générées à partir des effectifs LNH, LAH et listes d’espoirs. Ce nombre ne signifie pas que toutes les fiches sont complètes ni qu’elles sont toutes des personnes uniques confirmées.
- **Espoirs :** 32/32 fichiers non vides, 756 entrées au dernier audit. Detroit, Utah et Vancouver ont des listes locales conservées parce que l’API publique NHL ne fournit pas de réponse exploitable; ces listes doivent encore être vérifiées individuellement.
- **Contrats :** 799/801 joueurs LNH appariés à un dossier contractuel dans le jeu de données CC0; 482/801 ont une ligne salariale/cap hit 2026–2027 exploitable. Les autres valeurs restent « À vérifier » au lieu d’être inventées.
- **Entraîneurs LNH :** 32 équipes et 158 fiches dans la base initiale. Les fonctions exactes, les adjoints et les changements en cours de saison doivent être revérifiés; le personnel LAH reste à compléter.
- **Choix de repêchage :** la base des actifs et propriétaires 2027–2029 n’est **pas encore créée**. Les faux choix de démonstration ont été retirés; le registre réel, les conditions et les échanges restent un chantier bloquant.

## Synchronisation et audit

- `scripts/sync-nhl-data.mjs` — effectifs LNH et listes d’espoirs accessibles par l’API NHL; conserve une liste locale valide lorsqu’une réponse d’espoirs est vide.
- `scripts/sync-ahl-data.mjs` — affiliations et effectifs LAH.
- `scripts/build-player-registry.mjs` — registre central; importe les cotes uniquement lorsqu’un identifiant correspond.
- `scripts/sync-contracts.mjs` — contrats, salaires par saison et clauses à partir de [ehlersio/nhl-contracts](https://github.com/ehlersio/nhl-contracts), sous licence CC0-1.0.
- `scripts/validate-database.mjs` — audit de couverture; il échoue volontairement tant que des domaines requis, dont les choix de repêchage, restent absents.

## Principes de données

- Aucun droit LNH n’est déduit uniquement de l’affiliation LAH.
- Les cotes issues de `data/ratings.json` sont des estimations ajustées à partir des données de performance, pas des rapports de dépistage; le potentiel reste inconnu lorsqu’il n’existe pas de source vérifiée.
- Les salaires, contrats, conditions de choix, propriétaires de choix et cotes non confirmés ne sont pas fabriqués.
- La synchronisation peut publier les données disponibles même si l’audit final échoue. Un audit rouge indique qu’il reste des données à compléter; une publication réussie ne signifie donc pas que le jeu est complet.
