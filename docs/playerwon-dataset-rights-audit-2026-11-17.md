# PlayerWON NHL Data Hub — audit par jeu de données

Date de vérification : 2026-11-17  
Politique de coût : 0 $ strict; aucun abonnement, essai payant, licence payante ou devis.  
Décision d'import : **aucun dataset NHL PlayerWON n'est approuvé pour l'instant**.

## Règle d'interprétation

La politique PlayerWON mise à jour le 2026-11-13 autorise gratuitement le téléchargement, l'analyse, l'adaptation et le partage des jeux de données créés par PlayerWON et de ses analyses originales, y compris dans un contexte commercial. Elle précise expressément que cette permission ne couvre que les droits contrôlés par PlayerWON et ne concède pas les droits sur les contenus de tiers (notamment les sources NHL, les données de bookmakers, photos, logos et marques). La page de transparence indique que les événements et informations de tirs proviennent de flux NHL, tandis que les estimations xG sont calculées par le modèle PlayerWON.

Conséquence : la gratuité d'un CSV et la permission commerciale générale de PlayerWON ne suffisent pas à autoriser l'exploitation commerciale de toutes ses colonnes. Les champs qui reproduisent ou dérivent de flux NHL restent bloqués tant que les droits correspondants ne sont pas établis. Aucun contenu NHL/EDGE n'est réputé autorisé par défaut.

## Inventaire et décision provisoire

| Dataset | Page officielle | Champs / grain observés | Origine connue / risque | Décision |
|---|---|---|---|---|
| Joueurs | https://www.playerwon.ca/data/nhl/players/ | Une ligne par joueur-saison; équipe, GP, buts, aides, points, tirs, %, mises en échec, tirs bloqués, +/- et TOI | Statistiques NHL saisonnières; la page ne prouve pas que PlayerWON détient les droits sous-jacents | BLOQUÉ |
| Gardiens | https://www.playerwon.ca/data/nhl/goalies/ | Une ligne par gardien-saison; GP, W/L/OT, SV%, GAA, blanchissages, tirs contre, arrêts, TOI | Statistiques NHL saisonnières | BLOQUÉ |
| Équipes | https://www.playerwon.ca/data/nhl/teams/ | Une ligne par équipe et date de snapshot; classement, points, buts pour/contre, différentiel | Données de classement NHL | BLOQUÉ |
| Matchs | https://www.playerwon.ca/data/nhl/games/ | Une ligne par match; date, équipes, scores, tirs, issue REG/OT/SO | Page PlayerWON précise que les scores et totaux sont tirés de la couverture NHL; champs source à auditer | BLOQUÉ |
| Tirs | https://www.playerwon.ca/data/nhl/shots/ | Une ligne par tentative; événements, tireur, coordonnées, distance, angle, force, issue, xG versionné | Événements et informations de tir NHL; xG calculé par PlayerWON. Le score xG est une création PlayerWON mais dépend d'événements de tiers | BLOQUÉ; xG candidat à réexamen séparé, pas d'import actuellement |
| Play-by-play | https://www.playerwon.ca/data/nhl/play-by-play/ | Une ligne par événement; identifiants, horloge, joueurs, coordonnées, code de situation, score, JSON brut | La page indique que les coordonnées sont les coordonnées originales de la patinoire NHL; raw_event_json préserve l'événement source | BLOQUÉ |
| Shifts | https://www.playerwon.ca/data/nhl/shifts/ | Intervalles de présence et temps de glace depuis 2016-17 | Données de shift issues de flux NHL; droits tiers non démontrés | BLOQUÉ |
| Disponibilité | https://www.playerwon.ca/data/nhl/availability/ | Joueur, équipe, match, statut projeté/blessé/retiré/suspendu, détail, horodatage, qualité | Sources de lineups/availability et données personnelles/tiers; non nécessaire à la base de départ Hockey Dynasty | EXCLU du dataset de départ; droits non validés |

## Champs xG et GSAx

La page de transparence PlayerWON affirme que son xG est calculé par son propre modèle V1 à partir des événements et informations de tirs fournis par les flux NHL; GSAx et finishing-above-xG sont calculés à partir de ces scores. Cela établit la paternité du calcul xG par PlayerWON, mais ne règle pas à lui seul les droits d'exploitation commerciale des événements d'entrée, des identifiants ou des sorties dérivées de données NHL. Ces champs restent donc en attente de clarification gratuite et écrite ou d'une licence upstream gratuite déjà publiée qui couvre précisément cet usage.

## Limites sportives et techniques pour Hockey Dynasty

- Le Data Hub audité ici est NHL; il ne fournit pas à lui seul la base mondiale de prospects junior, NCAA, AHL et Europe exigée par le jeu.
- Les statistiques NHL de saison ne remplacent pas les évaluations d'habiletés. Elles peuvent contribuer à SH/PL/OFF/DEF seulement après autorisation et normalisation par ligue, saison, position, rôle et taille d'échantillon.
- Les mesures de tracking NHL EDGE ne doivent pas être inférées à partir de vitesses ou d'événements ordinaires.
- Les données d'alignement, blessures, scratches et suspensions ne doivent pas entrer dans le snapshot initial de roster, conformément à la règle de conception du projet.
- L'absence d'une métrique doit rester « inconnue »; ne pas inventer un score 0 et ne pas gonfler artificiellement la confiance.
- L'importateur actuel n'accède pas au réseau et ne télécharge pas ces CSV. Il traite uniquement des exports fournis localement et exige un manifeste de droits approuvé par dataset.

## Conditions minimales avant tout import

Pour chaque fichier exporté, conserver un manifeste dédié comprenant : URL exacte du dataset; date d'accès; saison et filtres; nom et version du CSV; liste complète des colonnes; provenance déclarée de chaque colonne; licence/politique et date de vérification; preuve de droits commerciaux pour le jeu; droits sur les transformations/dérivés; droits d'affichage; droits de redistribution du jeu et de ses exports; statut des droits tiers; attribution; conservation; restrictions d'automatisation; décision et approbateur.

Une approbation du site entier ne doit jamais être propagée à toutes les lignes/colonnes. En cas d'ambiguïté, la colonne et le dataset restent bloqués. Ne jamais contourner une restriction par scraping, copie manuelle, changement de format ou calcul dérivé.

## Sources officielles examinées

- PlayerWON, Data Use & Citation (mise à jour 2026-11-13): https://www.playerwon.ca/data-use/
- PlayerWON, NHL Data Hub: https://www.playerwon.ca/data/nhl/
- PlayerWON, How Our Data Works / Transparency: https://www.playerwon.ca/transparency/
- PlayerWON, Player data: https://www.playerwon.ca/data/nhl/players/
- PlayerWON, Goalie data: https://www.playerwon.ca/data/nhl/goalies/
- PlayerWON, Team data: https://www.playerwon.ca/data/nhl/teams/
- PlayerWON, Game data: https://www.playerwon.ca/data/nhl/games/
- PlayerWON, Shot data: https://www.playerwon.ca/data/nhl/shots/
- PlayerWON, Play-by-play: https://www.playerwon.ca/data/nhl/play-by-play/
- PlayerWON, Shift data: https://www.playerwon.ca/data/nhl/shifts/
- PlayerWON, Availability: https://www.playerwon.ca/data/nhl/availability/

## État d'exécution

- CSV téléchargés/importés : aucun.
- Données intégrées aux ratings/OA de production : aucune.
- Autorisation tierce confirmée pour ces jeux NHL : aucune.
- Dépense engagée : 0 $.


## Mise à jour hebdomadaire — 2026-11-23

### État des pages et exports

- La politique Data Use & Citation est toujours affichée comme mise à jour le 2026-11-13; aucun changement de permission n'a été observé depuis la dernière revue.
- Les pages avancées continuent d'exposer des tableaux xG/xGA/xGD et des exports CSV pour les analyses joueurs, gardiens et équipes. Les pages actuelles couvrent la saison 2026-27 en cours, mais leur présence ne prouve pas une couverture complète des rosters ou des espoirs.
- La page xG distingue les sorties du modèle V1 PlayerWON des événements de tirs sous-jacents. Le calcul xG est original à PlayerWON, mais les événements, identifiants et contextes de tirs proviennent des flux NHL.
- La politique permet le téléchargement, l'analyse, l'adaptation et le partage des jeux de données créés par PlayerWON et de ses analyses originales pour l'analyse commerciale; elle ne concède pas les droits des sources tierces. Elle demande de conserver une copie du téléchargement utilisé pour l'analyse, mais ne décrit pas explicitement une rétention longue durée dans un jeu commercial.
- Les exports CSV sont une voie de téléchargement publiée. Aucune permission générale d'automatisation, d'accès API ou de scraping des pages de prévisualisation n'a été confirmée. L'accès automatisé ne doit pas être ajouté au pipeline.

### Décision actualisée par famille

| Famille | Décision au 2026-11-23 | Motif |
|---|---|---|
| Statistiques joueurs/gardiens, équipes et matchs | BLOQUÉ | Champs de flux NHL; droits amont non accordés |
| Tirs et événements bruts | BLOQUÉ | Événements et identifiants NHL; la permission PlayerWON ne couvre pas les tiers |
| xG/xGA/xGD originaux PlayerWON | EN ATTENTE | L'analyse originale est couverte par la politique PlayerWON, mais les entrées NHL, la rétention produit et l'attribution dans le jeu ne sont pas toutes confirmées |
| GSAx / finishing-above-xG | EN ATTENTE | Dérivés de l'xG PlayerWON et des résultats NHL; les droits amont restent à résoudre |
| Shifts et play-by-play | BLOQUÉ | Données événementielles et de présence issues des flux NHL |
| Availability | EXCLU | Non requis pour le snapshot initial et droits tiers non validés |

### Conséquence pour Hockey Dynasty

Aucun fichier PlayerWON n'a été téléchargé ou importé. Aucun rating, OFF, DEF, OA ou potentiel n'a été recalculé à partir de PlayerWON. Le modèle xG propriétaire, le GSAx propriétaire et les métriques d'impact de type RAPM/GAR ne doivent pas être entraînés sur ces événements tant que les droits de la source amont ne sont pas explicitement établis par des conditions gratuites publiées.