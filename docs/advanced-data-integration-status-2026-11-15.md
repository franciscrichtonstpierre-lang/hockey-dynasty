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
- `source.name`, `source.url`, `source.checkedAt`, `source.season`, `source.licenseStatus`;
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
