// Merge duplicate prospect-pipeline aliases into the canonical NHL-ID record
// only when full name, rights owner, position and identity evidence agree.
export function mergeNhlProspectAliases(records, nameKey) {
  const groups = new Map();
  for (const player of records.values()) {
    if (!player?.name || !player?.nhlRightsTeam || !player?.position) continue;
    const key = [nameKey(player.name), player.nhlRightsTeam, player.position].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(player);
  }

  let merged = 0;
  const mergedIds = [];
  for (const group of groups.values()) {
    const canonical = group.filter(player =>
      String(player.id).startsWith("nhl:") && Boolean(player.birthDate)
    );
    if (canonical.length !== 1) continue;
    const primary = canonical[0];
    const aliases = group.filter(player =>
      /^(?:prospect|pipeline):/.test(String(player.id)) &&
      !player.birthDate
    );

    for (const alias of aliases) {
      if (alias.birthDate && alias.birthDate !== primary.birthDate) continue;
      const aliasLeague = alias.currentLeague;
      if (aliasLeague && !["UNKNOWN", "OTHER", "EUROPE"].includes(aliasLeague) &&
          aliasLeague !== primary.currentLeague) {
        primary.currentLeague = aliasLeague;
        primary.leagueResolution = alias.leagueResolution || "hockey_insights_team_prospects_snapshot";
        if (alias.currentTeam) {
          primary.currentTeam = alias.currentTeam;
        } else if (primary.currentTeam &&
          (primary.currentTeam === primary.nhlRightsTeam ||
           nameKey(primary.currentTeam) === nameKey(primary.nhlRightsTeam))) {
          primary.currentTeam = null;
        }
      } else if (alias.currentTeam && aliasLeague === primary.currentLeague &&
        nameKey(alias.currentTeam) !== nameKey(primary.currentTeam)) {
        primary.currentTeam = alias.currentTeam;
        primary.teamResolution = alias.teamResolution || "hockey_insights_team_prospects_snapshot";
      }

      for (const field of ["draftYear", "draftRound", "draftOverall", "birthDate", "nhlPlayerId"]) {
        if ((primary[field] === null || primary[field] === undefined) &&
            alias[field] !== null && alias[field] !== undefined) {
          primary[field] = alias[field];
        }
      }
      if (!primary.teamPipelineSource && alias.teamPipelineSource) {
        primary.teamPipelineSource = alias.teamPipelineSource;
      }
      if (!primary.teamPipelineSnapshotDate && alias.teamPipelineSnapshotDate) {
        primary.teamPipelineSnapshotDate = alias.teamPipelineSnapshotDate;
      }
      records.delete(alias.id);
      mergedIds.push(alias.id);
      merged++;
    }
  }
  return { merged, mergedIds };
}
