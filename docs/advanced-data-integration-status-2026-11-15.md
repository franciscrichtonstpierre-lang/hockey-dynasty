# Hockey Dynasty — état d'intégration des données avancées

Date de vérification : 15 novembre 2026

## Ce qui est maintenant implémenté

- `scripts/lib/advanced-player-rating-model.mjs` : moteur de démonstration recevant des percentiles normalisés.
- `scripts/import-advanced-evidence.mjs` : import local de fichiers JSON autorisés, validation de provenance et de licence, calcul de percentiles empiriques par saison + ligue + poste + cohorte d'utilisation.
- `data/rating-source-observation.schema.json` : provenance et observations avancées.
- Tests de l'importateur : cohortes séparées, provenance conservée et refus des sources sans statut de licence approuvé.
- Le script produit un fichier dérivé local; il ne contacte aucune source, ne contourne aucun accès et n'écrit ni dans la base de production ni dans le registre du jeu.

## Sources primaires examinées

### MoneyPuck
Page officielle : https://moneypuck.com/data.htm

- La page propose des fichiers téléchargeables, dont des données de tirs CSV dans des ZIP, avec xGoals et autres variables de qualité de tir. La page indiquait 2 079 359 tirs historiques 2007-08 à 2025-26 et un fichier 2026-27 mis à jour quotidiennement.
- Les tirs bloqués ne sont pas inclus dans le jeu de données de tirs décrit.
- Conditions publiées : utilisation gratuite pour fins non commerciales et journalistes pour usage ponctuel; crédit MoneyPuck obligatoire; pour tout autre usage, contacter MoneyPuck. La page interdit le scraping non approuvé et demande une autorisation pour les données qui ne sont pas listées sur cette page.
- Conséquence Hockey Dynasty : aucun téléchargement automatisé ni incorporation dans un produit distribué avant clarification écrite de l'usage et des droits. Le fichier public est un candidat pour un prototype local non commercial si les conditions s'appliquent, mais la licence doit être validée pour le projet exact.
- Champs candidats : xGoals, identifiants joueur/gardien, situation, coordonnées, distance/angle, rebound context. Il faudra agréger les tirs par joueur et par gardien, saison et situation.

### Evolving Hockey
Pages officielles :
- https://evolving-hockey.com/subscribe/
- https://evolving-hockey.com/terms-of-use/
- https://evolving-hockey.com/site_map/

- RAPM, GAR et xGAR sont proposés dans les tableaux abonnés. Les téléchargements CSV et outils de requête avancés sont inclus dans les niveaux d'abonnement appropriés; les prix affichés au moment de la vérification étaient Standard 4,99 USD/mois ou 53,99 USD/an, Pro 9,99 USD/mois ou 99,99 USD/an.
- Les conditions interdisent les robots, spiders et méthodes automatiques de copie du site. Les données et contenus obtenus sont destinés à l'usage personnel, mais les modèles statistiques créés à partir des données peuvent être partagés publiquement avec un lien et une référence à Evolving Hockey. Les données elles-mêmes ne peuvent pas être redistribuées.
- Conséquence Hockey Dynasty : ne pas automatiser l'extraction. Un export fourni par un compte autorisé doit être vérifié au regard des conditions exactes et limité à un modèle dérivé avec attribution; ne pas mettre les CSV sources dans le dépôt.

### NHL EDGE
Pages officielles :
- https://www.nhl.com/edge
- https://www.nhl.com/news/nhl-edge-advanced-stats-section-brings-fans-closer-to-game

- La NHL décrit EDGE comme ses statistiques de suivi du palet et des joueurs, incluant vitesse de patinage, distance, vitesse des tirs, emplacement des tirs et temps passé dans les zones. La page officielle annonce des visuels et comparaisons pour joueurs et clubs depuis la saison 2021-22.
- Les vues publiques ne constituent pas nécessairement un export complet et versionné de chaque événement ou de chaque joueur. Les endpoints communautairement documentés ne sont pas une API publique officiellement garantie.
- Les conditions d'utilisation NHL interdisent le scraping automatisé non autorisé. Aucun scraper ni endpoint privé n'est intégré ici.
- Conséquence Hockey Dynasty : utiliser uniquement les vues/exportations officiellement mises à disposition ou obtenir une autorisation/licence de flux. Traiter les classements Top-10 comme des données partielles, jamais comme un classement exhaustif de tous les joueurs.

## Couverture des ligues

Le prototype actuel ne résout pas encore l'identité et la normalisation entre NHL, AHL, ECHL, NCAA, CHL et ligues européennes. MoneyPuck et les métriques NHL EDGE examinées sont centrés sur la NHL. Evolving Hockey est également centré sur les statistiques NHL. Pour les autres ligues, le pipeline doit recevoir des exports autorisés des ligues ou fournisseurs respectifs, puis un ajustement de force de ligue documenté et testé. Aucune équivalence brute entre un percentile NHL et un percentile junior/européen ne doit être supposée.

## Contrat de données pour l'importateur

L'importateur attend un JSON local avec :
- `source.name`, `source.url`, `source.checkedAt`, `source.season`, `source.licenseStatus=approved`, `source.licenseId`, `source.licenseVerifiedAt`;
- `source.permissions.commercialGameUse=true` et `source.permissions.derivedOutputs=true` obligatoirement; un statut public/non commercial ou une autorisation générique est refusé;
- `source.licenseExpiresAt` facultatif, mais une licence échue est refusée;
- `rows[]` : `playerId`, `position`, `league`, `season`, `gamesPlayed`, `usageCohort`, `metrics`;
- les métriques canoniques sont listées dans `scripts/import-advanced-evidence.mjs`.

Les percentiles sont calculés dans des cohortes homogènes (saison, ligue, poste, rôle). La qualité de l'identification des joueurs, la taille des cohortes et les métriques manquantes doivent être vérifiées avant d'utiliser les sorties dans le moteur.

Exemple de commande :
```sh
node scripts/import-advanced-evidence.mjs data/advanced-input/authorized-export.json data/advanced-evidence/normalized-evidence.json
```

## Travail restant avant une intégration réelle

1. Obtenir les autorisations nécessaires pour MoneyPuck selon l'usage final de Hockey Dynasty.
2. Déterminer le mode d'export permis pour Evolving Hockey et obtenir l'accès requis; pas d'automatisation du site.
3. Obtenir un export complet/licencié de NHL EDGE ou un accès approuvé; ne pas confondre leaderboards publics et dataset complet.
4. Définir les correspondances de colonnes réelles vers les métriques canoniques à partir du dictionnaire de données de chaque export.
5. Valider les identifiants NHL et créer une table de correspondance stable pour les ligues non-NHL.
6. Construire les cohortes et l'ajustement interligues, puis faire un dry-run sur les dix joueurs pilotes et un échantillon de chaque rôle.
7. Ajouter tests de couverture, distributions, stabilité, écarts et protection des overrides.
8. Revue humaine et autorisation explicite avant tout recalcul/écriture de production.

## État de déploiement

Aucune source externe n'a été téléchargée ou branchée automatiquement. Aucune cote de production, aucun potentiel, aucun contrat, aucun choix de repêchage et aucune donnée de droits d'équipe n'ont été modifiés. Le travail reste isolé sur la branche `ratings/gm-connected-methodology-v1`.

## Pipeline candidate evaluation added

The branch also includes `scripts/evaluate-advanced-evidence.mjs`. It reads the normalized importer output, runs the position-specific candidate evaluators, and writes `data/advanced-evidence/candidate-ratings.json`. This is explicitly a review artifact with `productionWrite:false`; it is not connected to the production registry or Supabase. An end-to-end regression test checks that the candidate evaluator produces ratings only when evidence coverage is sufficient and labels the output as non-production.


## Contrôle de portée de licence — ajout du 16 novembre 2026

L'importateur applique désormais un contrôle fail-closed adapté à un produit pouvant être commercialisé :
- `licenseStatus` doit être exactement `approved`;
- un identifiant de licence écrit (`licenseId`) et une date de vérification valide (`licenseVerifiedAt`) sont obligatoires;
- `permissions.commercialGameUse` et `permissions.derivedOutputs` doivent être explicitement `true`;
- les statuts `public_noncommercial`, `manual_authorized`, `unknown` ou toute valeur différente de `approved` sont refusés;
- une licence échue est refusée;
- les champs de portée de licence sont conservés dans les observations de provenance.

Cette validation logicielle n'interprète pas un contrat et ne vérifie pas l'authenticité du document. Un humain doit confirmer que la licence écrite couvre bien Hockey Dynasty, les compétitions, les champs, les plateformes, la durée et les sorties affichées. Les tests utilisent une licence fictive de test; elle n'est pas une autorisation réelle.


## Moteur de développement et vieillissement — revue du 16 novembre 2026

Le dépôt contenait déjà un moteur de développement dédié (player-development.js), distinct du moteur de cotes avancées. Il utilise une échelle interne CA/PA de 1 à 200 et expose les attributs visibles sur 0–99. Les plafonds PA sont individualisés par attribut et pondérés selon le poste; le développement est déterministe à état initial et entrées identiques.

Les leviers déjà présents dans le moteur :
- progression par jour, âge et âge de pointe distinct par groupe de poste;
- temps de glace, performance, cohérence/détermination, entraînement, intensité, entraîneur et installations;
- plafond individuel de potentiel par attribut;
- réduction de progression pendant les blessures;
- régression après 32 ans, pondérée par famille d'attributs;
- probabilité de retraite à partir de 35 ans.

Ajouts de tests sur la branche :
- comparaison d'opportunités de développement avec temps de glace et performance faibles/élevés;
- comparaison de la marge de progression selon deux potentiels explicitement marqués comme vérifiés;
- reproductibilité de la simulation pour un même état et les mêmes paramètres.

Ces tests complètent les cas déjà présents pour le développement sur plusieurs blocs, l'équivalence 7/14/28 jours, les blessures, les plafonds PA, les âges de pointe par poste et la régression des vétérans.

Limites et précautions :
- les coefficients de croissance, de régression et de retraite sont des règles de simulation provisoires, pas des estimations empiriquement calibrées sur des historiques NHL licenciés;
- un potentiel non vérifié ne doit pas être présenté comme une projection de dépisteur confirmée;
- le moteur de développement n'a pas été fusionné avec les cotes avancées et ne déclenche aucun recalcul des joueurs de production;
- validation CI requise avant de considérer cette couche comme vérifiée.


## Règles de calcul des cotes OFF, DEF et OA — 16 novembre 2026

La logique de cotes du moteur de développement a été alignée sur les règles du jeu :
- **OFF** est dérivé uniquement de la moyenne de SH, PL et ST.
- **DEF** est dérivé uniquement de la moyenne de CH, PO et HI.
- **OA** est la moyenne arithmétique de tous les attributs visibles sauf FI et OA lui-même. Les valeurs dérivées OFF et DEF sont incluses dans cette moyenne.
- **FI** reste indépendant : sa variation ne change ni OFF, ni DEF, ni OA.
- OFF, DEF et OA sont des résultats calculés, pas des attributs entraînés indépendamment. La progression et la régression portent sur les attributs de base; les trois valeurs dérivées sont recalculées ensuite.
- Les pondérations par poste ne sont plus utilisées pour calculer OA. Elles restent seulement dans la logique de plafond potentiel individuel, pas dans ces trois formules.

Les tests dédiés vérifient les formules, l'exclusion de FI et l'absence de dépendance à l'ancien OFF/DEF/OA fourni en entrée. Ce changement touche le moteur de développement sur la branche de travail seulement; il ne recalcule pas les cotes des joueurs en production.


## Attribute-by-attribute development specialization — 16 Nov 2026
- Added modest position-based natural-growth profiles: forwards favor shooting/playmaking/strength and skating; defencemen favor positioning/checking/hitting and skating/strength; goalies favor positioning/skating/endurance with smaller weights on skater-only offensive attributes.
- Team training focus remains a separate modifier, so an attack-focused plan emphasizes SH/PL/ST while a defensive plan emphasizes CH/PO/HI/SR. FI remains an independently trained attribute and is not used in OFF, DEF or OA derivation.
- Added separate goalie focus pools for Technique, Reflexes and Rebound Control, using only the existing 16 attributes as broad proxies. This is explicitly provisional because the current rating schema has no dedicated goalie-only attributes.
- Added regression tests for forward/defenceman growth profiles, attack-vs-defense training focus, FI independence, goalie focus pools and the UI's existing “Normale” default.
- Coefficients are game-design starting values, not empirically calibrated NHL development rates. No production ratings or player records were changed.
