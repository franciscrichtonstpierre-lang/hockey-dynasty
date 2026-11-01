# Espoirs des prochains repêchages NHL

Le registre `2027-2029.json` rassemble les espoirs recensés dans le Draft Center d'Elite Prospects, la page de classe 2027 de Draft Prospects Hockey, un instantané de repli pour 2028–2029 et une liste de surveillance préliminaire publiée par Daily Faceoff. Au dernier enrichissement, il contient 102 profils pour 2027, 32 pour 2028 et 3 candidats préliminaires pour 2029.

- La liste source, son année de repêchage et le rang publié sont conservés séparément.
- Le rang de source n'est pas un ordre officiel de sélection ni une prédiction garantie.
- Les joueurs non repêchés ne reçoivent aucun droit LNH attribué par défaut.
- Les cotes de simulation sont identifiées comme provisoires si elles ne viennent pas d'une source de cotes.
- La synchronisation tente Elite Prospects en premier, mais ce site renvoie actuellement HTTP 403 aux robots de GitHub Actions. Le script utilise donc une source alternative pour 2027 et un instantané de repli pour 2028–2029. Ces deux dernières cuvées ne sont pas complètes et doivent être enrichies à mesure que des listes publiques fiables sont disponibles.
- Les noms issus d'une liste de surveillance sont conservés comme candidats préliminaires, pas comme classement officiel.
- Le fichier ne remplace pas les listes d'espoirs des organisations NHL: il ajoute une vue transversale des joueurs admissibles au prochain repêchage.

Sources : https://www.eliteprospects.com/draft-center/ ; https://draftprospectshockey.com/prospects-hub ; https://www.dailyfaceoff.com/news/2028-nhl-draft-maddox-schultz-among-15-players-you-need-to-know
