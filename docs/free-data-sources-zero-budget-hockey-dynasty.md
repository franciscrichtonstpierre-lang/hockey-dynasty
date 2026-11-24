# Hockey Dynasty — stratégie de données gratuites uniquement

**Vérification documentaire initiale : 16 novembre 2026 — dernière revue : 23 novembre 2026**  
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


## Vérification hebdomadaire — 23 novembre 2026

### Changements depuis la revue du 17 novembre

- La branche `ratings/gm-connected-methodology-v1` n'avait reçu aucun nouveau commit depuis le 17 novembre avant cette revue. Les anciens résultats de ratings et les contrats n'ont pas été modifiés par cet audit.
- Une source historique intéressante a été retrouvée : Hockey Databank v13.0, avec fichiers CSV publics et un avis qui autorise expressément un produit commercial à condition d'afficher une attribution complète et un avertissement d'exactitude. Le jeu est toutefois arrêté à la saison 2017-18; les droits de conservation à long terme et la provenance de certaines sources de compilation doivent être validés avant stockage de production.
- Wikidata confirme que toutes ses données structurées sont sous CC0. C'est une source commercialement réutilisable pour l'identité et les métadonnées biographiques, mais pas une source de statistiques de performance ni un registre complet des espoirs. L'API et les dumps sont gratuits; respecter le User-Agent, les requêtes sérielles, le cache et `maxlag`.
- Wikipedia confirme CC BY-SA 4.0 (et GFDL pour la plupart du texte). L'usage commercial est permis, mais les adaptations partagées doivent rester sous CC BY-SA 4.0 ou une licence compatible, avec attribution et indication des modifications. Cette contrainte peut toucher les tableaux dérivés et les ratings distribués; aucun import avant décision sur le share-alike.
- fastRhockey confirme MIT pour le code. Le dépôt `sportsdataverse-data` déclare CC BY 4.0 pour ses données, mais les releases NHL identifient `api-web.nhle.com` comme source amont. Le release `nhl_pbp_full` couvre 18 saisons (2010-2027), environ 8,8 Go, avec les fichiers 2027 actualisés le 23 novembre à 08:03 UTC. La licence CC BY 4.0 du dépôt ne neutralise pas les conditions NHL : le contenu NHL reste exclu de la version commerciale.
- La release `nhl_xg_models` de SportsDataverse apparaît dans les releases « unattributed », sans producteur public. Sa provenance, ses poids et les droits de ses données d'entraînement ne sont pas établis; ne pas copier ces modèles.
- Big Data Cup 2026 fournit bien événements, shifts et tracking de joueurs issus de vidéo, mais le fichier juridique Stathletes limite les recherches issues du jeu de données à un usage non lucratif. Source exclue pour le jeu commercial, y compris pour entraîner xG/GSAx/RAPM.
- SCORE publie un CSV de 160 573 tirs NHL 2021-22 avec coordonnées, angle, distance et issue. La page ne publie pas de licence de réutilisation; les données proviennent de `hockeyR`/NHL. Source exclue.
- Ice Hockey API offre une clé gratuite à 50 appels/jour et 10/minute. Ses conditions permettent d'afficher les résultats de l'API dans ses propres applications, mais interdisent la redistribution en masse et la reconstruction d'une base concurrente. Les conditions ne confirment pas clairement l'usage commercial ni la conservation longue durée; la grille de plans exclut les lineups, statistiques joueurs/gardiens et play-by-play du plan gratuit. Source non approuvée pour les ratings.
- La politique PlayerWON demeure celle du 13 novembre 2026; aucun changement de droit publié n'a été trouvé. Les tableaux xG/xGA/xGD et exports CSV sont visibles, mais les événements/identifiants sous-jacents proviennent des flux NHL. L'autorisation PlayerWON ne couvre que les droits qu'il contrôle; la conservation de production et l'automatisation ne sont pas suffisamment explicites. Tous les datasets NHL restent bloqués.
- MoneyPuck reste non commercial/journalisme ponctuel seulement. Evolving Hockey reste personnel seulement et interdit les bots/copies automatiques. EliteProspects affiche un plan commercial à 990 $ US/an; il est exclu. Les conditions NHL consultées restent limitées à l'usage privé non commercial et interdisent la création de dérivés. Aucun changement gratuit commercial complet confirmé pour Sportradar, Stats Perform ou HockeyTech.

### Matrice de décision mise à jour

| Source | Accès / export | Code / données | Commercial gratuit et droits nécessaires | Statut |
|---|---|---|---|---|
| Wikidata | API et dumps publics | Données structurées CC0 | Oui : commercial, dérivés, affichage et conservation; attribution non obligatoire | **GRATUIT COMMERCIAL CONFIRMÉ**, métadonnées seulement; couverture à auditer |
| Hockey Databank v13.0 | CSV publics via GitHub | Avis d'utilisation propre au projet | Produit commercial explicitement permis; attribution exacte obligatoire; conservation et provenance détaillée à confirmer; pas de redistribution brute | **INCERTAIN / candidat historique**, bloqué avant import |
| Wikipedia | MediaWiki API et dumps | CC BY-SA 4.0 / GFDL selon le contenu | Commercial permis; attribution, historique des modifications et share-alike requis pour les adaptations partagées | **INCERTAIN / conditionnel**, pas de ratings propriétaires avant décision |
| PlayerWON NHL | CSV publics | Analyses originales PlayerWON; champs bruts d'origine mixte | Permission commerciale pour les contenus contrôlés par PlayerWON; droits NHL, rétention de produit et automatisation non confirmés | **INCERTAIN**, tous les datasets NHL bloqués |
| fastRhockey (code) | Dépôt et package publics | MIT pour le code | Code réutilisable commercialement; aucune licence globale sur les données des API | **CONFIRMÉ POUR LE CODE SEULEMENT** |
| SportsDataverse NHL releases | Releases CSV/Parquet/RDS | CC BY 4.0 déclaré pour les données du dépôt; NHL API en amont | Les conditions NHL restent non commerciales; aucun droit commercial sur les données NHL | **NON COMMERCIAL / EXCLU** |
| Ice Hockey API (clé gratuite) | 50 appels/jour, 10/minute | Conditions propres au service | Affichage dans ses applications permis; commercial et rétention non explicites; redistribution en masse interdite | **INCERTAIN**, pas de données joueurs dans le plan gratuit |
| Big Data Cup 2026 / Stathletes | Releases GitHub | Accord Stathletes | Recherche publique autorisée seulement si non lucrative | **NON COMMERCIAL / EXCLU** |
| SCORE — tirs NHL 2021-22 | CSV public, 160 573 tirs | Licence de données absente; source hockeyR/NHL | Aucun droit commercial/stockage/dérivé confirmé | **EXCLU** |
| OpenSport hockey.db | Fichiers texte publics | Domaine public déclaré | Droits publics confirmés, mais le fichier examiné est un calendrier 2015-16 | **CONFIRMÉ POUR FIXTURE HISTORIQUE SEULEMENT** |
| ehlersio/nhl-contracts | Dépôt public | CC0 pour les données déclarées | Source déjà utilisée dans le pipeline des contrats | **DÉJÀ TRAITÉ**; ne pas rouvrir le chantier contrats |

### Faisabilité des métriques avancées

- **xG Hockey Dynasty :** aucun jeu de tirs avec coordonnées, contexte et issues n'est actuellement approuvé pour l'entraînement commercial. Hockey Databank fournit des totaux saisonniers, pas des événements de tirs. SCORE et Big Data Cup ont les champs utiles mais ne sont pas autorisés commercialement; PlayerWON et SportsDataverse restent liés aux flux NHL.
- **GSAx Hockey Dynasty :** nécessite un xG propriétaire entraîné sur des tirs autorisés, ainsi que les résultats de tirs/arrêts autorisés. Aucun couple de données autorisé n'est confirmé.
- **RAPM/GAR-like :** nécessite des événements par joueur, shifts, temps de glace et présences sur la glace. Les jeux les plus riches repérés (SportsDataverse NHL, PlayerWON, Big Data Cup) sont bloqués ou non commerciaux. Aucun calcul de production ne doit être lancé à partir de ces sources.
- Ne copier aucun coefficient, modèle, table ou score de MoneyPuck ou Evolving Hockey. Le code MIT de fastRhockey peut servir d'outil ou de référence, mais pas ses données NHL ni ses poids de modèles non attribués.

### Décision et prochaines étapes gratuites

1. Wikidata est le seul nouvel apport approuvé par licence pour l'identité et les métadonnées; auditer sa couverture avant d'écrire un importeur.
2. Garder Hockey Databank en attente jusqu'à clarification/documentation de la rétention et de la provenance, puis prévoir l'attribution complète dans l'interface si retenu.
3. Décider si une couche de données et des dérivés CC BY-SA sont acceptables avant toute utilisation de tables Wikipedia.
4. Garder PlayerWON, NHL/EDGE, SportsDataverse NHL, SCORE, Big Data Cup, MoneyPuck et Evolving Hockey hors du pipeline commercial tant que les droits publiés ne changent pas explicitement.
5. Continuer la recherche de données événementielles et de shifts réellement libres commercialement; aucun modèle xG/GSAx/RAPM ne peut être entraîné pour la production avec les sources actuellement approuvées.

Aucun CSV n'a été importé, aucune cote/OA n'a été modifiée, aucun droit nouveau n'a été accordé, aucun fournisseur n'a été contacté, aucune donnée n'a été scrapée et aucune dépense n'a été engagée. Les contrats et cap hits déjà terminés restent intacts.

### Renforcement du garde-fou des droits — 23 novembre 2026

Le garde-fou commercial vérifie maintenant aussi :
- le droit explicite de conserver/stocker les données;
- la présence et l'implémentation de l'attribution obligatoire;
- la conformité share-alike lorsqu'une licence l'exige.

Un dataset dont la conservation est inconnue, dont le crédit n'est pas encore affiché ou dont le share-alike n'est pas traité reste bloqué. Wikidata CC0 est approuvé pour un futur import de métadonnées; aucun import n'a été effectué pendant cette revue.


### Blocage du snapshot NHL Stats REST — 23 novembre 2026

Le fichier existant `data/ratings.json` porte explicitement la source « NHL Stats REST regular-season statistics » pour 2025-26. Les conditions NHL consultées ne permettent pas de traiter ces données comme une source commerciale. Le fichier n'a pas été supprimé ni recalculé; il reste un snapshot de développement non autorisé pour une sortie commerciale.

Pour éviter toute nouvelle ingestion non autorisée :
- le registre contient maintenant `nhl_stats_rest_2025_2026` avec le statut `prohibited`;
- `scripts/build-ratings.mjs` vérifie le registre avant tout appel réseau et bloque ce dataset;
- `.github/workflows/refresh-ratings.yml` est passé en déclenchement manuel seulement; la planification quotidienne et le déclenchement sur push sont suspendus tant qu'aucune source gratuite commerciale n'est approuvée;
- le dernier essai automatique avait échoué avant l'écriture des fichiers parce que l'API ne retournait que 100 patineurs et 98 gardiens; aucun rating n'a été remplacé.

Le snapshot existant peut rester utile au développement local, mais il ne doit pas être expédié dans une version commerciale. Le pipeline ne pourra reprendre qu'avec une source qui passe le garde-fou complet.


### Suspension préventive de la synchronisation multi-ligues — 23 novembre 2026

L'ancien workflow `.github/workflows/sync-nhl-data.yml` était déclenché sur push et chaque jour. Il téléchargeait des données NHL, AHL, ECHL, junior, NCAA et européennes, puis publiait sur `main`. Les scripts montrent notamment NHL Web API, HockeyTech/LeagueStat, College Hockey Inc, College Hockey News, SHL, Liiga, HockeyAllsvenskan, EliteProspects, Draft Prospects Hockey et RinkCentral. Les droits commerciaux gratuits ne sont pas confirmés pour ces flux.

Un run déjà commencé le 23 novembre a terminé les téléchargements dans son runner, mais le test global a échoué sur l'override de potentiel `nhl:8484799`. L'étape de publication a été ignorée; aucun fichier de données n'a été poussé sur `main`.

Mesures appliquées :
- le workflow multi-ligues est maintenant manuel seulement; son déclenchement quotidien et les déclenchements sur push sont retirés;
- une vérification centrale des droits précède tout téléchargement et bloque tant que chaque source de ligue n'a pas un statut commercial confirmé, avec droits de calcul, affichage, conservation, provenance, attribution et share-alike vérifiés;
- les étapes suivantes utilisent `if: success()`, donc aucune synchronisation ne démarre si le contrôle échoue;
- l'étape de synchronisation des contrats a été retirée de ce workflow : contrats, salaires et cap hits sont déjà terminés et ne sont pas à refaire;
- la synchronisation des choix de repêchage reste bloquée avec les autres sources NHL tant que ses droits ne sont pas confirmés.

Ce verrouillage ne supprime pas les fichiers déjà présents et ne modifie aucun rating; il empêche leur actualisation/publication par les sources non autorisées.