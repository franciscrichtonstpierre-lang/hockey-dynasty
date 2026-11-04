# UHM — Pilote comparatif de 10 joueurs (4 novembre 2026)

## Portée
Lecture du registre `data/players/registry-index/registry-001.json` à `registry-007.json` sur la branche `ratings/reference-framework-2026`. Aucune cote joueur n'a été modifiée. Cette fiche compare les valeurs actuellement enregistrées et fixe les repères à valider avant toute recalibration.

## Échantillon retenu
La liste contient bien dix joueurs. Le dixième est Nathan MacKinnon, conservé de la première proposition. Le défenseur est Lane Hutson (orthographe correcte).

| Joueur | Rôle témoin | Équipe au registre | OA actuelle | Potentiel actuel | Confiance / preuve |
|---|---|---:|---:|---:|---|
| Connor McDavid | Superstar attaquant | EDM | 85 | 86 | Faible; 82 matchs NHL |
| Nathan MacKinnon | Superstar attaquant | COL | 85 | 85 | Faible; 80 matchs NHL |
| Gavin McKenna | Espoir de premier plan | TOR (à vérifier) | 90 | 99 | Très faible; aucune statistique NHL, estimation issue du rang/profil de repêchage |
| Ryan Leonard | Jeune attaquant | WSH | 74 | 86 | Faible; 75 matchs NHL |
| Cutter Gauthier | Jeune attaquant établi | ANA | 80 | 92 | Faible; 76 matchs NHL |
| Cole Caufield | Attaquant offensif confirmé | MTL | 83 | 87 | Faible; 81 matchs NHL |
| Josh Anderson | Vétéran attaquant / rôle physique | MTL | 65 | 65 | Faible; 72 matchs NHL |
| Lane Hutson | Défenseur offensif | MTL | 81 | 93 | Faible; 82 matchs NHL |
| Nikita Zadorov | Défenseur physique/défensif | BOS | 73 | 73 | Faible; 81 matchs NHL |
| Lukas Dostal | Gardien titulaire | ANA | 85 | 89 | Faible; 56 matchs de gardien NHL |

## Lecture du pilote
- **Échelle actuelle mal calibrée pour les vedettes :** McDavid et MacKinnon sont tous deux à 85 OA. Le registre ne distingue donc pas assez clairement les superstars des très bons joueurs.
- **Josh Anderson est sous-évalué selon le repère fourni :** 65 OA, OFF 69 et DEF 58 dans le registre, alors que l'exemple donné par l'utilisateur le situait approximativement autour de 78 OA, 74 OFF et 85 DEF. Ce sont des repères de logique, pas des valeurs définitives à recopier.
- **Gavin McKenna est un cas de données à corriger avant notation :** 90 OA / 99 potentiel est une estimation très faible en confiance, sans échantillon NHL. Le registre le classe actuellement NHL/TOR; son niveau et son affiliation doivent être vérifiés. Le repère utilisateur pour sa cote de départ est environ 74–75 OA.
- **Les jeunes ne doivent pas être évalués par une simple prime d'âge :** Ryan Leonard est à 74/86 et Cutter Gauthier à 80/92; le potentiel doit rester une projection séparée, fondée sur le profil et les preuves, pas une addition automatique.
- **Les profils de défenseurs doivent distinguer les rôles :** Lane Hutson (81 OA; OFF 83 / DEF 80) et Nikita Zadorov (73 OA; OFF 63 / DEF 79) offrent deux profils différents, mais les attributs doivent être validés avec l'utilisation, les responsabilités défensives et les observations de jeu.
- **Le gardien doit rester sur une calibration distincte :** Lukas Dostal est à 85 OA. Ses notes de champ actuellement remplies par le modèle ne doivent pas être interprétées comme des attributs de patineur.

## Repères de calibration à utiliser
1. Conserver une séparation nette entre OA actuelle et potentiel.
2. Faire ressortir une vraie différence entre superstar, vedette, joueur régulier, joueur de profondeur et espoir.
3. Évaluer les attributs individuellement : les points ne suffisent pas à déterminer DEF, jeu physique, mises au jeu, leadership ou endurance.
4. Pour les joueurs établis, croiser plusieurs saisons, rôle, temps de glace, unités spéciales et données de performance.
5. Pour les espoirs, utiliser âge, ligue, niveau relatif, rang/scouting documenté et incertitude; ne pas convertir automatiquement un rang de repêchage en OA NHL.
6. Garder les cotes existantes intactes jusqu'à validation des repères et des sources.

## Prochaine étape
Comparer les dix profils à des références publiques accessibles et établir des fourchettes OA/attributs cohérentes par rôle. Ensuite seulement, proposer une nouvelle version du modèle sur cette branche, avec avant/après et tests de non-régression. Aucun déploiement ni changement des cotes de la ligue n'est effectué par ce pilote.
