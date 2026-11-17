# Contrôle des droits — logique à trois états

Date : 2026-11-17

## Objectif

La politique zéro dollar reste inchangée. Le système doit cependant distinguer une interdiction explicite d'un dossier incomplet. Une incertitude juridique ne doit pas être présentée comme une interdiction.

## États

- `commercial-free-confirmed` : toutes les permissions requises sont explicitement confirmées, la source est gratuite et les droits tiers sont établis. Import/export commercial permis.
- `review_required` : une permission, une preuve de provenance, une règle de conservation ou un droit tiers manque. Pas d'import en production, mais la source n'est pas qualifiée d'interdite.
- `prohibited` : une condition publiée interdit explicitement l'usage prévu, ou la source exige un paiement incompatible avec la politique zéro dollar. Pas d'import.
- `excluded_pending_rights` : exclu du snapshot de départ ou hors périmètre; réévaluation distincte nécessaire.
- `test-only` : fixtures synthétiques uniquement, derrière le drapeau de test existant.

## Règles de décision

1. Un booléen explicitement `false` pour l'usage commercial, les dérivés ou l'affichage signifie `prohibited`.
2. Une permission absente ou `null` signifie `review_required`, jamais `prohibited`.
3. Une source payante ou nécessitant un paiement signifie `prohibited` pour ce projet.
4. Des droits tiers non vérifiés signifient `review_required`.
5. Seul l'état `commercial-free-confirmed` peut alimenter un export commercial.
6. Le manifeste fourni avec un CSV ne peut jamais remplacer la décision du registre central par identifiant exact de dataset.
7. Une source en attente n'arrête pas les autres sources confirmées ni le développement des modèles internes.

## Décision actuelle

Les datasets NHL PlayerWON précédemment marqués `blocked` ont été reclassés `review_required` (sauf disponibilité, hors snapshot initial). Cette reclassification ne les autorise pas à entrer dans le produit : elle indique précisément que la provenance et les droits upstream restent à vérifier.

MoneyPuck, Evolving Hockey et NHL/EDGE demeurent exclus du pipeline commercial selon les restrictions décrites dans le registre et la stratégie zéro budget.

## Sécurité

Aucune permission manquante n'est supposée accordée. Aucun scraping, contournement de restriction, abonnement, essai payant ou achat de données n'est permis. Les données en attente restent hors production jusqu'à preuve documentée.
