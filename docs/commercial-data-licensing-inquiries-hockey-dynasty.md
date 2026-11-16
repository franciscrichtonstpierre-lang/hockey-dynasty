# Hockey Dynasty — dossier de demandes de licences commerciales
**Préparé le : 15 novembre 2026**  
**Statut : brouillons prêts à envoyer — aucune demande n'a été transmise.**

## 1. Présentation du projet

Hockey Dynasty est un projet de jeu de gestion et de simulation de hockey destiné à PC et Android. Le concept est un simulateur de direction générale inspiré des jeux de gestion de hockey, avec les 32 équipes de la LNH, des effectifs, contrats, espoirs, repêchages, ligues de développement et simulations de saisons.

Le projet est actuellement en développement. Une commercialisation éventuelle est envisagée, mais le modèle économique, le calendrier de sortie et la portée exacte de la distribution ne sont pas encore arrêtés.

Le système de notation utilise des attributs de joueurs de 0 à 99, des évaluations distinctes pour attaquants, défenseurs et gardiens, des potentiels et des simulations statistiques. Les données de fournisseurs ne seraient pas republiées sous forme de fichiers bruts : nous souhaitons savoir si elles peuvent être consultées, traitées et transformées en attributs et résultats dérivés intégrés au jeu.

## 2. Demande à MoneyPuck

**Contact publié :** [email protected]  
**Page officielle des données :** https://moneypuck.com/data.htm  
**Page officielle de présentation du modèle :** https://www.moneypuck.com/about.htm

### Courriel prêt à envoyer

**Subject: Commercial data licensing inquiry — Hockey Dynasty hockey management simulator**

Hello MoneyPuck team,

I am developing Hockey Dynasty, a hockey management and simulation game planned for PC and Android, with the possibility of commercial distribution.

I reviewed your public data page and understand that the downloadable datasets are offered for non-commercial use and that other uses should be discussed with you in advance.

I would like to ask whether a commercial license or written permission could be available for the following use:

- Accessing and processing your NHL shot-level data and xGoals / shot-context variables.
- Aggregating those observations by player, season and game situation.
- Using the resulting statistical features to help calculate original player attributes and ratings inside the game.
- Potentially distributing the game commercially, without redistributing your raw CSV/ZIP files or providing users with access to the underlying dataset.

Could you please clarify:

1. Whether this use is licensable and whether you offer commercial licenses.
2. Whether derived player ratings, aggregate statistics or model outputs may be included in a paid game.
3. Whether attribution is required, and what wording or placement you prefer.
4. Whether historical and future-season data are covered.
5. Whether there are restrictions on platforms, territories, number of users or duration.
6. What pricing, minimum fees or other contractual conditions would apply.
7. Whether a data feed, permitted download workflow or periodic licensed update is available.

I would be happy to provide a more detailed technical description of the game and the exact fields we would like to use.

Thank you for your time.

Best regards,  
Hockey Dynasty development team

## 3. Demande à Evolving Hockey

**Contact publié :** support@evolving-hockey.com  
**Conditions :** https://evolving-hockey.com/terms-of-use/  
**Présentation :** https://evolving-hockey.com/about/

### Courriel prêt à envoyer

**Subject: Commercial licensing inquiry — derived hockey analytics in Hockey Dynasty**

Hello Evolving Hockey team,

I am developing Hockey Dynasty, a hockey management and simulation game for PC and Android, with potential commercial distribution.

I am interested in your advanced hockey metrics, particularly RAPM, GAR, xGAR and goalie metrics, as potential inputs to an original player-rating system.

I have reviewed your Terms of Use and understand that website data is generally restricted to personal use, with a limited allowance for sharing statistical models that cite and link to Evolving Hockey.

Before using any of your data in a commercial product, I would like to ask whether a separate written license could be negotiated.

Specifically:

1. Could we license access to selected skater and goalie metrics for internal model development?
2. Could derived player ratings or aggregate outputs be displayed in a commercial game?
3. Would the license permit periodic updates for new seasons?
4. Are CSV exports or another authorized delivery format available for this purpose?
5. What attribution, restrictions on redistribution, and source-retention requirements would apply?
6. What pricing and contract terms would apply to an indie game project?

We would not redistribute raw Evolving Hockey datasets or reproduce your website tables. Our goal is to use properly licensed statistical inputs to create our own game ratings.

Thank you for considering the request.

Best regards,  
Hockey Dynasty development team

## 4. Demande à la NHL / NHL Consumer Product Marketing

**Point d'entrée officiel :** https://www.nhl.com/info/frequently-asked-questions  
Sur cette page, utiliser le formulaire Contact Us et indiquer que la demande concerne NHL Consumer Product Marketing.

**NHL EDGE :** https://www.nhl.com/edge

### Message prêt à envoyer dans le formulaire

**Subject: Commercial licensing inquiry — NHL EDGE tracking data for Hockey Dynasty**

Hello,

I am developing Hockey Dynasty, a hockey management and simulation game for PC and Android, with potential commercial distribution.

I would like to inquire about licensing opportunities for NHL statistics and NHL EDGE player-tracking data for use in a hockey simulation game.

The data categories of interest include:

- Skating speed and speed bursts.
- Player distance and movement.
- Shot speed, shot location and shot characteristics.
- Offensive- and defensive-zone time or related tracking indicators.
- Historical player and team statistics needed to calibrate player ratings.

The intended use would be to process licensed data into original player attributes, player ratings and simulation parameters. We are not seeking to redistribute raw tracking feeds.

Could you please direct me to the appropriate licensing contact and clarify:

1. Whether historical or ongoing NHL EDGE data can be licensed for this type of game.
2. Whether player-level tracking data is available in bulk or through an authorized API/feed.
3. Whether NHL statistics and EDGE tracking require separate agreements.
4. Whether derived ratings and aggregate results may appear in a commercial game.
5. Whether NHL, team, player, logo or other intellectual-property permissions are separate from the data license.
6. Applicable fees, attribution, territory, platform and distribution conditions.

Thank you for directing this inquiry to the appropriate team.

Best regards,  
Hockey Dynasty development team

## 5. Ce qu'il faut négocier dans chaque contrat

Demander une réponse écrite qui distingue clairement :

| Droit | Ce qu'il faut obtenir |
|---|---|
| Accès | Accès aux saisons et champs nécessaires |
| Traitement | Droit de calculer des métriques dérivées |
| Affichage | Droit d'afficher des cotes et agrégats dans le jeu |
| Commercialisation | Distribution dans un produit payant |
| Mises à jour | Droit de traiter les nouvelles saisons |
| Conservation | Durée de stockage des données sources |
| Redistribution | Confirmation que les fichiers bruts ne seront pas redistribués |
| Fin de licence | Sort réservé aux données historiques et aux cotes déjà publiées |
| Attribution | Texte et emplacement requis |
| Audit | Limites de vérification et obligations de rapport |

## 6. Position technique proposée

Le jeu conservera un moteur de notation propriétaire. Les fournisseurs seront des sources de variables statistiques, pas les propriétaires de l'Overall de Hockey Dynasty.

Les données envisagées :

- **Attaquants :** xG, buts au-dessus des attentes, création de tirs, entrées contrôlées, production par 60 minutes.
- **Défenseurs :** suppression des occasions, différentiel de buts attendus, contrôle des sorties de zone, métriques d'impact.
- **Gardiens :** GSAx, qualité des tirs affrontés, arrêts à haut danger, contrôle des rebonds et charge de travail.

Les résultats seraient normalisés par saison, ligue, poste et rôle, avec gestion de la taille des échantillons et de la confiance. Aucune métrique externe ne serait automatiquement assimilée à un attribut de jeu sans calibration.

## 7. Ordre recommandé

1. MoneyPuck : demande de permission commerciale et de droits sur les variables xG.
2. Evolving Hockey : demande de licence sur les données et les sorties dérivées.
3. NHL : demande de contact pour les statistiques et les données EDGE.
4. Comparer les propositions, les prix et les restrictions.
5. N'intégrer que les sources ayant une autorisation écrite suffisante.

## 8. Informations à compléter avant envoi

- Nom légal du développeur ou de l'entreprise : à confirmer.
- Pays de l'entité contractante : Canada, à confirmer.
- Nom commercial : Hockey Dynasty.
- Site web du jeu : non disponible / à confirmer.
- Modèle de revenus : non décidé (achat unique, abonnement, autre).
- Date de lancement : non déterminée.
- Prévision de ventes ou nombre d'utilisateurs : non déterminé.
- Plateformes prévues : PC et Android.
- Territoires de distribution : à négocier, aucune portée mondiale présumée.

**Important :** ne pas inventer de société, de coordonnées, de ventes projetées ou d'engagements commerciaux. Ces brouillons ne constituent pas un avis juridique ni une licence. Aucune donnée protégée ne doit être intégrée à une version distribuée avant l'autorisation requise.


## 10. Alternative commerciale à évaluer — Sportradar (vérification documentaire du 15 novembre 2026)

**Documentation officielle :**
- NHL API v7 : https://developer.sportradar.com/ice-hockey/reference/nhl-overview
- NHL API Basics : https://developer.sportradar.com/ice-hockey/docs/nhl-ig-api-basics
- NHL historical data : https://developer.sportradar.com/ice-hockey/docs/nhl-ig-historical-data
- NCAA Men's Hockey API v3 : https://developer.sportradar.com/ice-hockey/reference/ncaamh-overview
- Global Ice Hockey API v2 : https://developer.sportradar.com/ice-hockey/reference/global-ice-hockey-overview
- Coverage Matrix : accessible depuis les pages de documentation ci-dessus.

### Ce que la documentation confirme

- **NHL :** API B2B authentifiée, réponses JSON ou XML, plus de 30 flux documentés. Les flux comprennent les effectifs actifs, profils de joueurs, blessures, transactions quotidiennes, feuilles de match, play-by-play, temps de glace, mises au jeu, tirs par zone, statistiques saisonnières et analyses Corsi/Fenwick. Des flux Push sont proposés aux clients temps réel.
- **Historique NHL :** données annoncées à partir de la saison 2013; les données officielles NHL sont utilisées depuis 2015. Certains champs ne sont pas nécessairement disponibles pour les saisons anciennes.
- **NCAA Men's Hockey :** API séparée couvrant le hockey masculin Division I, avec scores, calendriers, classements, équipes et effectifs. La documentation indique une couverture nettement moins profonde que l'API NHL; ne pas supposer qu'elle fournit des statistiques individuelles avancées équivalentes.
- **Global Ice Hockey :** API distincte annonçant plus de 80 ligues, dont SHL, Liiga, Czech Extraliga, Ekstraliga et HKL. Elle fournit selon la compétition des profils, effectifs, résultats historiques, statistiques saisonnières et données en direct. La disponibilité exacte et la profondeur varient par ligue et événement; vérifier la Coverage Matrix avant tout engagement.
- **Limite tracking :** les pages NHL examinées documentent les données événementielles et positionnelles, tirs par zone, analyses Corsi/Fenwick et temps de glace. Elles ne documentent pas explicitement un flux complet de tracking biomécanique du type vitesse maximale, accélérations et distance parcourue par joueur. Ces champs doivent être demandés et confirmés séparément; ne pas les considérer comme inclus.

### Accès, prix et droits

L'accès à l'API nécessite une authentification et un compte client. La documentation technique publique ne constitue pas une offre tarifaire ni une licence autorisant automatiquement l'utilisation dans un jeu commercial. Aucun tarif ferme, droit d'affichage dans un jeu vidéo, droit de stockage à long terme, droit de calcul/affichage de métriques dérivées, ni droit de redistribution n'a été confirmé par les pages examinées.

Demander une proposition écrite pour un développeur indépendant canadien, incluant :
1. Un forfait de développement/test et ses limites de requêtes.
2. Un devis commercial pour PC et Android, achat unique ou autre modèle encore à déterminer.
3. Les droits sur les données historiques et les mises à jour futures.
4. Le stockage des données et des identifiants de joueurs après expiration du contrat.
5. Le droit de calculer et d'afficher des attributs propriétaires (Overall 0–99, attributs de poste, potentiels et agrégats).
6. Les droits de distribution par territoire, plateformes et nombre d'utilisateurs.
7. Les champs exacts pour chaque ligue et chaque saison, avec exemple de payload et Coverage Matrix.
8. La disponibilité réelle des mesures EDGE/tracking (vitesse, accélérations, distance, coordonnées), sans assimiler les événements play-by-play au tracking optique.

### Brouillon de demande Sportradar

**Subject: Hockey data licensing inquiry for an independent hockey management game (PC/Android)**

Hello Sportradar team,

I am an independent developer based in Canada, currently developing Hockey Dynasty, a hockey management and simulation game for PC and Android. I am evaluating a possible commercial release in the future and would like to understand your licensing options before selecting data providers.

I reviewed your NHL API v7, NCAA Men's Hockey and Global Ice Hockey documentation. I am interested in a potential license for historical and ongoing player, team and game data, including rosters, player profiles, transactions, injuries, time on ice, play-by-play, shot zones, seasonal statistics and game analytics.

Could you please advise:

1. Which NHL, NCAA Men's Hockey and Global Ice Hockey packages could be licensed for a commercial PC/Android game, and which specific leagues/seasons/player-level fields are included?
2. What are the available development/trial options, request limits and commercial pricing for an independent developer?
3. Do the NHL feeds include player tracking measurements such as skating speed, acceleration, distance and continuous player coordinates, or only event/shot-zone and play-by-play information? If tracking is separate, who licenses it?
4. May we calculate and display our own derived player ratings and attributes from licensed data, without exposing or redistributing raw feeds?
5. What are the rules for historical storage, refreshes, attribution, end-user display, territories, user counts and data retention after termination?
6. Can the license cover future seasons and additional leagues as Hockey Dynasty grows?

I would appreciate a coverage matrix and a sample schema for the relevant feeds, together with an indicative quote and the applicable licensing terms.

Thank you for your guidance.

Best regards,
Hockey Dynasty — independent developer

### Statut de la piste

**À contacter — aucune relation commerciale établie.** Les documentations confirment les API et leurs grandes catégories de couverture, mais pas les droits, les prix ni la présence d'un flux complet de tracking. Le dossier ne prétend pas que Sportradar est déjà licencié ou intégré.

## 11. Autre fournisseur à sonder — Stats Perform / Opta

- FAQ officielle de prix et licences : https://www.statsperform.com/faqs/stats-perform-faqs-pricing-licensing/
- FAQ officielle couverture hockey : https://www.statsperform.com/faqs/stats-perform-faqs-partners-coverage/
- Données granulaires : https://www.statsperform.com/fr/products/granular-data/

Stats Perform indique couvrir un éventail de compétitions de hockey et propose des licences personnalisées par compétition, pays ou niveau de données. Ses tarifs sont établis sur devis; sa documentation indique qu'il travaille aussi avec des startups et petites organisations. Les pages publiques ne permettent toutefois pas d'identifier exactement les ligues de hockey, les champs individuels, la disponibilité de données de tracking, ni les droits d'utilisation dans Hockey Dynasty.

**Action :** demander une liste de compétitions de hockey couvertes, un exemple de flux joueur/événement, les saisons historiques, la profondeur des statistiques avancées et un devis indépendant/jeu vidéo. Ne pas présumer que la couverture annoncée pour le sport hockey signifie une couverture de toutes les ligues souhaitées.

## 12. Architecture de données recommandée pour limiter le risque de licence

Conserver trois couches séparées :
1. **Source sous licence :** données brutes minimales, isolées par fournisseur, avec identifiant de licence, champs permis, dates d'acquisition, saison, rétention et règles de suppression.
2. **Calcul interne :** transformations, pondérations et modèle de notation Hockey Dynasty, avec traçabilité des champs d'entrée et version de l'algorithme.
3. **Sortie du jeu :** attributs et cotes autorisés par le contrat, sans export des données brutes ou reconstruction des tables sources.

Chaque champ du schéma normalisé doit avoir un statut : `licensed_input`, `public_reference_only`, `derived_internal`, `display_approved` ou `not_authorized`. Un champ ne passe pas en production parce qu'il est accessible techniquement : il faut une autorisation écrite couvrant l'usage prévu.

Exemple de champs à demander aux fournisseurs : `provider_player_id`, `season_id`, `competition_id`, `games_played`, `toi_seconds`, `shots`, `shot_location`, `shot_type`, `xg`, `corsi_for`, `fenwick_for`, `faceoff_wins`, `goalie_saves`, `goals_saved_above_expected`, `tracking_top_speed`, `tracking_distance`, `tracking_accelerations`. Ces noms sont des champs canoniques souhaités, pas une affirmation que chaque fournisseur les propose.

**Priorité de négociation :** Sportradar pour la base NHL transactionnelle/statistique et les ligues internationales; MoneyPuck pour xG si les droits commerciaux sont négociables; Evolving Hockey pour les métriques avancées si les droits de sorties dérivées sont négociables; NHL/EDGE ou un détenteur autorisé pour le tracking réel; Stats Perform comme deuxième devis multi-compétitions.
