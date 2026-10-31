# Hockey Dynasty — état de la base de données

Saison cible : **2026–2027**. Ce dépôt contient l’application et les instantanés de données utilisés par le jeu.

## Couverture observée au 31 octobre 2026

**Dernier audit automatisé : réussi.** Les contrôles de couverture, d’identifiants, d’attributs, de salaires utilisables, de personnel et de choix de repêchage passent.

- **LNH :** 32/32 fichiers d’effectifs valides, environ 801 joueurs au dernier audit.
- **LAH :** 32/32 fichiers d’effectifs valides, 805 entrées dans le dernier audit. Les totaux peuvent varier après nettoyage des doublons et corrections de parsing.
- **Registre central :** 2 579 fiches après rapprochement des effectifs LNH, LAH, espoirs d’organisation, futurs repêchages et corrections sourcées. Le dernier audit ne détecte aucune ligue inconnue, aucun identifiant dupliqué ni aucune identité nom + date de naissance dupliquée. Les attributs 0–99 et une cote globale valide sont présents sur 2 579/2 579 fiches. **Les potentiels restent tous des estimations provisoires** : 0/2 579 sont source-vérifiés.
- **Espoirs d’organisation :** 32/32 fichiers non vides, 1 316 entrées au dernier audit après fusion de suppléments secondaires. Certains droits et ligues restent à revérifier. **Prochains repêchages :** un registre transversal distinct contient 102 noms recensés pour 2027, 28 pour 2028 et 3 candidats préliminaires pour 2029. La couverture 2028–2029 est encore précoce et ne constitue pas une liste définitive des admissibles.
- **Contrats :** 799/801 joueurs LNH appariés à un dossier contractuel dans le jeu de données CC0; 482/801 ont un cap hit 2026–2027 source-vérifié. Les estimations d’AAV et de salaire de simulation sont étiquetées séparément du cap hit officiel. **801/801 joueurs ont un montant utilisable pour la simulation**, sans présenter les estimations comme des salaires officiels.
- **Entraîneurs LNH :** 32 équipes et 158 fiches. **Personnel LAH :** 32 équipes et 159 fiches dans `data/coaches/ahl-2026-2027.json`. Les 32 équipes de chaque ligue ont un entraîneur-chef et des adjoints; les cotes de simulation sont présentes, mais ne doivent pas être confondues avec des évaluations de dépistage source-vérifiées.
- **Choix de repêchage :** le registre énumère **672 emplacements de base** (32 équipes × 7 rondes × 3 années : 2027–2029). **648 propriétaires sont vérifiés, 24 choix conditionnels sont exclus et aucun propriétaire ne reste non attribué.** Le snapshot PuckPedia du 28 septembre 2026 a été recoupé avec le suivi officiel des transactions NHL jusqu’au 30 octobre; les quatre échanges de choix postérieurs au snapshot ont été appliqués. Le registre des choix passe l’audit.

## Synchronisation et audit

- `scripts/sync-nhl-data.mjs` — effectifs LNH et listes d’espoirs accessibles par l’API NHL; fusionne aussi les compléments secondaires sourcés de BUF, LAK, NYI et TOR, sans remplacer les données API par des doublons.
- `scripts/sync-ahl-data.mjs` — affiliations et effectifs LAH.
- `scripts/build-player-registry.mjs` — registre central; importe les cotes statistiques lorsque l’identifiant correspond, attribue des cotes de repli provisoires âge/position, enrichit les ligues et équipes à partir des exports publics et corrections sourcées, puis déduplique les identités.
- `scripts/sync-contracts.mjs` — contrats, salaires par saison et clauses à partir de [ehlersio/nhl-contracts](https://github.com/ehlersio/nhl-contracts), sous licence CC0-1.0.
- `scripts/validate-database.mjs` — audit strict de couverture, salaires utilisables, doublons, listes d’espoirs, personnel LNH/LAH et propriétaires de choix. La dernière exécution passe; les cotes de potentiel et certains montants restent clairement marqués comme estimations.

## Principes de données

- Aucun droit LNH n’est déduit uniquement de l’affiliation LAH.
- Les cotes issues de `data/ratings.json` sont des estimations ajustées à partir des données de performance, pas des rapports de dépistage. Pour rendre tous les joueurs utilisables, les fiches sans cote source reçoivent des attributs 0–99 de repli explicitement marqués comme provisoires (âge/position); le champ `potential` reste réservé aux valeurs source-vérifiées; `potentialEstimate` fournit séparément une estimation provisoire fondée sur la cote globale et une tranche d’âge. Le dernier audit n’avait aucune cote de potentiel source-vérifiée.
- Les salaires, contrats, conditions de choix, propriétaires de choix et cotes non confirmés ne sont pas fabriqués.
- La synchronisation peut publier les données disponibles même si l’audit final échoue. Il faut donc vérifier le résultat de l’audit et ne pas assimiler une publication réussie à une validation des données.
