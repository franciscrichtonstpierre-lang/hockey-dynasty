# Registre des choix de repêchage NHL 2027–2029

Le fichier `2027-2029.json` conserve les 672 emplacements de base (32 équipes × 7 rondes × 3 années) pour auditer les choix réguliers.

**Règle du jeu : les choix conditionnels sont éliminés.** Hockey Dynasty ne gère aucune protection, aucun choix « meilleur de », aucun transfert conditionnel, aucune conversion vers une autre année ou ronde et aucune mécanique de résolution de condition.

Les emplacements d'origine concernés peuvent rester dans le registre technique avec le statut `excluded_conditional`, mais ce sont uniquement des placeholders non jouables :
- ils ne sont pas chargés dans l'interface;
- ils ne sont pas des actifs d'équipe;
- ils ne peuvent pas être échangés, attribués ou sélectionnés;
- aucune condition ni aucun bénéficiaire conditionnel n'est conservé dans la fiche.

## Modèle d'une fiche de choix régulier

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
  "acquiredVia": "Échange vérifié",
  "source": "https://...",
  "sourceUpdatedAt": "2026-10-30T00:00:00Z"
}
```

- `originalTeam` est le club auquel le choix appartenait initialement.
- `currentOwner` est le club qui détient le choix ferme.
- Les choix réguliers peuvent être actifs, perdus, provisoires ou non vérifiés.
- Un choix conditionnel ne doit jamais être transformé en actif à partir d'une supposition. Il reste un placeholder exclu.

## Contrôles

L'audit vérifie les 672 emplacements d'origine, les propriétaires des choix réguliers et les transferts documentés. Les placeholders conditionnels sont exclus du nombre de choix jouables.

## Sources

- [Pro Sports Transactions — 2027](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2027.htm)
- [Pro Sports Transactions — 2028](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2028.htm)
- [Pro Sports Transactions — 2029](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2029.htm)
- [Suivi officiel des échanges NHL 2026–2027](https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades)
- [PuckPedia Draft](https://puckpedia.com/draft)
