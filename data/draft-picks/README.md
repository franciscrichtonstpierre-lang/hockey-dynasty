# Base des choix de repêchage NHL 2027–2029

Le fichier `2027-2029.json` est le registre canonique des droits de repêchage. Il énumère les 672 emplacements de base pour 2027–2029; 15 propriétaires ont une transaction sourcée, tandis que 657 emplacements restent explicitement non vérifiés. **La présence des 672 fiches ne signifie pas que le registre est complet ou prêt pour les transactions du jeu.**

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
- `status` vaut `active` ou `forfeited`. Un choix perdu doit être conservé comme emplacement historique vérifié, avec `currentOwner: null`.
- `conditions` reste `null` dans le registre jouable : les choix conditionnels, protégés ou « meilleur / moins bon » sont exclus.
- `verified` ne peut être vrai qu'après vérification des sources et de l'état des conditions.
- Les choix conditionnels sont exclus du registre jouable conformément à la règle du projet. Leur emplacement de base reste non vérifié et sans propriétaire jouable tant qu'il n'existe pas de choix ferme à attribuer. Les actifs additionnels acquis par échange sont enregistrés comme leurs propres choix d'origine.

## Contrôles de complétude

L'audit exige un emplacement de base pour chacune des 32 équipes, des 7 rondes et des années 2027, 2028 et 2029 (672 emplacements), puis une vérification de chaque propriétaire ou forfait. Une base sans tous ses emplacements, sans propriétaire vérifié pour chaque choix, ou contenant des conditions non résolues reste en échec.

## Sources à croiser

- [Pro Sports Transactions — 2027](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2027.htm)
- [Pro Sports Transactions — 2028](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2028.htm)
- [Pro Sports Transactions — 2029](https://www.prosportstransactions.com/hockey/DraftTrades/Years/2029.htm)
- [Suivi officiel des échanges NHL 2026–2027](https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades)
- [PuckPedia Draft](https://puckpedia.com/draft)

Les sources peuvent diverger ou afficher des conditions qui ne sont pas encore résolues. En cas de divergence, consigner la fiche comme non vérifiée plutôt que d'inventer le propriétaire.
