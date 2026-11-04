# Hockey Dynasty — état de la base de données

Saison cible : **2026–2027**. Ce dépôt contient l’application et les instantanés de données utilisés par le jeu.

## Couverture vérifiée le 1er novembre 2026

**Dernier audit automatisé : réussi.** Les contrôles de couverture, d’identifiants, d’attributs, de salaires utilisables, de personnel et de choix de repêchage passent.

- **LNH :** 32/32 fichiers d’effectifs valides, 800 joueurs.
- **LAH :** 32/32 fichiers d’effectifs valides, 809 joueurs.
- **Registre central :** 3 343 fiches. L’audit confirme des identifiants uniques et des cartes complètes sur 3 343/3 343 fiches; deux fiches ont encore une ligue inconnue. **Les potentiels sont des estimations provisoires** : 0/3 343 sont source-vérifiés.
- **Espoirs d’organisation :** 32/32 fichiers non vides, 1 315 joueurs. Tous ont maintenant une carte de cotes raccordée à l’application; quatre profils sans fiche centrale correspondante portent une estimation de profil marquée de confiance très faible. Certains droits et ligues restent à revérifier. **Prochains repêchages :** un registre transversal contient 102 noms pour 2027, 37 pour 2028 et 7 pour 2029; ces listes ne sont pas définitives.
- **Contrats :** 805/805 joueurs LNH sont appariés à un dossier contractuel; 490/800 ont un cap hit 2026–2027 source-vérifié. Les estimations d’AAV et de salaire de simulation sont étiquetées séparément du cap hit officiel.
- **Entraîneurs LNH :** 32 équipes et 158 fiches. **Personnel LAH :** 32 équipes et 159 fiches dans `data/coaches/ahl-2026-2027.json`. Les 32 équipes de chaque ligue ont un entraîneur-chef et des adjoints; les cotes de simulation sont présentes, mais ne doivent pas être confondues avec des évaluations de dépistage source-vérifiées.
- **Choix de repêchage :** le registre énumère **672 emplacements de base** (32 équipes × 7 rondes × 3 années : 2027–2029). **655 propriétaires sont vérifiés, 17 choix conditionnels sont exclus et aucun propriétaire ne reste non attribué.** Le registre passe l’audit.

## Synchronisation et audit

- `scripts/sync-nhl-data.mjs` — effectifs LNH et listes d’espoirs accessibles par l’API NHL; fusionne aussi les compléments secondaires sourcés de BUF, LAK, NYI et TOR, sans remplacer les données API par des doublons.
- `scripts/sync-ahl-data.mjs` — affiliations et effectifs LAH.
- `scripts/build-player-registry.mjs` — construit le registre central à partir des effectifs, des listes d’espoirs et des sources complémentaires.
- `scripts/apply-player-ratings.mjs` — attribue les 16 cotes aux joueurs du registre et aux agents libres, en privilégiant les statistiques de leur ligue puis les informations de profil; inscrit source, méthode, statut et confiance.
- `scripts/export-registry-index.mjs` — prépare les données affichées par l’application et complète les rares espoirs sans correspondance centrale avec une estimation de profil explicitement marquée de confiance très faible.
- `scripts/sync-contracts.mjs` — contrats, salaires par saison et clauses à partir de [ehlersio/nhl-contracts](https://github.com/ehlersio/nhl-contracts), sous licence CC0-1.0.
- `scripts/validate-database.mjs` — audit strict de couverture, salaires utilisables, doublons, listes d’espoirs, personnel LNH/LAH et propriétaires de choix. La dernière exécution passe; les cotes de potentiel et certains montants restent clairement marqués comme estimations.

## Moteur de développement des joueurs

- `player-development.js` — moteur de progression inspiré de la logique CA/PA d’EHM. Chaque joueur possède un CA et un PA internes de 1 à 200 pour chacun des 16 attributs FI, SH, PL, ST, CH, PO, HI, SK, EN, PE, FA, LE, SR, OFF, DEF et OA; les effectifs continuent d’afficher les notes de 0 à 99.
- Le moteur accumule les effets jour par jour et applique le résultat à la fin des blocs de simulation de **7, 14 ou 28 jours**. Le résultat est cohérent entre un bloc de 28 jours et quatre blocs de 7 jours, toutes choses égales par ailleurs.
- Âge, écart au potentiel, entraînement, intensité, entraîneurs, temps de glace, rendement et blessures influencent le développement. Les notes d’installations, de temps de glace et de rendement sont utilisées lorsqu’elles existent; sinon le moteur applique une valeur neutre ou une estimation de rôle. Les joueurs peuvent stagner, progresser ou régresser; le PA demeure un plafond et non une promesse.
- Le CA/PA et la progression de chaque attribut restent internes. Les potentiels estimés demeurent identifiés comme estimations et ne deviennent pas des potentiels source-vérifiés.
- Dans une ligue en ligne, les états de développement sont enregistrés dans `league_game_states.state.playerDevelopment`, partagés avec les membres de la ligue par les politiques RLS existantes. Les modifications de joueurs et leurs droits restent séparés dans `league_player_overrides`. Hors ligne, l’état est conservé dans la sauvegarde locale.
- `tests/player-development.test.mjs` — tests de l’échelle CA/PA, des plafonds individuels, de la cohérence 28 jours / 4 × 7 jours et de l’effet des blessures.

## Principes de données

- Aucun droit LNH n’est déduit uniquement de l’affiliation LAH.
- Chaque joueur conserve exactement les attributs **FI, SH, PL, ST, CH, PO, HI, SK, EN, PE, FA, LE, SR, OFF, DEF et OA**, de 0 à 99. Ces cotes sont des estimations de simulation, pas des rapports de dépistage vérifiés : l’application affiche leur statut, leur source et leur confiance, et marque les estimations par « ≈ ». Les cartes non appuyées par des statistiques utilisent les éléments de profil disponibles, notamment la ligue, la position, le rang de repêchage et les mensurations lorsqu’ils existent; elles ne sont pas présentées comme des cotes source-vérifiées.
- Le potentiel est séparé des 16 attributs. Le champ `potential` reste réservé aux valeurs source-vérifiées; `potentialEstimate` est une estimation provisoire calculée séparément à partir de la cote actuelle et d’une tranche d’âge. Le dernier audit n’a trouvé aucune cote de potentiel source-vérifiée.
- Les salaires, contrats, conditions de choix, propriétaires de choix et cotes non confirmés ne sont pas fabriqués.
- La publication automatique est bloquée si la vérification JavaScript ou l’audit final échoue. Une synchronisation réussie ne remplace pas la lecture des résultats de l’audit; les données estimées restent distinctes des données vérifiées.

## Références externes pour les cotes et potentiels

La base doit distinguer les faits vérifiables, les notes de jeux vidéo et les estimations Hockey Dynasty. La hiérarchie de référence est la suivante :

1. **EA SPORTS NHL 27 (source officielle)** : utiliser les notes publiques de joueurs et les attributs publiés par EA comme point d'ancrage comparatif lorsqu'ils existent. Conserver la valeur originale, la date de consultation, l'URL, la saison/édition et le nom exact de l'attribut EA. Les attributs EA qui n'ont pas d'équivalent direct dans FI/SH/PL/ST/CH/PO/HI/SK/EN/PE/FA/LE/SR/OFF/DEF ne doivent pas être forcés dans une mauvaise colonne.
2. **Statistiques et profils officiels des ligues** : API NHL, NHL EDGE lorsqu'une mesure est publiée, statistiques AHL/CHL/NCAA/Europe et profils officiels pour identité, âge, position, équipe et production. Ces données aident à estimer les cotes de simulation, mais ne sont pas des notes de dépistage.
3. **Rapports de dépistage et bases de prospects reconnues** : utiliser plusieurs évaluations indépendantes et datées pour le potentiel et les qualités des espoirs (par exemple rapports de dépistage publics, listes de classement et profils détaillés). Enregistrer chaque source séparément; ne jamais convertir mécaniquement un rang en potentiel certain.
4. **Autres bases de données et analyses publiques** : sources secondaires uniquement, avec date et niveau de confiance, pour recouper ou combler les champs non couverts.

### Règles d'intégration
- Le potentiel (PA) et la constance (CON) sont des paramètres de simulation Hockey Dynasty distincts des notes NHL 27. NHL 27 ne publie pas de potentiel de carrière EHM ni de constance équivalente : ces champs ne doivent donc jamais être copiés ou présentés comme des valeurs EA.
- Un potentiel estimé doit rester marqué `estimated`; un potentiel vérifié doit avoir une source explicite et une date. Le rang de repêchage, l'âge ou la réputation ne suffisent jamais seuls à fixer un PA.
- Les notes EA servent d'ancrage pour les attributs comparables et le niveau actuel, pas de plafond de progression. La progression future est calculée par le moteur CA/PA, le développement, le temps de glace, les blessures, l'entraînement et la constance.
- Chaque valeur importée doit conserver `source`, `sourceUrl`, `sourceCheckedAt`, `sourceEdition`, `sourceAttribute`, `confidence` et `status`. Garder la note brute EA séparée de la note normalisée Hockey Dynasty.
- En cas de conflit entre deux sources, conserver les deux observations et choisir la valeur de simulation par une règle documentée; ne jamais écraser silencieusement une valeur vérifiée.
- Respecter les conditions d'utilisation et les droits de redistribution des sources. Ne pas aspirer ni redistribuer des bases propriétaires complètes sans autorisation; importer les données publiques permises et les références nécessaires à l'audit.

Sources de référence à consulter :
- [EA SPORTS NHL 27 — cotes officielles](https://www.ea.com/games/nhl/ratings)
- [EA SPORTS NHL 27 — guide officiel des attributs](https://help.ea.com/en/articles/nhl/nhl-attributes-guide/)
- [NHL Stats](https://api.nhle.com/)
- [Elite Prospects](https://www.eliteprospects.com/)
- [HockeyProspecting](https://hockeyprospecting.com/)
- [Daily Faceoff — prospect rankings](https://www.dailyfaceoff.com/)
