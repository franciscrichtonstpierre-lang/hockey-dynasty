# Données de contrats — Hockey Dynasty

Cette base distingue les données officielles vérifiables des évaluations de jeu.

## Champs à conserver
- Salaire annuel réel de la saison et bonus de signature, distincts du cap hit.
- Cap hit / valeur annuelle moyenne (AAV) et durée du contrat.
- Date de signature, saison de début et de fin, statut RFA/UFA.
- Contrat à un ou deux volets et salaire applicable en LAH, lorsqu'il est publié.
- Clauses de non-échange / non-mouvement, retenues salariales et source datée.

## Sources de référence
- PuckPedia — fiches d'équipe et contrats : https://puckpedia.com/teams
- CapWages — tableaux du plafond salarial : https://capwages.com/
- LivingHockey — données de contrats et années salariales : https://livinghockey.com/contracts
- Annonces officielles des équipes et de la LNH pour confirmer les signatures, les clauses et la durée.

## Règles de vérification
1. Chaque valeur de contrat doit avoir une URL source et une date de vérification.
2. Ne jamais traiter le cap hit comme le salaire réellement payé cette saison.
3. Si les sources divergent, marquer le champ à vérifier au lieu de choisir arbitrairement.
4. Utiliser null et le statut PARTIAL/UNVERIFIED pour les champs inconnus; ne pas inventer.
5. Un cap hit retenu après une transaction doit être attribué séparément de l'équipe qui détient le joueur.
6. Les données d'une saison future ne doivent pas être présentées comme confirmées si les signatures ou transactions peuvent encore changer.

## Limite actuelle
Le projet ne possède pas encore de fichier complet de contrats vérifiés. Ce document fixe le standard d'importation; il ne signifie pas que les 32 masses salariales ou tous les contrats sont déjà intégrés.
