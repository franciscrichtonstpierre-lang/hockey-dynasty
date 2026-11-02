import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { Script, createContext } from "node:vm";
import { RATING_ATTRIBUTES } from "../scripts/lib/player-ratings.mjs";

const html = readFileSync("index.html", "utf8");
const ratingLookup = JSON.parse(readFileSync("data/players/registry-index/ratings-lookup.json", "utf8"));
const registryById = new Map();
const registryByNhlId = new Map();
const registryByAhlId = new Map();
const registryByName = new Map();

for (const player of ratingLookup.players || []) {
  if (player.id) registryById.set(String(player.id), player);
  if (player.nhlPlayerId != null) registryByNhlId.set(String(player.nhlPlayerId), player);
  const ahlId = String(player.id || "").match(/^ahl:(.+)$/i)?.[1];
  if (ahlId) registryByAhlId.set(ahlId, player);
  const key = String(player.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim();
  if (key) {
    const matches = registryByName.get(key) || [];
    matches.push(player);
    registryByName.set(key, matches);
  }
}

function sourceLine(marker) {
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `index.html contains ${marker}`);
  const end = html.indexOf("\r\n", start);
  assert.notEqual(end, -1, `source line ends for ${marker}`);
  return html.slice(start, end);
}

const resolverContext = createContext({
  hdRegistryById: registryById,
  hdRegistryByNhlId: registryByNhlId,
  hdRegistryByAhlId: registryByAhlId,
  hdRegistryByName: registryByName
});
new Script(`${sourceLine("const ratingNameKey=")}\n${sourceLine("function registryRatingForPlayer(")}\nglobalThis.resolveRating = registryRatingForPlayer;`, {
  filename: "index.html:registryRatingForPlayer"
}).runInContext(resolverContext);

function rosterFiles(directory, exclude = new Set()) {
  return readdirSync(directory)
    .filter(file => file.endsWith(".json") && !exclude.has(file) && !file.startsWith("player-"))
    .map(file => join(directory, file));
}

test("the UI rating resolver finds complete cards for every active NHL, AHL, and organization prospect roster row", () => {
  const groups = [
    {
      label: "NHL",
      kind: "NHL",
      files: rosterFiles("data/nhl", new Set(["teams.json"])),
      players: data => ["forwards", "defensemen", "goalies"].flatMap(group => data[group] || [])
    },
    {
      label: "AHL",
      kind: "LAH",
      files: rosterFiles("data/ahl", new Set(["teams.json"])),
      players: data => data.players || []
    },
    {
      label: "prospects",
      kind: "Espoir",
      files: rosterFiles("data/prospects", new Set(["teams.json"])),
      players: data => data.prospects || data.players || []
    }
  ];

  for (const group of groups) {
    let total = 0;
    const missing = [];
    for (const file of group.files) {
      const data = JSON.parse(readFileSync(file, "utf8"));
      const teamCode = data.teamCode || basename(file, ".json").slice(0, 3);
      for (const player of group.players(data)) {
        total++;
        const rating = resolverContext.resolveRating(player, group.kind, teamCode);
        if (!rating || !RATING_ATTRIBUTES.every(attribute => Number.isInteger(rating.attributes?.[attribute]))) {
          missing.push(`${teamCode}: ${player.name || player.player_id || player.id || "joueur sans nom"}`);
        }
      }
    }
    assert.ok(total > 0, `${group.label} roster data is loaded`);
    assert.deepEqual(missing, [], `${group.label} players missing complete cards`);
  }
});

test("the live organization renderer displays ratings for all Montreal prospect rows", () => {
  const rendererContext = createContext({
    window: { hdRatingPresentation: { ATTRIBUTES: RATING_ATTRIBUTES } },
    effectifUniquePlayers: players => players,
    effectifPlayerName: player => player.name || player.fullName || player.full_name || player.display_name || "",
    registryRatingForPlayer: (player, kind, teamCode) => resolverContext.resolveRating(player, kind, teamCode),
    applyDevelopment: (_id, attributes) => attributes,
    hdRatings: {},
    playerAttributes: player => Object.fromEntries(RATING_ATTRIBUTES.map(attribute => [attribute, player.attributes?.[attribute] ?? null])),
    esc: value => String(value ?? "")
  });
  new Script(`${sourceLine("function renderRatedDevelopmentTable(")}\nglobalThis.renderRatedDevelopmentTable = renderRatedDevelopmentTable;`, {
    filename: "index.html:renderRatedDevelopmentTable"
  }).runInContext(rendererContext);

  const data = JSON.parse(readFileSync("data/prospects/MTL.json", "utf8"));
  const players = data.prospects || data.players || [];
  const html = rendererContext.renderRatedDevelopmentTable(players, "Espoirs", "MTL");
  const visiblyUnrated = [];

  for (const player of players) {
    const name = player.name || player.fullName || player.full_name || player.display_name;
    if (!name) continue;
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const row = html.match(new RegExp(`<tr><td class="playerName">${escaped}</td>.*?</tr>`))?.[0];
    assert.ok(row, `rendered row exists for ${name}`);
    if (/—/.test(row)) visiblyUnrated.push(name);
  }

  assert.deepEqual(visiblyUnrated, [], "Montreal prospects must not render empty rating cells");
});

test("the organization roster loader waits for and retries the shared ratings registry", () => {
  const loader = sourceLine("async function loadRatings()");
  const registryFetcher = sourceLine("async function fetchRatingRegistry()");
  const organizationLoader = sourceLine("async function loadOrganizationEffectifExtras(");

  assert.match(loader, /hdRegistryRatingsLoaded/);
  assert.match(loader, /hdRatingsLoadPromise/);
  assert.match(registryFetcher, /raw\.githubusercontent\.com/);
  assert.match(registryFetcher, /cdn\.jsdelivr\.net/);
  assert.match(organizationLoader, /await loadRatings\(\)/);
});
