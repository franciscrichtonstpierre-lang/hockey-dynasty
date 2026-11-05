# Registre des choix de repêchage NHL 2027–2029

Le registre conserve les 672 emplacements de base (32 équipes × 7 rondes × 3 années). **Hockey Dynasty ne gère aucun choix conditionnel.** Seuls les choix fermes dont le propriétaire est confirmé sont des actifs échangeables. Les 17 emplacements dont le propriétaire dépend d'une condition ou ne peut pas être confirmé sont marqués `excluded`, sans propriétaire, et ne sont pas chargés dans les inventaires ni dans les propositions d'échange.

Aucune protection, clause, condition, sélection « meilleur de deux » ou transfert contingent n'est simulé. Un choix qui n'est pas un actif ferme reste simplement indisponible.

## Modèle d'une fiche échangeable

```json
{
  "pickId": "2027-R2-CHI",
  "year": 2027,
  "round": 2,
  "originalTeam": "CHI",
  "currentOwner": "VAN",
  "status": "active",
  "verified": true,
  "acquiredVia": "Échange confirmé",
  "source": "https://...",
  "sourceUpdatedAt": "2026-10-30T00:00:00Z"
}
```

- `originalTeam` est le club auquel le choix appartenait initialement.
- `currentOwner` est le club qui détient actuellement le droit; il ne doit pas être déduit du rang projeté.
- `status` accepte `active`, `forfeited`, `provisional_snapshot`, `unverified` ou `excluded`.
- Un choix `excluded` n'a aucun propriétaire jouable et ne peut pas être échangé.
- Les champs de conditions ne font pas partie du modèle de données.

## Contrôles de complétude

L'audit exige les 672 emplacements de base et une propriété vérifiée pour chaque choix échangeable. Les emplacements exclus ne sont pas proposés au directeur général et ne peuvent pas être transférés par le moteur de transaction.

## Sources

- [Pro Sports Transactions — 2027](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2027.htm)
- [Pro Sports Transactions — 2028](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2028.htm)
- [Pro Sports Transactions — 2029](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2029.htm)
- [Suivi officiel des échanges NHL 2026–2027](https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades)
- [PuckPedia Draft](https://puckpedia.com/draft)
