# Hockey Dynasty — état de la base de données

Saison cible : **2026–2027**. Ce dépôt contient l’application et les instantanés de données utilisés par le jeu.

## Couverture observée au 31 octobre 2026

- **LNH :** 32/32 fichiers d’effectifs valides, environ 801 joueurs au dernier audit.
- **LAH :** 32/32 fichiers d’effectifs valides, 805 entrées dans le dernier audit. Les totaux peuvent varier après nettoyage des doublons et corrections de parsing.
- **Registre central :** 2 522 fiches après rapprochement des effectifs LNH, LAH, espoirs d’organisation et joueurs admissibles aux prochains repêchages. Le dernier audit détecte 95 fiches dont la ligue actuelle reste inconnue; aucun identifiant ni couple nom + date de naissance dupliqué n’est détecté. Les attributs 0–99 sont présents sur toutes les fiches, mais une partie reste une estimation provisoire.
- **Espoirs d’organisation :** 32/32 fichiers non vides, 1 316 entrées au dernier audit après fusion de suppléments secondaires. Certains droits et ligues restent à revérifier. **Prochains repêchages :** un registre transversal distinct contient 102 noms recensés pour 2027, 28 pour 2028 et 3 candidats préliminaires pour 2029. La couverture 2028–2029 est encore précoce et ne constitue pas une liste définitive des admissibles.
- **Contrats :** 799/801 joueurs LNH appariés à un dossier contractuel dans le jeu de données CC0; 482/801 ont une ligne salariale/cap hit 2026–2027 exploitable; 607 contrats ont aussi une AAV calculée étiquetée comme estimation, sans la confondre avec le cap hit saisonnier. Les autres valeurs restent « À vérifier » au lieu d’être inventées.
- **Entraîneurs LNH :** 32 équipes et 158 fiches. **Personnel LAH :** 32 équipes et 159 fiches dans `data/coaches/ahl-2026-2027.json`. Les 32 équipes de chaque ligue ont un entraîneur-chef et des adjoints; les cotes de simulation sont présentes, mais ne doivent pas être confondues avec des évaluations de dépistage source-vérifiées.
- **Choix de repêchage :** le registre énumère **672 emplacements de base** (32 équipes × 7 rondes × 3 années : 2027–2029). Au dernier audit, **39 propriétaires sont vérifiés, 609 proviennent d’un snapshot secondaire daté du 28 septembre 2026, 24 emplacements conditionnels sont exclus et aucun propriétaire ne reste non attribué**. Le registre est encore incomplet : les 609 propriétaires provisoires doivent être recoupés avec les transactions plus récentes avant que l’audit puisse passer au vert.

## Synchronisation et audit

- `scripts/sync-nhl-data.mjs` — effectifs LNH et listes d’espoirs accessibles par l’API NHL; fusionne aussi les compléments secondaires sourcés de BUF, LAK, NYI et TOR, sans remplacer les données API par des doublons.
- `scripts/sync-ahl-data.mjs` — affiliations et effectifs LAH.
- `scripts/build-player-registry.mjs` — registre central; importe les cotes statistiques lorsque l’identifiant correspond, attribue une cote de repli provisoire âge/position aux fiches non cotées, déduplique les joueurs lorsque l’identité est vérifiée et enrichit une ligue inconnue seulement à partir d’une correspondance unique avec un effectif connu.
- `scripts/sync-contracts.mjs` — contrats, salaires par saison et clauses à partir de [ehlersio/nhl-contracts](https://github.com/ehlersio/nhl-contracts), sous licence CC0-1.0.
- `scripts/validate-database.mjs` — audit strict de couverture, salaires, doublons, listes d’espoirs, personnel LNH/LAH et propriétaires de choix; il échoue volontairement tant que des données requises restent manquantes ou non vérifiées.

## Principes de données

- Aucun droit LNH n’est déduit uniquement de l’affiliation LAH.
- Les cotes issues de `data/ratings.json` sont des estimations ajustées à partir des données de performance, pas des rapports de dépistage. Pour rendre tous les joueurs utilisables, les fiches sans cote source reçoivent des attributs 0–99 de repli explicitement marqués comme provisoires (âge/position); le champ `potential` reste réservé aux valeurs source-vérifiées; `potentialEstimate` fournit séparément une estimation provisoire fondée sur la cote globale et une tranche d’âge. Le dernier audit n’avait aucune cote de potentiel source-vérifiée.
- Les salaires, contrats, conditions de choix, propriétaires de choix et cotes non confirmés ne sont pas fabriqués.
- La synchronisation peut publier les données disponibles même si l’audit final échoue. Un audit rouge indique qu’il reste des données à compléter; une publication réussie ne signifie donc pas que le jeu est complet.
