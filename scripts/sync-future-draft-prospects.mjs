// Synchronise les espoirs admissibles aux prochains repêchages depuis les listes publiques Elite Prospects.
// Les rangs sont des classements de source, jamais une prédiction de l'ordre final du repêchage.
import { readFile, writeFile } from "node:fs/promises";

const years = [2027, 2028, 2029];
const urls = Object.fromEntries(years.map(year => [year, `https://www.eliteprospects.com/draft-center/${year}`]));
const leagueMap = new Map([
  ["NCAA","NCAA"],["NTDP","USNTDP"],["USHL","USHL"],["WHL","WHL"],["OHL","OHL"],["QMJHL","QMJHL"],
  ["CHL","CHL"],["KHL","KHL"],["MHL","MHL"],["SHL","SHL"],["NL","NL"],["LIIGA","LIIGA"],
  ["U20 NATIONELL","EUROPE"],["U20 SM-SARJA","EUROPE"],["CZECHIA U18","EUROPE"],["CZECHIA U20","EUROPE"],
  ["ALLIANCE U16","OTHER"],["U18 REGION","EUROPE"],["DEL","EUROPE"]
]);
const decode = s => String(s||"")
  .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
  .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const plain = s => decode(String(s||"").replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim());
const positionPattern = /\((C\/LW|LW\/C|RW\/C|C\/RW|LW|RW|C|D|G|F|LD|RD)(?:\s*\/\s*(?:C|LW|RW|D|G|F|LD|RD))*\)$/i;
const teamWords = new Set(["top prospects","other notable prospects","player","team","league","gp","g","a","tp","pim"]);
const all = [];
const errors = [];
for (const year of years) {
  const url = urls[year];
  try {
    const response = await fetch(url, {
      headers: {"user-agent":"Hockey-Dynasty-data-sync/1.0","accept":"text/html"},
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const yearRows = [];
    for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const row = match[1];
      const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>({html:m[1],text:plain(m[1])}));
      if (cells.length < 4) continue;
      const anchorTexts = [...row.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m=>plain(m[1])).filter(Boolean);
      const named = anchorTexts.map(t=>({text:t,match:t.match(positionPattern)})).find(x=>x.match && !teamWords.has(x.text.toLowerCase()));
      if (!named) continue;
      const name = named.text.replace(positionPattern,"").trim();
      if (!name || name.length < 3 || /^image|verified player/i.test(name)) continue;
      const position = named.match[1].toUpperCase().split("/")[0];
      const nameCellIndex = cells.findIndex(c=>c.text.includes(named.text));
      const tail = cells.slice(Math.max(0,nameCellIndex+1)).map(c=>c.text).filter(Boolean);
      const team = tail.find(t=>!teamWords.has(t.toLowerCase()) && !/^\d+$/.test(t) && !/^-+$/.test(t) && !/^(USA|Canada|Sweden|Finland|Russia|Czechia|Norway|Latvia|Belarus|Germany|Switzerland|Slovakia)$/i.test(t)) || null;
      const upperTail = tail.map(t=>t.toUpperCase());
      const knownLeague = upperTail.find(t=>leagueMap.has(t));
      const league = knownLeague ? leagueMap.get(knownLeague) : "UNKNOWN";
      const firstCell = cells[0]?.text || "";
      const rank = /^\d+$/.test(firstCell) ? Number(firstCell) : null;
      const record = {
        prospectId: `nhl-draft:${year}:${name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`,
        name, position, currentTeam: team, currentLeague: league, sourceLeagueLabel: knownLeague || null,
        draftYear: year, sourceRank: rank, rankType: rank == null ? "source_list_order" : "source_rank",
        rightsTeam: null, nhlRightsStatus: "undrafted_unassigned",
        source: url, sourceUpdatedAt: new Date().toISOString()
      };
      yearRows.push(record);
    }
    const deduped = new Map();
    for (const p of yearRows) {
      const key = p.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
      if (!deduped.has(key)) deduped.set(key,p);
    }
    all.push(...deduped.values());
    console.log(`Future draft prospects ${year}: ${deduped.size} rows parsed from ${url}`);
    if (!deduped.size) errors.push(`${year}: aucune ligne reconnue`);
  } catch (error) {
    errors.push(`${year}: ${error.message}`);
    console.warn(`Future draft prospects ${year}: ${error.message}`);
  }
}
const byIdentity = new Map();
for (const p of all) {
  const key = `${p.draftYear}|${p.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}`;
  if (!byIdentity.has(key)) byIdentity.set(key,p);
}
const output = {
  schemaVersion: 1,
  source: "Elite Prospects Draft Center",
  years,
  lastSyncAt: new Date().toISOString(),
  countsByYear: Object.fromEntries(years.map(y=>[y,[...byIdentity.values()].filter(p=>p.draftYear===y).length])),
  prospects: [...byIdentity.values()].sort((a,b)=>a.draftYear-b.draftYear || (a.sourceRank??9999)-(b.sourceRank??9999) || a.name.localeCompare(b.name)),
  errors
};
await writeFile("data/future-draft-prospects/2027-2029.json",JSON.stringify(output,null,2)+"\n","utf8");
console.log(`Future draft prospect dataset: ${output.prospects.length} unique prospect-year records; ${errors.length} source warnings.`);
if (output.prospects.length === 0) throw new Error("Aucun espoir des futurs repêchages importé; le fichier ne doit pas être publié vide.");
