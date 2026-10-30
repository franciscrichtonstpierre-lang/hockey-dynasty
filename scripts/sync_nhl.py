import json, urllib.request, pathlib, datetime, time
codes = "ANA BOS BUF CGY CAR CHI COL CBJ DAL DET EDM FLA LAK MIN MTL NSH NJD NYI NYR OTT PHI PIT SJS SEA STL TBL TOR UTA VAN VGK WSH WPG".split()
out = pathlib.Path("data/nhl"); out.mkdir(parents=True,exist_ok=True)
ok=0
for code in codes:
    for path,season in [(f"roster/{code}/20262027","2026-27"),(f"roster/{code}/current","current")]:
        try:
            req=urllib.request.Request("https://api-web.nhle.com/v1/"+path,headers={"User-Agent":"HockeyDynasty/0.6 (roster sync)"})
            with urllib.request.urlopen(req,timeout=20) as response: data=json.load(response)
            if sum(len(data.get(k,[])) for k in ("forwards","defensemen","goalies"))<1: continue
            data["_sourceSeason"]=season
            data["_syncedUTC"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
            (out/(code+".json")).write_text(json.dumps(data,ensure_ascii=False),encoding="utf-8")
            print(code,season,"OK");ok+=1;break
        except Exception as e: print(code,season,str(e)[:100])
    time.sleep(.15)
if not ok: raise SystemExit("No rosters fetched; leaving previous data untouched")
print("Saved",ok,"rosters")
