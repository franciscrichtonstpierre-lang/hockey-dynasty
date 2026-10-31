// Syntax-check inline JavaScript in the static application without executing browser code.
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const html = await readFile("index.html", "utf8");
const lower = html.toLowerCase();
const blocks = [];
let cursor = 0;
while (true) {
  const start = lower.indexOf("<script", cursor);
  if (start < 0) break;
  const openEnd = html.indexOf(">", start);
  const close = lower.indexOf("</script>", openEnd + 1);
  if (openEnd < 0 || close < 0) {
    console.error("Balise script mal formée dans index.html.");
    process.exit(1);
  }
  const attributes = lower.slice(start, openEnd);
  const source = html.slice(openEnd + 1, close);
  if (!attributes.includes("src=") && source.trim()) blocks.push(source);
  cursor = close + 9;
}
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
