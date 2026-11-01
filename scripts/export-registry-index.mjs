import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

const sourcePath = "data/players/registry.json";
const outputDir = "data/players/registry-index";
const chunkSize = 500;

const registry = JSON.parse(await readFile(sourcePath, "utf8"));
const players = Array.isArray(registry.players) ? registry.players : [];
if (!players.length) throw new Error("Registry is empty or has no players array.");

const compact = players.map(p => ({
  id: p.id ?? null,
  name: p.name ?? null,
  birthDate: p.birthDate ?? null,
  position: p.position ?? null,
  currentLeague: p.currentLeague ?? null,
  currentTeam: p.currentTeam ?? null,
  nhlRightsTeam: p.nhlRightsTeam ?? null,
  draftYear: p.draftYear ?? null,
  source: p.source ?? null
}));

await mkdir(outputDir, { recursive: true });
const oldFiles = await readdir(outputDir).catch(() => []);
for (const name of oldFiles) {
  if (name.endsWith(".json")) await rm(`${outputDir}/${name}`);
}

const chunkCount = Math.ceil(compact.length / chunkSize);
for (let i = 0; i < chunkCount; i++) {
  const part = compact.slice(i * chunkSize, (i + 1) * chunkSize);
  const name = `registry-${String(i + 1).padStart(3, "0")}.json`;
  await writeFile(`${outputDir}/${name}`, JSON.stringify({
    schemaVersion: 1,
    chunk: i + 1,
    chunkCount,
    players: part
  }, null, 2) + "\n", "utf8");
}

const manifest = {
  schemaVersion: 1,
  sourcePath,
  sourceGeneratedAt: registry.generatedAt ?? null,
  playerCount: compact.length,
  chunkSize,
  chunkCount,
  generatedAt: new Date().toISOString(),
  fields: ["id", "name", "birthDate", "position", "currentLeague", "currentTeam", "nhlRightsTeam", "draftYear", "source"]
};
await writeFile(`${outputDir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Exported ${compact.length} registry identities into ${chunkCount} chunks.`);
