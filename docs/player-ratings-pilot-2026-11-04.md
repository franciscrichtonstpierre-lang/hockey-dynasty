# UHM — Test pilote des cotes joueurs (4 novembre 2026)

## Portée et précaution

Audit en lecture seule des données publiées dans `data/players/registry-index/registry-001.json` à `registry-007.json` et de la logique dans `scripts/lib/cross-league-rating-model.mjs`. Les cotes en place n'ont pas été modifiées. Les résultats ci-dessous sont les valeurs actuelles du registre et le diagnostic de leur méthode, pas des nouvelles cotes validées par dépistage.

## Échantillon pilote

| Joueur | Équipe / ligue du registre | Âge au 4 nov. 2026 | OA actuelle | Potentiel actuel | Échantillon / preuve |
|---|---|---:|---:|---:|---|
| Cole Caufield | MTL / NHL | 25 | 83 | 87 | 81 matchs, statistiques NHL 2025-26; confiance globale faible, échantillon élevé |
| Josh Anderson | MTL / NHL | 32 | 65 | 65 | 72 matchs, statistiques NHL 2025-26; confiance globale faible, échantillon élevé |
| Leo Carlsson | ANA / NHL | 21 | 81 | 93 | 70 matchs, statistiques NHL 2025-26; confiance globale faible, échantillon élevé |
| Cutter Gauthier | ANA / NHL | 22 | 80 | 92 | 76 matchs, statistiques NHL 2025-26; confiance globale faible, échantillon élevé |
| Owen Beck | MTL / NHL | 22 | 56 | 68 | 15 matchs, statistiques NHL 2025-26; faible échantillon |
| Lukas Dostal | ANA / NHL, gardien | 26 | 85 | 89 | 56 matchs, statistiques de gardien NHL 2025-26; confiance globale faible, échantillon élevé |
| A.J. Spellacy | Rockford / AHL | 20 | 68 | 84 | 10 matchs, flux statistique AHL; faible échantillon, tous les attributs modélisés |
| Gavin McKenna | TOR / NHL selon le registre | 18 | 90 | 99 | Aucun échantillon NHL; preuve déclarée « draft_pick », confiance très faible, tous les attributs modélisés |

## Résultats du diagnostic

1. **L'OA actuelle n'est pas recalculée si elle existe déjà.** `estimatePlayerRatings()` prend l'OA existante comme valeur connue; les attributs déjà renseignés sont également conservés individuellement. Le nouveau moteur ne corrige donc pas automatiquement une ancienne cote.
2. **Les attributs individuels sont en grande partie des dérivés du même score global.** Pour les profils sans statistiques, les notes sont construites autour de l'OA avec de petits ajustements de position, gabarit ou rang. Ce n'est pas une évaluation indépendante de FI, SH, PL, etc.
3. **Le potentiel est actuellement mécanique.** Le code ajoute à l'OA un bonus fixe selon l'âge : +20 à 18 ans ou moins, +16 à 20 ans, +12 à 22 ans, +8 à 24 ans, +4 à 26 ans, +1 à 29 ans, puis 0. Cela explique exactement les potentiels affichés dans l'échantillon (sous réserve des âges enregistrés).
4. **Le cas Gavin McKenna est un drapeau rouge.** Le registre le classe NHL/TOR et lui donne 90 OA / 99 potentiel à partir d'un rang de repêchage, sans échantillon statistique NHL, avec confiance très faible. Cette note ne doit pas être présentée comme une cote NHL établie. Il faut vérifier son affectation de ligue/équipe et distinguer rang de repêchage, niveau actuel et potentiel.
5. **Les gardiens exigent un contrôle séparé.** Dostal a 85 OA, mais plusieurs attributs de joueur de champ sont remplis par le modèle de gardien. Il faut vérifier que l'interface et le moteur de jeu interprètent ces champs sans fausser les évaluations.
6. **L'échantillon AHL est trop petit pour soutenir une OA précise.** Spellacy a 10 matchs; son OA 68 et son potentiel 84 sont des estimations de faible confiance, pas des cotes de dépistage confirmées.

## Décision proposée pour le pilote

- Garder les cotes existantes intactes pendant cette phase.
- Corriger en premier les identités et affiliations de ligue/équipe, notamment les profils de prospects.
- Séparer trois sorties : niveau actuel, potentiel projeté et confiance/preuve.
- Recalculer l'OA uniquement après validation des données de performance et des références externes; ne pas utiliser le salaire comme mesure de talent.
- Calculer les attributs avec des preuves adaptées à chaque attribut. Les statistiques de points ne suffisent pas à mesurer la défense, le leadership, l'intelligence ou le jeu physique.
- Valider les gardiens avec un modèle dédié et comparer les notes à des joueurs repères de même position et de même ligue.

## Limites

Ce pilote n'importe pas les notes propriétaires d'EA NHL 27, EHM ou SHM. Il ne prétend pas avoir extrait des évaluations privées ou non accessibles. Les notes affichées proviennent des données actuelles du dépôt; la comparaison de référence externe et le recalcul contrôlé restent les prochaines étapes.
