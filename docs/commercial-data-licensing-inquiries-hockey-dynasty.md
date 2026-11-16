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


## 9. Présentation du demandeur retenue

**Positionnement à utiliser dans les demandes : développeur indépendant (particulier) au stade de développement, avec possibilité de constituer une entreprise avant ou lors d'une commercialisation future.**

Formulation anglaise recommandée :

"I am an independent game developer currently developing Hockey Dynasty. I am evaluating the possibility of forming a company and commercially releasing the game in the future. At this stage, I am seeking information about licensing options, requirements and indicative pricing for a potential commercial release."

Ne pas présenter Hockey Dynasty comme une société déjà constituée. Ne pas inventer de raison sociale, numéro d'entreprise, adresse commerciale, site web, prévisions de ventes ou date de lancement. Si un fournisseur exige une entité juridique pour établir un contrat, lui demander s'il peut d'abord fournir une estimation indicative ou un processus de préqualification pour un développeur indépendant.

**Identité contractuelle :** à compléter par le développeur si et quand le fournisseur demande les renseignements légaux nécessaires. Le pays du projet peut être indiqué comme Canada, sous réserve de confirmer l'entité et l'adresse de facturation au moment de la demande.
