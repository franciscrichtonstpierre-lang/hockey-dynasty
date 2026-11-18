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

  function ratingLabel(value) {
    const key = String(value || "").toLowerCase();
    const labels = {
      high: "Échantillon élevé",
      medium: "Échantillon moyen",
      low: "Faible confiance",
      very_low: "Très faible confiance",
      source_verified: "Source vérifiée",
      verified: "Vérifié",
      league_statistics: "Statistiques de ligue",
      nhl_player_statistics: "Statistiques NHL",
      minimal_player_profile: "Profil minimal estimé",
      sample_adjusted_statistical_estimate: "Estimation statistique ajustée",
      sample_adjusted_statistical_estimate_with_profile_completion: "Statistiques + profil complété",
      sample_adjusted_statistical_estimate_with_profile_completion_v1: "Statistiques + profil complété",
      provisional_model_estimate: "Estimation provisoire",
      cross_league_profile_model: "Modèle interligues",
      "NHL Stats REST regular-season player statistics": "Statistiques officielles NHL",
      "NHL Stats REST regular-season goalie statistics": "Statistiques gardiens NHL"
    };
    if (labels[key]) return labels[key];
    if (/nhl stats rest.*goalie|goalie statistics/i.test(key)) return "Statistiques gardiens NHL";
    if (/nhl stats rest|nhl.*regular.season.*statistics/i.test(key)) return "Statistiques officielles NHL";
    if (/official.*(ahl|echl|ohl|whl|qmjhl|ushl|ncaa)/i.test(key) || key.includes("://")) return "Source statistique externe";
    if (/model_estimate_from_league_statistics|league_statistics/.test(key)) return "Estimation par statistiques de ligue";
    if (/minimal_profile|profile_model/.test(key)) return "Estimation par profil";
    if (/sample_adjusted/.test(key)) return "Estimation statistique ajustée";
    if (/provisional_model_estimate/.test(key)) return "Estimation provisoire";
    if (/scouting_source_reviewed/.test(key)) return "Évaluation de dépistage révisée";
    return displayValue(value);
  }

  function directoryTable(players, escapeHtml) {
    const esc = typeof escapeHtml === "function" ? escapeHtml : value => String(value ?? "");
    const headers = ["Nom du joueur", "Type", "Ligue", "Équipe / droits", "Pos.", "POT", "Origine des cotes", "Fiabilité", "Statut", ...ATTRIBUTES];
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
        `<td>${esc(ratingLabel(player.ratingSource || player.potentialSource))}</td>`,
        `<td>${esc(ratingLabel(player.ratingConfidence))}</td>`,
        `<td>${esc(ratingLabel(player.ratingStatus))}</td>`,
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
