# Hockey Dynasty — état de la base de données

Saison cible : **2026–2027**. Ce dépôt contient l’application et les instantanés de données utilisés par le jeu.

## Couverture observée au 31 octobre 2026

- **LNH :** 32/32 fichiers d’effectifs valides, environ 801 joueurs au dernier audit.
- **LAH :** 32/32 fichiers d’effectifs synchronisés; le dernier audit comptait 806 entrées de joueurs dans les fichiers. Les totaux peuvent varier après nettoyage des doublons et corrections de parsing.
- **Registre central :** 2 361 fiches générées à partir des effectifs LNH, LAH et listes d’espoirs; le dernier enrichissement par correspondance de nom unique a ramené les fiches à ligue inconnue de 603 à 346. Les identités nom + date de naissance sont aussi contrôlées pour éviter les doublons entre listes. Ce nombre ne signifie pas que toutes les fiches sont complètes ni qu’elles sont toutes des personnes uniques confirmées.
- **Espoirs :** 32/32 fichiers non vides, 889 entrées au dernier audit après fusion de suppléments secondaires pour Buffalo, Los Angeles, les Islanders et Toronto. Les suppléments ont des dates de capture distinctes et exigent une revérification des droits. Detroit, Utah et Vancouver conservent aussi des listes locales parce que l’API publique NHL ne fournit pas de réponse exploitable.
- **Contrats :** 799/801 joueurs LNH appariés à un dossier contractuel dans le jeu de données CC0; 482/801 ont une ligne salariale/cap hit 2026–2027 exploitable. Les autres valeurs restent « À vérifier » au lieu d’être inventées.
- **Entraîneurs LNH :** 32 équipes et 158 fiches dans la base initiale. **Personnel LAH ajouté :** 32 équipes et 159 fiches dans `data/coaches/ahl-2026-2027.json`. Les fonctions exactes et les changements en cours de saison doivent encore être revérifiés; l’audit contrôle maintenant les entraîneurs-chefs et les adjoints dans les deux ligues.
- **Choix de repêchage :** le registre énumère maintenant les **672 emplacements de base** (32 équipes × 7 rondes × 3 années). À la dernière vérification, **15 propriétaires sont sourcés et 657 restent non résolus**. Les attributions ajoutées sans preuve propre à la transaction ont été annulées plutôt que présentées comme vérifiées. Ces choix non vérifiés ne doivent pas être proposés à l’échange ni au repêchage. Les conditions et protections doivent aussi être confirmées.

## Synchronisation et audit

- `scripts/sync-nhl-data.mjs` — effectifs LNH et listes d’espoirs accessibles par l’API NHL; fusionne aussi les compléments secondaires sourcés de BUF, LAK, NYI et TOR, sans remplacer les données API par des doublons.
- `scripts/sync-ahl-data.mjs` — affiliations et effectifs LAH.
- `scripts/build-player-registry.mjs` — registre central; importe les cotes uniquement lorsqu’un identifiant correspond et enrichit une ligue inconnue seulement si une correspondance de nom unique mène à un effectif de ligue connue.
- `scripts/sync-contracts.mjs` — contrats, salaires par saison et clauses à partir de [ehlersio/nhl-contracts](https://github.com/ehlersio/nhl-contracts), sous licence CC0-1.0.
- `scripts/validate-database.mjs` — audit strict de couverture, salaires, doublons, listes d’espoirs, personnel LNH/LAH et propriétaires de choix; il échoue volontairement tant que des données requises restent manquantes ou non vérifiées.

## Principes de données

- Aucun droit LNH n’est déduit uniquement de l’affiliation LAH.
- Les cotes issues de `data/ratings.json` sont des estimations ajustées à partir des données de performance, pas des rapports de dépistage. Pour rendre tous les joueurs utilisables, les fiches sans cote source reçoivent des attributs 0–99 de repli explicitement marqués comme provisoires (âge/position); le potentiel reste inconnu lorsqu’il n’existe pas de source vérifiée.
- Les salaires, contrats, conditions de choix, propriétaires de choix et cotes non confirmés ne sont pas fabriqués.
- La synchronisation peut publier les données disponibles même si l’audit final échoue. Un audit rouge indique qu’il reste des données à compléter; une publication réussie ne signifie donc pas que le jeu est complet.
