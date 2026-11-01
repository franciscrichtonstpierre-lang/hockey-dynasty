# Base des choix de repêchage NHL 2027–2029

Le fichier `2027-2029.json` est le registre canonique des 672 emplacements de base (32 équipes × 7 rondes × 3 années). Au dernier rapprochement, **652 choix sont actifs avec propriétaire vérifié et 20 choix conditionnels restent exclus du registre jouable**. Quatre conditions ont été résolues et leurs propriétaires intégrés : 2027 R1 FLA → CHI, 2027 R1 TOR → COL, 2027 R7 CAR → PHI et 2028 R2 EDM → CHI. Deux des quatre dossiers présentent encore une étiquette « conditional » sur une page d'équipe NHL, mais les fiches de transaction et les fiches de choix PuckPedia indiquent un transfert ferme; la divergence est consignée dans chaque fiche.

Parmi les 20 choix encore bloqués, les conditions sont documentées pour 11; les 9 autres nécessitent encore une source fiable indiquant le texte exact de la condition ou son résultat. Les choix bloqués conservent `currentOwner: null` afin de ne pas les rendre échangeables par erreur. Le registre n'est donc pas déclaré entièrement terminé tant que ces 20 conditions ne sont pas résolues.

## Modèle d'une fiche

```json
{
  "pickId": "2027-R2-CHI",
  "year": 2027,
  "round": 2,
  "originalTeam": "CHI",
  "currentOwner": "VAN",
  "status": "active",
  "verified": true,
  "conditions": null,
  "acquiredVia": "Échange du 26 juin 2024",
  "source": "https://...",
  "sourceUpdatedAt": "2026-10-30T00:00:00Z"
}
```

- `originalTeam` est le club auquel le choix appartenait initialement.
- `currentOwner` est le club qui détient actuellement le droit; il ne doit pas être déduit du rang projeté au repêchage.
- `status` peut être `active`, `forfeited`, `provisional_snapshot`, `unverified` ou `excluded_conditional`. Un choix perdu doit être conservé comme emplacement historique vérifié, avec `currentOwner: null`.
- `conditions` reste `null` dans le registre jouable. Le texte de condition et les bénéficiaires éventuels sont conservés dans les métadonnées d'audit (`conditionText`, `conditionalBeneficiary`, `conditionalSelectionGroup`).
- `conditionReviewStatus` distingue les conditions documentées mais toujours bloquées (`DOCUMENTED_BLOCKED`) des dossiers qui nécessitent encore une source (`SOURCE_REVIEW_REQUIRED`).
- `verified` ne peut être vrai qu'après vérification des sources et de l'état des conditions. Les choix conditionnels non résolus restent exclus et sans propriétaire jouable.

## Contrôles de complétude

L'audit exige un emplacement de base pour chacune des 32 équipes, des 7 rondes et des années 2027, 2028 et 2029 (672 emplacements), puis une vérification de chaque propriétaire ou forfait. Une base contenant des conditions non résolues reste en état partiel, même si tous les emplacements de base sont présents.

## Sources à croiser

- [Pro Sports Transactions — 2027](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2027.htm)
- [Pro Sports Transactions — 2028](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2028.htm)
- [Pro Sports Transactions — 2029](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2029.htm)
- [Suivi officiel des échanges NHL 2026–2027](https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades)
- [PuckPedia Draft](https://puckpedia.com/draft)

Les sources peuvent diverger ou afficher des conditions qui ne sont pas encore résolues. En cas de divergence, consigner la fiche comme non vérifiée plutôt que d'inventer le propriétaire. Les choix conditionnels restent exclus du registre jouable jusqu'à ce qu'un choix ferme puisse être attribué.
