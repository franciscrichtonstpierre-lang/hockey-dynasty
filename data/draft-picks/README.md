# Base des choix de repêchage NHL 2027–2029

Le fichier `2027-2029.json` est le registre canonique des droits de repêchage. Il énumère les 672 emplacements de base pour 2027–2029; au dernier audit, **648 propriétaires sont vérifiés, 24 choix conditionnels sont exclus et aucun propriétaire ne reste non attribué**. Le snapshot PuckPedia du 28 septembre 2026 a été recoupé avec le suivi officiel des transactions NHL jusqu’au 30 octobre 2026, et les quatre échanges postérieurs au snapshot ont été appliqués. Le registre des choix passe l’audit.

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
- `currentOwner` est le club qui détient actuellement le droit; il ne doit pas être déduit du rang projeté au repêchage. Les choix non conditionnels ont été recoupés avec le snapshot PuckPedia et le suivi officiel des transactions NHL.
- `status` peut être `active`, `forfeited`, `provisional_snapshot`, `unverified` ou `excluded_conditional`. Un choix perdu doit être conservé comme emplacement historique vérifié, avec `currentOwner: null`. Un propriétaire `provisional_snapshot` provient du snapshot daté indiqué dans la fiche et n'est pas équivalent à une vérification actuelle.
- `conditions` reste `null` dans le registre jouable : les choix conditionnels, protégés ou « meilleur / moins bon » sont exclus et reçoivent `status: "excluded_conditional"`.
- `verified` ne peut être vrai qu'après vérification des sources et de l'état des conditions. Le snapshot secondaire ne permet pas, à lui seul, de mettre ce champ à `true`.
- Les choix conditionnels sont exclus du registre jouable conformément à la règle du projet. Leur emplacement de base reste non vérifié et sans propriétaire jouable tant qu'il n'existe pas de choix ferme à attribuer. Les actifs additionnels acquis par échange sont enregistrés comme leurs propres choix d'origine.

## Contrôles de complétude

L'audit exige un emplacement de base pour chacune des 32 équipes, des 7 rondes et des années 2027, 2028 et 2029 (672 emplacements), puis une vérification de chaque propriétaire ou forfait. Une base sans tous ses emplacements, sans propriétaire vérifié pour chaque choix, ou contenant des conditions non résolues reste en échec.

## Sources à croiser

- [Pro Sports Transactions — 2027](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2027.htm)
- [Pro Sports Transactions — 2028](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2028.htm)
- [Pro Sports Transactions — 2029](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2029.htm)
- [Suivi officiel des échanges NHL 2026–2027](https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades)
- [PuckPedia Draft](https://puckpedia.com/draft)

Les sources peuvent diverger ou afficher des conditions qui ne sont pas encore résolues. En cas de divergence, consigner la fiche comme non vérifiée plutôt que d'inventer le propriétaire. Les choix conditionnels restent exclus du registre jouable jusqu'à ce qu'un choix ferme puisse être attribué.
