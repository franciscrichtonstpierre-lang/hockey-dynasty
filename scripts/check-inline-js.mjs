// Syntax-check inline JavaScript in the static application without executing browser code.
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const html = await readFile("index.html", "utf8");
const blocks = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim().length > 0);

if (!blocks.length) {
  console.error("Aucun bloc JavaScript intégré trouvé dans index.html.");
  process.exit(1);
}
for (let i = 0; i < blocks.length; i++) {
  try {
    new Script(blocks[i], { filename: `index.html:inline-script-${i + 1}.js` });
  } catch (error) {
    console.error(`Erreur de syntaxe dans le bloc JavaScript ${i + 1}: ${error.message}`);
    process.exit(1);
  }
}
console.log(`Syntaxe JavaScript valide : ${blocks.length} bloc(s) intégré(s).`);
