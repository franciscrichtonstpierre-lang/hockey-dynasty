(function (root) {
  const ATTRIBUTES = Object.freeze(["FI", "SH", "PL", "ST", "CH", "PO", "HI", "SK", "EN", "PE", "FA", "LE", "SR", "OFF", "DEF", "OA"]);

  function paginate(players, pageIndex, pageSize = 500) {
    const rows = Array.isArray(players) ? players : [];
    const size = Math.max(1, Math.floor(Number(pageSize) || 500));
    const pageCount = Math.max(1, Math.ceil(rows.length / size));
    const page = Math.min(pageCount - 1, Math.max(0, Math.floor(Number(pageIndex) || 0)));
    return { items: rows.slice(page * size, (page + 1) * size), page, pageCount, total: rows.length, pageSize: size };
  }

  function displayValue(value) {
    return value === null || value === undefined || value === "" ? "—" : String(value);
  }

  function directoryTable(players, escapeHtml) {
    const esc = typeof escapeHtml === "function" ? escapeHtml : value => String(value ?? "");
    const headers = ["Nom du joueur", "Type", "Ligue", "Équipe / droits", "Pos.", "POT", ...ATTRIBUTES];
    const head = headers.map(label => `<th>${esc(label)}</th>`).join("");
    const rows = (Array.isArray(players) ? players : []).map(player => {
      const team = player.currentTeam || player.code || "—";
      const cells = [
        `<td class="playerName">${esc(player.name || "Joueur")}</td>`,
        `<td>${esc(player.kind || "—")}</td>`,
        `<td>${esc(player.league || "—")}</td>`,
        `<td>${esc(team)}</td>`,
        `<td>${esc(player.pos || "—")}</td>`,
        `<td class="ratingCell">${esc(displayValue(player.potential))}</td>`,
        ...ATTRIBUTES.map(attribute => `<td class="ratingCell">${esc(displayValue(player.attributes?.[attribute]))}</td>`)
      ];
      return `<tr>${cells.join("")}</tr>`;
    }).join("");

    return `<div class="rosterScroll"><table class="rosterTable playerDirectoryTable"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const api = Object.freeze({ ATTRIBUTES, paginate, directoryTable, displayValue });
  root.hdRatingPresentation = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
