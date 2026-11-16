# Hockey Dynasty — matrice de couverture et d'autorisation des données

**Version :** 1.0  
**État :** analyse documentaire précontractuelle — 15 novembre 2026  
**Branche :** `ratings/gm-connected-methodology-v1`  
**Règle absolue :** une capacité documentée publiquement n'est pas une autorisation commerciale. Aucun champ ne doit alimenter une version distribuée avant validation écrite des droits applicables.

## 1. Légende des statuts

| Code | Signification | Utilisation permise dans le produit |
|---|---|---|
| `DOC` | La documentation consultée décrit le type de données ou le flux. | Aucune permission commerciale implicite. |
| `PARTIAL` | Couverture partielle, variable selon saison, compétition, événement ou abonnement. | Bloqué jusqu'à confirmation du champ et de la couverture contractuelle. |
| `ASK` | Capacité, champ ou droit non confirmé; question à poser au fournisseur. | Interdit en production tant que non confirmé par écrit. |
| `RESTRICTED` | Conditions publiques connues qui ne suffisent pas à autoriser l'usage commercial envisagé. | Ne pas importer pour le produit commercial sans licence/permission distincte. |
| `INTERNAL` | Calcul créé par Hockey Dynasty à partir d'entrées autorisées. | Peut être affiché seulement si le contrat source permet explicitement les sorties dérivées. |

## 2. Matrice fournisseur × catégorie de données

| Catégorie / champ canonique | Sportradar NHL | Sportradar NCAA D-I | Sportradar Global | MoneyPuck | Evolving Hockey | NHL EDGE / NHL |
|---|---|---|---|---|---|---|
| Identité, profils et effectifs | `DOC` | `DOC/PARTIAL` | `PARTIAL` | — | — | `ASK` pour feed licencié |
| Transactions / blessures | `DOC` | `ASK` | `PARTIAL/ASK` | — | — | `ASK` |
| Matchs, play-by-play, temps de glace | `DOC` | `PARTIAL/ASK` | `PARTIAL` | — | — | `ASK` |
| Tirs, zones et contexte événementiel | `DOC` | `ASK` | `PARTIAL/ASK` | `DOC` pour données de tirs | `ASK` selon métrique/export | `DOC/PARTIAL` sur le site EDGE; feed commercial à négocier |
| Corsi / Fenwick | `DOC` | `ASK` | `ASK` | `ASK` | `ASK` | `ASK` |
| xG / qualité de tir | `ASK` — ne pas présumer que les flux NHL standards l'incluent | `ASK` | `ASK` | `DOC/RESTRICTED` | `ASK` selon produit/export | `ASK` |
| RAPM / GAR / xGAR | `ASK` | `ASK` | `ASK` | — | `DOC/RESTRICTED` | — |
| Métriques avancées gardiens / GSAx | `ASK` | `ASK` | `ASK` | `DOC/RESTRICTED` selon dataset | `DOC/RESTRICTED` selon métrique | `ASK` |
| Vitesse maximale / accélérations / distance parcourue | `ASK` — non confirmé par les pages API NHL consultées | `ASK` | `ASK` | — | — | `DOC` comme catégorie EDGE publique; licence/feed et champs historiques à négocier |
| Coordonnées continues / tracking optique | `ASK` — ne pas confondre avec événements et zones de tirs | `ASK` | `ASK` | — | — | `ASK` pour export et droits |
| Droit de calculer des attributs propriétaires | `ASK` contractuel | `ASK` contractuel | `ASK` contractuel | `RESTRICTED` sans permission distincte | `RESTRICTED` sans licence distincte | `ASK` contractuel |
| Droit d'afficher dans un jeu payant | `ASK` contractuel | `ASK` contractuel | `ASK` contractuel | `RESTRICTED` sans permission distincte | `RESTRICTED` sans licence distincte | `ASK` contractuel |

**Important :** les statuts ci-dessus décrivent uniquement les documents et conditions examinés. Ils ne remplacent ni une matrice contractuelle du fournisseur, ni un échantillon de données, ni une validation juridique. `—` signifie que cette source n'est pas retenue pour cette catégorie dans le cadrage actuel, et non qu'elle est incapable de la fournir.

## 3. Couverture des compétitions à confirmer

| Compétition | Piste fournisseur | Ce qui est documenté | Ce qui doit être obtenu avant intégration |
|---|---|---|---|
| NHL | Sportradar NHL API v7 | Flux de rosters/profils, transactions, blessures, calendrier, play-by-play, TOI, faceoffs, shot zones et analyses Corsi/Fenwick; historique annoncé depuis 2013, données officielles NHL depuis 2015. | Coverage Matrix par saison et champ; payloads d'exemple; disponibilité exacte xG/GSAx/tracking; licence jeu vidéo et sorties dérivées. |
| NCAA Men's Hockey Division I | Sportradar NCAA v3 | Scores, calendriers, classements, équipes et effectifs. | Statistiques individuelles et avancées, profondeur historique, droits de stockage et d'affichage. Ne pas étendre cette couverture aux divisions II/III ou au hockey féminin sans confirmation. |
| Ligues européennes / internationales | Sportradar Global Ice Hockey v2 | Plus de 80 ligues annoncées; profondeur variable selon compétition et événement. | Liste exacte des ligues, saisons, effectifs, statistiques individuelles, identifiants et fréquence de mise à jour. |
| SHL, Liiga, Czech Extraliga, Ekstraliga, HKL | Sportradar Global | Ligues citées dans la documentation générale. | Vérifier chaque compétition et chaque champ dans la Coverage Matrix contractuelle. |
| Autres ligues, junior, ECHL, AHL, hockey féminin, autres NCAA | Sportradar / Stats Perform à sonder | Couverture non établie de façon assez précise dans les pages examinées. | Confirmation écrite compétition par compétition; ne jamais inférer la couverture à partir d'une mention générale du hockey. |

## 4. Questions obligatoires dans chaque demande de devis

1. Fournir la liste des compétitions, saisons et champs réellement inclus, avec identifiants stables des joueurs et équipes.
2. Fournir un échantillon de payload anonymisé et le dictionnaire de données.
3. Distinguer données événementielles, coordonnées de tirs, tracking continu et mesures biomécaniques.
4. Confirmer les droits d'importation, de stockage, de transformation, de calcul de métriques dérivées et d'affichage dans un jeu payant.
5. Confirmer si l'Overall 0–99, les attributs de poste, les potentiels et les agrégats de Hockey Dynasty peuvent être distribués.
6. Définir rétention, suppression, renouvellement, fin de contrat et sort des notes/attributs déjà générés.
7. Définir attribution, territoire, plateformes, nombre d'utilisateurs, modèle de revenus, audit et limites d'API.
8. Confirmer les mises à jour saisonnières et les corrections rétroactives.

## 5. Règles d'intégration dans Hockey Dynasty

- Chaque import doit porter `provider`, `provider_player_id`, `competition_id`, `season_id`, `retrieved_at`, `license_id`, `license_status` et la version du schéma.
- Chaque champ doit avoir un statut d'autorisation : `licensed_input`, `public_reference_only`, `derived_internal`, `display_approved` ou `not_authorized`.
- Refuser par défaut tout champ sans licence applicable; l'absence de statut est équivalente à `not_authorized`.
- Séparer les données brutes sous licence des calculs propriétaires et des valeurs affichées dans le jeu.
- Ne jamais copier des fichiers ou tables de fournisseurs dans un export public, un dépôt Git ou un paquet client.
- Les tests doivent utiliser des fixtures synthétiques ou des données dont les droits sont clairement compatibles avec les tests.
- Le pipeline d'importation doit rester en mode simulation / dry-run tant que l'autorisation écrite n'est pas enregistrée.
- Aucun changement de statut vers `display_approved` ne peut être automatisé à partir du seul fait qu'un champ est accessible via API.

## 6. Critères d'acceptation avant production

- [ ] Contrat ou permission écrite archivée, identifiée et datée.
- [ ] Droit explicite d'utilisation dans un jeu vidéo commercial.
- [ ] Droit explicite de produire et afficher les sorties dérivées concernées.
- [ ] Compétitions, saisons, champs et fréquence de mise à jour confirmés.
- [ ] Règles de rétention, suppression et fin de licence implémentées.
- [ ] Attribution et mentions légales intégrées si requises.
- [ ] Tests de refus pour champs `not_authorized` et `public_reference_only`.
- [ ] Validation juridique des marques, logos, noms de ligues/équipes et ressemblances de présentation, séparément des droits sur les statistiques.
- [ ] Revue humaine avant toute activation de l'import de production.

## 7. Références officielles examinées

- Sportradar NHL API v7: https://developer.sportradar.com/ice-hockey/reference/nhl-overview
- Sportradar NHL API basics: https://developer.sportradar.com/ice-hockey/docs/nhl-ig-api-basics
- Sportradar NHL historical data: https://developer.sportradar.com/ice-hockey/docs/nhl-ig-historical-data
- Sportradar NCAA Men's Hockey v3: https://developer.sportradar.com/ice-hockey/reference/ncaamh-overview
- Sportradar Global Ice Hockey v2: https://developer.sportradar.com/ice-hockey/reference/global-ice-hockey-overview
- MoneyPuck data and usage: https://moneypuck.com/data.htm
- Evolving Hockey terms: https://evolving-hockey.com/terms-of-use/
- NHL EDGE: https://www.nhl.com/edge
- NHL Consumer Product Marketing entry point: https://www.nhl.com/info/frequently-asked-questions
- Stats Perform hockey coverage FAQ: https://www.statsperform.com/faqs/stats-perform-faqs-partners-coverage/
- Stats Perform pricing and licensing FAQ: https://www.statsperform.com/faqs/stats-perform-faqs-pricing-licensing/

**Statut de ce document :** outil de planification interne. Il n'affirme pas qu'un fournisseur a été contacté, qu'une offre a été reçue, qu'un contrat existe ou que des données sont intégrées.
