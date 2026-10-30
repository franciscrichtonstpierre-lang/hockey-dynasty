import datetime
import json
import pathlib
import time
import urllib.error
import urllib.request

CODES = "ANA BOS BUF CGY CAR CHI COL CBJ DAL DET EDM FLA LAK MIN MTL NSH NJD NYI NYR OTT PHI PIT SJS SEA STL TBL TOR UTA VAN VGK WSH WPG".split()
OUT = pathlib.Path("data/prospects")
OUT.mkdir(parents=True, exist_ok=True)
BASE = "https://api-web.nhle.com/v1/prospects/"
synced = 0
errors = []

def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "HockeyDynasty/0.8 (prospect database sync)"})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)

for code in CODES:
    try:
        data = get_json(BASE + code)
        # A valid response must contain a prospect collection; an empty list is valid only
        # when the API explicitly returns the expected field.
        prospects = data.get("prospects") if isinstance(data, dict) else None
        if not isinstance(prospects, list):
            raise ValueError("Réponse API inattendue: champ 'prospects' absent")
        record = {
            "teamCode": code,
            "source": BASE + code,
            "sourceType": "NHL Web API (endpoint public non officiellement documenté)",
            "syncedUTC": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "count": len(prospects),
            "prospects": prospects,
            "dataNotes": [
                "La liste API des espoirs ne garantit pas tous les joueurs dont l'organisation détient les droits.",
                "Les notes et potentiels de jeu ne sont pas fournis par cette source.",
                "Ne pas interpréter l'absence d'un joueur comme une preuve que ses droits ne sont pas détenus."
            ]
        }
        (OUT / f"{code}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{code}: {len(prospects)} espoirs")
        synced += 1
    except Exception as exc:
        errors.append(f"{code}: {exc}")
        print(f"{code}: ERREUR - {exc}")
    time.sleep(0.15)

if synced == 0:
    raise SystemExit("Aucun fichier d'espoirs synchronisé; fichiers précédents conservés.")
if errors:
    print(f"AVERTISSEMENT: {len(errors)} équipes non mises à jour; les fichiers précédents sont conservés.")
print(f"Synchronisation terminée: {synced}/{len(CODES)} équipes.")
