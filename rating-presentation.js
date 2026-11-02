(function (root) {
  const STATUS_LABELS = Object.freeze({
    sample_adjusted_statistical_estimate_with_profile_completion: "Estimation statistique complétée par profil",
    sample_adjusted_statistical_estimate: "Estimation statistique ajustée",
    model_estimate_from_league_statistics: "Modèle fondé sur les statistiques de ligue",
    model_estimate_from_player_profile: "Modèle fondé sur le profil du joueur",
    minimal_profile_model_estimate: "Estimation fondée sur un profil limité",
    provisional_model_estimate: "Estimation provisoire du modèle",
    source_verified: "Source vérifiée",
    verified: "Vérifiée",
    unrated: "Non évaluée"
  });

  const CONFIDENCE_LABELS = Object.freeze({
    very_low: "très faible",
    low: "faible",
    medium: "moyenne",
    high: "élevée"
  });

  const SAMPLE_VOLUME_LABELS = Object.freeze({
    very_low: "très faible",
    low: "faible",
    medium: "moyen",
    high: "élevé"
  });

  const LEAGUE_LABELS = Object.freeze({
    AHL: "LAH",
    ECHL: "ECHL",
    OHL: "OHL",
    WHL: "WHL",
    QMJHL: "LHJMQ",
    USHL: "USHL"
  });

  function statusLabel(status) {
    const key = String(status || "").trim();
    return STATUS_LABELS[key] || (key ? key.replaceAll("_", " ") : "Statut non consigné");
  }

  function confidenceLabel(confidence) {
    const key = String(confidence || "").trim().toLowerCase();
    return CONFIDENCE_LABELS[key] || (key ? key.replaceAll("_", " ") : "inconnue");
  }

  function sourceLabel(source) {
    const value = String(source || "").trim();
    if (!value) return "source non consignée";
    if (/NHL Stats REST regular-season goalie statistics/i.test(value)) return "Statistiques LNH · gardiens";
    if (/NHL Stats REST regular-season player statistics/i.test(value)) return "Statistiques LNH · saison régulière";

    const heading = value.split(/\s*\|\s*(?=https?:\/\/)/i)[0].trim();
    const feed = heading.match(/^(?:Official\s+)?(AHL|ECHL|OHL|WHL|QMJHL|USHL)\s+HockeyTech(?:\s*\/\s*LeagueStat)?/i);
    if (feed) {
      const league = feed[1].toUpperCase();
      const provider = /\/\s*LeagueStat/i.test(heading) ? "HockeyTech / LeagueStat" : "HockeyTech";
      return `Statistiques officielles ${LEAGUE_LABELS[league] || league} · ${provider}`;
    }

    const url = value.match(/https?:\/\/[^\s;]+/i)?.[0];
    if (url) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "api-web.nhle.com") {
          const team = parsed.pathname.match(/\/prospects\/([A-Z]{3})/i)?.[1];
          return team ? `API officielle des espoirs LNH · ${team.toUpperCase()}` : "API officielle LNH";
        }
        return parsed.hostname.replace(/^www\./i, "");
      } catch {
        // Keep the recorded source text if it is not a valid URL.
      }
    }

    return heading || value;
  }

  function metadata(meta = {}) {
    const status = meta.status ?? meta.ratingStatus;
    if (!status) return "Cotes non évaluées · source non consignée";

    const source = meta.source ?? meta.ratingSource;
    const confidence = meta.confidence ?? meta.ratingConfidence;
    const sampleSize = meta.sampleSize ?? meta.ratingSampleSize;
    const sampleConfidence = meta.sampleConfidence ?? meta.ratingSampleConfidence;
    const parts = [statusLabel(status), sourceLabel(source), `fiabilité ${confidenceLabel(confidence)}`];

    if (sampleSize !== null && sampleSize !== undefined && sampleSize !== "" && Number.isFinite(Number(sampleSize))) {
      const count = Number(sampleSize);
      const volume = SAMPLE_VOLUME_LABELS[String(sampleConfidence || "").toLowerCase()] || confidenceLabel(sampleConfidence);
      parts.push(`échantillon : ${count} match${count === 1 ? "" : "s"} (volume ${volume})`);
    }

    return parts.join(" · ");
  }

  const api = Object.freeze({ statusLabel, confidenceLabel, sourceLabel, metadata });
  root.hdRatingPresentation = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
