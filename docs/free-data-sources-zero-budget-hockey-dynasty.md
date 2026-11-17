# Hockey Dynasty — stratégie de données gratuites uniquement

**Vérification documentaire : 16 novembre 2026**  
**Branche de travail visée :** `ratings/gm-connected-methodology-v1`  
**Politique :** aucun abonnement, achat de données, essai payant, devis payant ni frais de licence. Ne pas contacter les fournisseurs pour solliciter une offre payante. Une source gratuite n'est retenue pour une sortie commerciale que si les droits publiés couvrent explicitement cet usage ou si la donnée est sous une licence libre compatible.

## Décision de projet

Hockey Dynasty utilisera en priorité :
1. des jeux de données sous licence libre/public domain compatibles avec un produit commercial;
2. les données et analyses originales dont le fournisseur autorise explicitement l'adaptation et l'usage commercial gratuit;
3. des outils open source pour traiter les données, sans confondre la licence du logiciel avec celle des données récupérées;
4. des calculs et modèles propriétaires Hockey Dynasty, entraînés uniquement sur des entrées dont les droits ont été vérifiés.

Aucun service payant ne doit être ajouté au budget ou devenir une dépendance technique.

## Matrice des sources vérifiées

| Source | Accès / export gratuit | Données avancées | Usage commercial gratuit | Décision |
|---|---|---|---|---|
| PlayerWON — données et analyses originales contrôlées par PlayerWON | CSV téléchargeables depuis NHL Data Hub | xG, xGA, xGD, tirs, positions, distance/angle, shifts, play-by-play, statistiques joueurs/gardiens | Oui, pour le matériel contrôlé par PlayerWON, selon sa politique du 13-11-2026; attribution pour les résultats publics | **Priorité 1**, champ par champ et en vérifiant la provenance |
| fastRhockey / SportsDataverse | Code source public; fonctions d'accès aux API publiques | NHL EDGE, tirs, vitesse, distance, temps de zone; NHL/PWHL/AHL/CHL/NCAA/Europe selon endpoints | Licence MIT pour le code seulement; droits des API et données tierces distincts | **Outil technique prioritaire**, pas une licence de données |
| opensport/hockey.db | Fichiers texte publics | Données NHL historiques très limitées (répertoire saison 2015-16) | Schéma/données/scripts déclarés domaine public | **Utiliser comme test/complément historique**, pas comme base actuelle |
| ehlersio/nhl-contracts | Dépôt public | Contrats et cap hit NHL, sources référencées | CC0-1.0 selon dépôt; vérifier chaque ligne et ses sources | **Priorité pour contrats**, conserver les références |
| MoneyPuck | CSV/ZIP téléchargeables gratuitement | xG, tirs, contexte de tir, données gardiens | Non : page officielle limitée au non-commercial et journalisme ponctuel; autres usages à demander | **Exclu du produit commercial**, aucun scraping |
| Evolving Hockey | Certaines tables CSV via abonnement; pages publiques | RAPM, GAR, xGAR | Non établi gratuitement; conditions d'usage personnel et redistribution limitée | **Exclu**; ne pas souscrire |
| NHL / NHL EDGE / API NHL | Pages et endpoints accessibles publiquement | Statistiques, play-by-play et certaines mesures EDGE | Les conditions NHL consultées limitent l'usage des services/contenus à un usage personnel non commercial; droits commerciaux non accordés par l'accès public | **Recherche et validation seulement**; ne pas intégrer au produit commercial sans droit gratuit explicite |
| EliteProspects, Sportradar, Stats Perform, HockeyTech API commerciale | Certaines pages ou documentations publiques | Couverture multi-ligues et données avancées variables | Aucun droit commercial gratuit et complet confirmé | **Exclus de la stratégie zéro dollar**; aucune souscription ni demande de devis |

## Sources officielles et preuves

### 1. PlayerWON — source gratuite à exploiter en premier

- Règles d'utilisation et citation : https://www.playerwon.ca/data-use/
- Transparence / provenance : https://www.playerwon.ca/transparency/
- NHL Data Hub : https://www.playerwon.ca/data/nhl/
- Joueurs : https://www.playerwon.ca/data/nhl/players/
- Gardiens : https://www.playerwon.ca/data/nhl/goalies/
- Équipes : https://www.playerwon.ca/data/nhl/teams/
- Matchs : https://www.playerwon.ca/data/nhl/games/
- Play-by-play : https://www.playerwon.ca/data/nhl/play-by-play/
- Tirs : https://www.playerwon.ca/data/nhl/shots/
- Shifts : https://www.playerwon.ca/data/nhl/shifts/
- Analyses avancées : https://www.playerwon.ca/data/nhl/advanced/

La politique publiée et mise à jour le 13 novembre 2026 autorise gratuitement le téléchargement, l'analyse, l'adaptation et le partage des jeux de données créés par PlayerWON et de ses analyses originales, y compris pour l'analyse commerciale, sans demande préalable. Les publications qui utilisent ces contenus doivent créditer PlayerWON avec le nom du jeu de données, le lien, la date d'accès et les saisons/filtres pertinents.

**Limite juridique essentielle :** PlayerWON indique que sa permission ne couvre que les droits qu'il contrôle. Elle ne confère pas les droits sur les données NHL tierces, les photos, logos ou marques et ne neutralise pas les conditions des fournisseurs d'origine. Sa page de transparence explique qu'il combine des données NHL publiquement disponibles et des données de cotes sous licence; ses CSV peuvent donc mélanger des contenus d'origines différentes.

**Règle d'intégration :** avant chaque import, documenter la page exacte, le dataset, les champs, la provenance déclarée, la date et les conditions. N'utiliser que les analyses originales PlayerWON dont la politique permet la réutilisation et les champs dont les droits sous-jacents sont suffisamment établis. Ne pas supposer que tous les CSV du Data Hub sont automatiquement réutilisables commercialement parce que la politique PlayerWON existe.

Les pages consultées montrent notamment :
- exports CSV des tables équipes, joueurs, gardiens et matchs;
- play-by-play et shifts téléchargeables;
- tirs avec coordonnées, distance, angle et xG versionné lorsque disponible;
- tableaux xG/xGA/xGD et mesures avancées.
Les chiffres de couverture et la fraîcheur varient par page/saison; enregistrer le statut de couverture fourni au moment du téléchargement.

### 2. fastRhockey — outil gratuit, pas une autorisation de données

- Documentation : https://fastrhockey.sportsdataverse.org/
- Dépôt et licence : https://github.com/sportsdataverse/fastRhockey

Le projet est sous licence MIT. La documentation répertorie des wrappers pour les API publiques NHL, les endpoints NHL EDGE (vitesse de patinage, distance, vitesse de tir, temps de zone et comparaisons), ainsi que des données PWHL, AHL, OHL, WHL, QMJHL, NCAA et plusieurs ligues européennes.

La licence MIT permet d'utiliser/modifier le code selon ses conditions. Elle ne donne aucun droit sur les données NHL, ESPN, HockeyTech ou les autres fournisseurs appelés par le code. Avant toute collecte persistante ou diffusion commerciale, vérifier les conditions du service source et les restrictions techniques publiées. Ne pas contourner authentification, limitation de débit, protections ou restrictions. Ne pas aspirer les pages Web si une API/export autorisé n'est pas disponible.

**Utilisation proposée :** étudier les schémas, faire des tests locaux sur des endpoints dont les conditions permettent l'usage visé, puis conserver uniquement les champs autorisés. Le fait qu'un endpoint réponde sans clé n'est pas une licence.

### 3. Hockey.db — domaine public, mais ancien et incomplet

- Dépôt : https://github.com/opensport/hockey.db

Le dépôt déclare son schéma, ses données et ses scripts dans le domaine public, sans restriction. Il contient toutefois un jeu de fixtures très ancien, notamment un répertoire 2015-16. Il peut servir à tester l'import, les identifiants d'équipe ou des outils, mais ne peut pas fournir les effectifs 2026-27.

### 4. Contrats — dépôt CC0

- Dépôt : https://github.com/ehlersio/nhl-contracts

Le README Hockey Dynasty identifie déjà ce dépôt comme CC0-1.0. Garder l'URL source, la date de vérification et les preuves par contrat. La licence CC0 du dépôt ne rend pas automatiquement libres les articles ou pages sources liés; conserver uniquement les données et éléments effectivement couverts par la déclaration de licence et vérifier les cas particuliers.

### 5. MoneyPuck — gratuit mais non commercial : exclu

- Données : https://moneypuck.com/data.htm
- Modèle : https://www.moneypuck.com/about.htm

La page officielle dit que les données sont gratuites pour les usages non commerciaux et les journalistes pour des utilisations ponctuelles. Les autres usages doivent faire l'objet d'une demande. Les téléchargements comprennent des données de tirs historiques, xG et contexte. Cela ne répond pas à la politique zéro dollar pour un jeu potentiellement commercial. Ne pas intégrer les fichiers, calculs ou exports MoneyPuck dans une version commerciale sans autorisation gratuite explicite déjà publiée. Ne pas contacter MoneyPuck pour demander une offre payante et ne pas scraper.

### 6. Evolving Hockey — exclu

- Conditions : https://evolving-hockey.com/terms-of-use/
- Abonnements : https://evolving-hockey.com/subscribe/

Les métriques RAPM, GAR et xGAR sont méthodologiquement intéressantes, mais les exports sont liés à des abonnements et les conditions ne constituent pas une autorisation générale de réutilisation commerciale. Aucun paiement ni essai payant. Reproduire des concepts statistiques généraux par un modèle Hockey Dynasty indépendant est possible; ne pas copier leurs tables, valeurs, modèles propriétaires ou contenus.

### 7. NHL / NHL EDGE — public ne veut pas dire libre commercialement

- Conditions : https://www.nhl.com/info/terms-of-service
- NHL EDGE : https://www.nhl.com/edge
- NHL API : https://api.nhle.com/

Les conditions consultées réservent l'accès et l'affichage du contenu des services à un usage personnel non commercial, sauf autorisation écrite. Elles limitent notamment la copie, la constitution de bases de données, la création de dérivés et l'exploitation commerciale. Les marques/logos sont des droits distincts.

Les statistiques publiques NHL et EDGE restent utiles pour comprendre les concepts et vérifier la plausibilité du moteur pendant le développement privé. Elles ne sont pas autorisées par défaut dans une version commerciale. N'enregistrer ni répliquer des datasets en masse et ne pas contourner les restrictions.

## Modèle avancé sans fournisseur payant

Construire les métriques Hockey Dynasty à partir d'entrées dont la réutilisation commerciale est autorisée :

### Patineurs
- Production par 60 minutes : buts, passes, points, tirs.
- Tentatives de tirs, tirs cadrés, différentiel de tirs et parts de possession lorsque les données autorisées existent.
- Production et différentiel par force égale / avantage numérique / désavantage numérique.
- Temps de glace, mises au jeu et rôle.
- Indicateurs de constance, échantillon et force de compétition.

### xG propriétaire
Créer un modèle Hockey Dynasty à partir d'observations de tirs dont les droits d'utilisation et de conservation sont confirmés :
- distance et angle;
- type de tir et situation;
- force égale / avantage numérique;
- rebond et séquence précédente si les champs sont autorisés;
- validation temporelle hors échantillon et calibration par saison.

Ne pas copier le modèle, les coefficients ou les scores de MoneyPuck, Evolving Hockey ou NHL. Un modèle original nécessite des données d'entraînement licites.

### Gardiens
- SV%, buts contre, tirs affrontés, charge de travail.
- Résultats par situation et par zone si la source autorise ces champs.
- Un GSAx Hockey Dynasty peut être calculé seulement à partir d'un xG propriétaire valide et de tirs/arrêts autorisés. Ne pas appeler cette métrique MoneyPuck GSAx ou Evolving Hockey GSAx.

### Impact type RAPM/GAR
Développer une régression régularisée Hockey Dynasty indépendante seulement si les événements, shifts, identifiants et temps de glace sont légalement réutilisables. Nommer les résultats HD-RAPM / HD-GAR et publier la méthodologie; ne pas réutiliser les données ou coefficients d'Evolving Hockey.

## Registre juridique obligatoire par champ

Chaque champ importé doit porter :
- `provider`, `dataset`, `sourceUrl`, `sourceCheckedAt`;
- `sourceLicense`, `commercialUseAllowed`, `redistributionAllowed`;
- `thirdPartyOrigin`, `attributionRequired`;
- `retentionRule`, `automatedAccessAllowed`;
- `derivedUseAllowed`, `displayApproved`;
- `confidence`, `season`, `lastUpdated`.

Valeurs de statut :
- `commercial_free_confirmed`
- `public_reference_only`
- `third_party_rights_unclear`
- `noncommercial_only`
- `not_authorized`
- `derived_internal`

Une source n'est pas intégrable au produit simplement parce qu'elle est gratuite, téléchargeable ou accessible via une API. Si la portée commerciale, la conservation ou la dérivation reste incertaine, classer le champ `third_party_rights_unclear` et le garder hors de la version distribuée.

## Plan de travail sans dépenses

1. Inventorier les datasets PlayerWON et leurs champs; relever la provenance et les mentions de droits propres à chaque dataset.
2. Comparer les champs PlayerWON aux 16 attributs Hockey Dynasty et au modèle CA/PA existant.
3. Auditer les endpoints fastRhockey un par un : endpoint, fournisseur d'origine, documentation de conditions, limites et droit de stockage.
4. Utiliser le code MIT comme outil seulement; ne pas intégrer les données sources dont les droits ne sont pas établis.
5. Garder Hockey.db comme fixture de test et le dépôt CC0 pour les contrats, sous réserve de provenance.
6. Construire xG et métriques d'impact propriétaires à partir de données dont les droits sont validés.
7. Exclure les sources non commerciales ou payantes du pipeline de production.
8. Ajouter une validation automatique qui bloque l'export de toute donnée dont `commercialUseAllowed` n'est pas explicitement vrai.

## Statut au 16 novembre 2026

- Aucune source payante n'a été achetée.
- Aucun abonnement ou essai payant n'a été souscrit.
- Aucun fournisseur n'a été contacté.
- Aucun courriel ou formulaire n'a été envoyé.
- Aucun contrat ou droit commercial n'a été accordé par une source tierce.
- Aucune donnée n'est déclarée intégrée par ce document.
- Ce document est une stratégie de recherche et de contrôle des droits, pas un avis juridique.

## Vérification hebdomadaire — filtre obligatoire

À chaque vérification, chercher uniquement :
- nouvelles sources gratuites et licences open source/public domain;
- changements dans les conditions commerciales gratuites de PlayerWON et autres sources ouvertes;
- nouveaux exports CSV/API explicitement autorisés;
- changements de provenance, d'attribution, de conservation, d'automatisation ou de redistribution;
- nouvelles bibliothèques libres pour calculer xG, RAPM/GAR-like et métriques de gardiens.

Ne pas proposer de devis, abonnements, essais payants ou licences payantes. Si aucune source gratuite avec droits commerciaux suffisants n'est trouvée, le dire explicitement plutôt que de la remplacer par une source payante.


## Contrôle technique ajouté le 16 novembre 2026

Le dépôt contient maintenant :
- `data/data-source-rights-registry.json` : registre initial des droits et des réserves par source;
- `scripts/lib/data-rights-gate.mjs` : fonction de contrôle bloquant les exports commerciaux si l'usage commercial, les dérivés et l'affichage ne sont pas explicitement autorisés, si la source est payante ou si les droits de tiers ne sont pas vérifiés;
- `tests/data-rights-gate.test.mjs` : tests couvrant les refus et l'autorisation explicite.

Le garde-fou est désormais branché à `scripts/import-advanced-evidence.mjs`. L'importateur refuse une source si l'usage commercial dans le jeu, les sorties dérivées, l'affichage, les droits de tiers ou l'absence de frais ne sont pas explicitement confirmés pour le dataset concerné. Il conserve ces décisions dans la provenance du fichier normalisé. Les autres pipelines d'import/export restent à raccorder au même contrôle. Le workflow GitHub Actions `.github/workflows/data-rights-gate.yml` exécute les tests du garde-fou et de l'importateur sur les changements ciblés.

Aucun fichier PlayerWON ou NHL EDGE n'a été téléchargé/importé à cette étape : les pages du Data Hub sont identifiées, mais les CSV doivent encore être audités dataset par dataset (provenance, champs, saison et conditions de tiers) avant de les charger dans la base du jeu.


## Audit PlayerWON par dataset — 2026-11-17

Le rapport `docs/playerwon-dataset-rights-audit-2026-11-17.md` détaille les colonnes, leur provenance connue et les raisons du blocage. Le registre `data/data-source-rights-registry.json` contient maintenant des décisions au niveau de chaque dataset PlayerWON NHL (joueurs, gardiens, équipes, matchs, tirs, play-by-play, shifts et disponibilité). Tous restent bloqués ou exclus tant que les droits commerciaux des sources tierces ne sont pas établis. L'importateur vérifie désormais l'identifiant exact du dataset dans ce registre central : un manifeste local qui prétend être approuvé ne peut pas contourner une décision centrale `blocked`.
