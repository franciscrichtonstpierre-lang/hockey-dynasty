/* Hockey Dynasty — EHM-inspired player development engine.
 * Browser global: HDPlayerDevelopment. Also safe to load in Node tests.
 * Internal ability scale: 1–200; visible ratings: 0–99.
 */
(function (root) {
  "use strict";

  const ATTRIBUTES = Object.freeze([
    "FI", "SH", "PL", "ST", "CH", "PO", "HI", "SK",
    "EN", "PE", "FA", "LE", "SR", "OFF", "DEF", "OA"
  ]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const numberOr = (value, fallback) =>
    value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
      ? Number(value) : fallback;
  const visibleToAbility = value => clamp(1 + Math.round(clamp(numberOr(value, 50), 0, 99) * 199 / 99), 1, 200);
  const abilityToVisible = value => clamp(Math.round((clamp(numberOr(value, 1), 1, 200) - 1) * 99 / 199), 0, 99);

  function hashSeed(value) {
    let hash = 2166136261;
    for (const char of String(value || "hockey-dynasty")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 0x9e3779b9;
  }

  function random(state) {
    let value = (Number(state.rngState) >>> 0) || 0x9e3779b9;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.rngState = value >>> 0;
    return state.rngState / 4294967296;
  }

  function positionGroup(player) {
    const value = String(player?.detailedPosition || player?.position || player?.positionCode || "F").toUpperCase();
    if (["G", "GOALIE", "GOALTENDER"].includes(value)) return "G";
    if (["D", "DEFENSE", "DEFENCEMAN", "DEFENSEMAN"].includes(value)) return "D";
    return "F";
  }

  const POSITION_WEIGHTS = Object.freeze({
    F: { FI:1.12, SH:1.16, PL:1.12, ST:.92, CH:1.05, PO:.88, HI:.88, SK:1.16, EN:1, PE:1, FA:.82, LE:.9, SR:1, OFF:1.18, DEF:.82, OA:1 },
    D: { FI:.78, SH:.82, PL:1, ST:1.08, CH:1.02, PO:1.18, HI:1.12, SK:1.04, EN:1, PE:1, FA:.78, LE:1, SR:1.08, OFF:.86, DEF:1.2, OA:1 },
    G: { FI:.7, SH:.7, PL:.82, ST:.9, CH:1.08, PO:1.18, HI:.9, SK:1.12, EN:1.08, PE:1.12, FA:.7, LE:1.02, SR:1, OFF:.72, DEF:1.2, OA:1 }
  });

  const FOCUS_POOLS = Object.freeze({
    "Attaque": ["SH", "PL", "ST", "OFF", "FI"],
    "Défense": ["CH", "PO", "HI", "DEF", "SR"],
    "Développement des jeunes": ["SK", "EN", "PE", "FA", "LE"],
    "Avantage numérique": ["SH", "PL", "ST", "OFF"],
    "Désavantage numérique": ["CH", "PO", "DEF", "PE"],
    "Physique": ["EN", "SK", "FA", "HI", "SR"],
    "Technique": ["PE", "FA", "LE"],
    "Réflexes": ["FI", "SK", "EN"],
    "Contrôle des rebonds": ["PO", "CH", "HI"],
    "Récupération": []
  });

  function playerId(player) {
    return String(player?.id || player?.playerId || player?.nhlPlayerId || player?.name || "unknown");
  }

  function baseRatings(player) {
    const source = player?.attributes && typeof player.attributes === "object" ? player.attributes : {};
    const overall = numberOr(player?.overall ?? player?.OA, 50);
    return Object.fromEntries(ATTRIBUTES.map(attribute => [
      attribute,
      clamp(numberOr(source[attribute], overall), 0, 99)
    ]));
  }

  function ageAt(player, date) {
    if (player?.birthDate) {
      const birth = new Date(String(player.birthDate).slice(0, 10) + "T00:00:00Z");
      if (Number.isFinite(birth.getTime())) {
        return Math.max(0, (date.getTime() - birth.getTime()) / 31557600000);
      }
    }
    const referenceDate = new Date("2026-10-07T00:00:00Z");
    const elapsedYears = (date.getTime() - referenceDate.getTime()) / 31557600000;
    return Math.max(0, numberOr(player?.age, 27) + elapsedYears);
  }

  function initialPotentialCap(attribute, player, base, overall, potential, position) {
    const gap = Math.max(0, potential - overall);
    const seed = hashSeed(playerId(player) + ":" + attribute + ":individual-pa");
    const jitter = ((seed % 10001) / 10000 - .5) * .2;
    const positionalWeight = POSITION_WEIGHTS[position]?.[attribute] ?? 1;
    const spread = clamp(.72 + (positionalWeight - 1) * .22 + jitter, .48, 1.02);
    const visibleCap = attribute === "OA" ? Math.max(base, potential) : base + gap * spread;
    return visibleToAbility(clamp(visibleCap, base, 99));
  }

  function createState(player, previous) {
    const prior = previous && typeof previous === "object" ? previous : {};
    const ratings = baseRatings(player);
    const overall = ratings.OA;
    const potential = clamp(numberOr(player?.potential, numberOr(player?.potentialEstimate, overall)), overall, 99);
    const position = positionGroup(player);
    const id = playerId(player);
    const legacyDelta = numberOr(prior.delta, 0);
    const legacyAttributeDelta = prior.attributeDelta && typeof prior.attributeDelta === "object" ? prior.attributeDelta : {};
    const previousAbilities = prior.abilityAttributes && typeof prior.abilityAttributes === "object"
      ? prior.abilityAttributes : {};
    const abilityAttributes = [];

    for (const [index, attribute] of ATTRIBUTES.entries()) {
      const old = Array.isArray(previousAbilities) ? previousAbilities[index] : previousAbilities[attribute];
      const oldCa = Array.isArray(old) ? old[0] : old?.ca;
      const oldPa = Array.isArray(old) ? old[1] : old?.pa;
      const oldProgress = Array.isArray(old) ? old[2] : old?.progress;
      const oldDelta = legacyDelta + numberOr(legacyAttributeDelta[attribute], 0);
      const effectiveRating = clamp(ratings[attribute] + oldDelta, 0, 99);
      const ca = old && Number.isFinite(Number(oldCa))
        ? clamp(Math.round(Number(oldCa)), 1, 200)
        : visibleToAbility(effectiveRating);
      const pa = old && Number.isFinite(Number(oldPa))
        ? Math.max(ca, clamp(Math.round(Number(oldPa)), 1, 200))
        : Math.max(ca, initialPotentialCap(attribute, player, effectiveRating, overall, potential, position));
      abilityAttributes[index] = [ca, pa, Math.max(0, numberOr(oldProgress, numberOr(old?.regressionProgress, 0)))];
    }

    const priorSeed = Number(prior.rngState);
    const rngState = Number.isFinite(priorSeed) && priorSeed !== 0 ? priorSeed >>> 0 : hashSeed(id + ":development");
    const disposition = clamp(numberOr(prior.disposition,
      .72 + ((hashSeed(id + ":disposition") % 10001) / 10000) * .56), .55, 1.35);

    return {
      schemaVersion: 2,
      position,
      peakAge: clamp(Math.round(numberOr(prior.peakAge, estimatedPeakAge(player, position))), 18, 35),
      disposition,
      rngState,
      abilityAttributes,
      currentAbility: Math.round(abilityAttributes.reduce((sum, node) => sum + node[0], 0) / ATTRIBUTES.length),
      potentialAbility: Math.round(abilityAttributes.reduce((sum, node) => sum + node[1], 0) / ATTRIBUTES.length),
      potentialSource: player?.potentialStatus || (player?.potential != null ? "unverified" : "estimated_from_current_rating"),
      potentialIsEstimated: !["source_verified", "verified"].includes(String(player?.potentialStatus || "").toLowerCase()),
      lastUpdated: prior.lastUpdated || null,
      retired: !!prior.retired,
      retiredOn: prior.retiredOn || null
    };
  }

  function estimatedPeakAge(player, position) {
    const ranges = { F: [24, 27], D: [25, 29], G: [27, 31] };
    const range = ranges[position] || ranges.F;
    return range[0] + (hashSeed(playerId(player) + ":peak-age") % (range[1] - range[0] + 1));
  }

  function ageGrowthFactor(age, peakAge) {
    if (age < peakAge - 6) return 1.12;
    if (age < peakAge - 3) return 1;
    if (age < peakAge - 1) return .78;
    if (age < peakAge + 2) return .48;
    if (age < peakAge + 4) return .22;
    if (age < 32) return .05;
    return 0;
  }

  function annualRetirementChance(age, overall, potential) {
    const rates = { 35:.08, 36:.14, 37:.24, 38:.38, 39:.53, 40:.68, 41:.78, 42:.86 };
    if (age < 35) return 0;
    let chance = rates[Math.floor(age)] ?? .75;
    if (overall < 65) chance *= 1 + (65 - overall) / 40;
    if (potential >= 85) chance *= .72;
    if (potential <= overall) chance *= 1.18;
    return clamp(chance, 0, .9);
  }

  function advancePlayer(player, previous, options) {
    const opts = options && typeof options === "object" ? options : {};
    const days = clamp(Math.round(numberOr(opts.days, 14)), 1, 28);
    const start = opts.asOf instanceof Date ? new Date(opts.asOf) : new Date(opts.asOf || "2026-10-07T00:00:00Z");
    const end = new Date(start.getTime() + days * 86400000);
    const state = createState(player, previous);
    if (state.retired) return { state, gains:0, regressions:0, trainingGains:0, retired:true };

    const ratings = baseRatings(player);
    const training = opts.training || {};
    const focus = String(training.focus || "Équilibré");
    const goalieFocus = String(training.goalieFocus || "Équilibré");
    const intensity = String(training.intensity || "Normale");
    const intensityFactor = intensity === "Légère" ? .76 : intensity === "Élevée" ? 1.22 : 1;
    const coachSkill = clamp(numberOr(training.coachSkill, 50), 0, 99);
    const facilities = clamp(numberOr(training.facilities, 50), 0, 99);
    const iceTime = clamp(numberOr(opts.iceTime, 18), 0, 40);
    const performance = clamp(numberOr(opts.performance, 50), 0, 100);
    const coachFactor = .76 + coachSkill / 255;
    const facilitiesFactor = .84 + facilities / 325;
    const usageFactor = .74 + iceTime / 78;
    const performanceFactor = .9 + performance / 500;
    const determinationFactor = .86 + ratings.PE / 450;
    const leadershipFactor = .95 + ratings.LE / 1000;
    const injuredDays = clamp(Math.round(numberOr(opts.injuredDays, 0)), 0, days);
    let gains = 0;
    let regressions = 0;
    let trainingGains = 0;
    let retired = false;

    for (let day = 0; day < days; day++) {
      const currentDate = new Date(start.getTime() + day * 86400000);
      const age = ageAt(player, currentDate);
      const ageFactor = ageGrowthFactor(age, state.peakAge);
      const injuryFactor = day < injuredDays ? .28 : 1;
      const overall = abilityToVisible(state.abilityAttributes[ATTRIBUTES.indexOf("OA")][0]);
      const potential = abilityToVisible(state.abilityAttributes[ATTRIBUTES.indexOf("OA")][1]);
      const retirementChance = annualRetirementChance(age, overall, potential);
      if (retirementChance > 0 && random(state) < 1 - Math.pow(1 - retirementChance, 1 / 365)) {
        retired = true;
        state.retired = true;
        state.retiredOn = currentDate.toISOString().slice(0, 10);
        break;
      }

      const playerFocus = state.position === "G" ? (FOCUS_POOLS[goalieFocus] ? goalieFocus : "Équilibré") : focus;
      const pool = FOCUS_POOLS[playerFocus] || FOCUS_POOLS["Équilibré"];
      const balanced = playerFocus === "Équilibré";
      for (const attribute of ATTRIBUTES) {
        const ability = state.abilityAttributes[ATTRIBUTES.indexOf(attribute)];
        if (age >= 32) {
          const physicalWeight = ["SK", "EN", "ST", "HI", "SR"].includes(attribute) ? 1.35
            : ["FI", "SH", "PL", "CH", "PO", "DEF", "OFF"].includes(attribute) ? .82 : .48;
          const regressionRate = .00135 * (age - 31) * physicalWeight * state.disposition;
          ability[2] += regressionRate * (.7 + random(state) * .6);
          while (ability[2] >= 1 && ability[0] > 1) {
            ability[0]--;
            ability[2] -= 1;
            regressions++;
          }
          continue;
        }

        const gap = ability[1] - ability[0];
        if (gap <= 0 || ageFactor <= 0 || injuryFactor <= 0) continue;
        const gapFactor = clamp(gap / 28, .08, 1);
        const isGoalie = state.position === "G";
        const focusEligible = !(playerFocus === "Développement des jeunes" && age > 23);
        const focusWeight = playerFocus === "Récupération" ? 0 : (focusEligible
          ? (pool.includes(attribute) ? 1 : (balanced ? .48 : .08))
          : 0);
        const trainingBonus = focusWeight * .008 * intensityFactor * coachFactor;
        const naturalGrowth = .012 * ageFactor * gapFactor * state.disposition
          * coachFactor * facilitiesFactor * usageFactor * performanceFactor * determinationFactor * leadershipFactor;
        const goalieAdjustment = isGoalie && ["FI", "SH", "PL", "FA"].includes(attribute) ? .72 : 1;
        const dailyNoise = .7 + random(state) * .6;
        ability[2] += (naturalGrowth + trainingBonus) * injuryFactor * goalieAdjustment * dailyNoise;

        while (ability[2] >= 1 && ability[0] < ability[1]) {
          ability[0]++;
          ability[2] -= 1;
          gains++;
          if (trainingBonus > 0) trainingGains++;
        }
      }
    }

    state.currentAbility = Math.round(state.abilityAttributes.reduce((sum, node) => sum + node[0], 0) / ATTRIBUTES.length);
    state.potentialAbility = Math.round(state.abilityAttributes.reduce((sum, node) => sum + node[1], 0) / ATTRIBUTES.length);
    state.lastUpdated = end.toISOString().slice(0, 10);
    return { state, gains, regressions, trainingGains, retired };
  }

  function applyToRatings(ratings, state) {
    const source = ratings && typeof ratings === "object" ? ratings : {};
    const dev = state && typeof state === "object" ? state : {};
    const legacyDelta = numberOr(dev.delta, 0);
    const specific = dev.attributeDelta && typeof dev.attributeDelta === "object" ? dev.attributeDelta : {};
    const output = { ...source };
    for (const attribute of ATTRIBUTES) {
      const base = numberOr(source[attribute], null);
      if (base == null) continue;
      const ability = Array.isArray(dev.abilityAttributes)
        ? dev.abilityAttributes[ATTRIBUTES.indexOf(attribute)]
        : dev.abilityAttributes?.[attribute];
      const currentAbility = Array.isArray(ability) ? ability[0] : ability?.ca;
      if (ability && Number.isFinite(Number(currentAbility))) {
        output[attribute] = abilityToVisible(currentAbility);
      } else {
        const delta = legacyDelta + numberOr(specific[attribute], 0);
        output[attribute] = clamp(Math.round(base + delta), 0, 99);
      }
    }
    return output;
  }

  function visibleRatingFor(state, attribute) {
    const index = ATTRIBUTES.indexOf(attribute);
    if (index < 0) return null;
    const node = Array.isArray(state?.abilityAttributes) ? state.abilityAttributes[index] : state?.abilityAttributes?.[attribute];
    const ca = Array.isArray(node) ? node[0] : node?.ca;
    return Number.isFinite(Number(ca)) ? abilityToVisible(ca) : null;
  }

  function createInitialState(player, previous) {
    return createState(player, previous);
  }

  root.HDPlayerDevelopment = Object.freeze({
    ATTRIBUTES,
    visibleToAbility,
    abilityToVisible,
    createInitialState,
    advancePlayer,
    applyToRatings,
    visibleRatingFor,
    ageAt
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
