export const RATING_ATTRIBUTES = Object.freeze([
  "FI", "SH", "PL", "ST", "CH", "PO", "HI", "SK",
  "EN", "PE", "FA", "LE", "SR", "OFF", "DEF", "OA"
]);

export function emptyRatings() {
  return Object.fromEntries(RATING_ATTRIBUTES.map(key => [key, null]));
}

export function normalizeRatings(value) {
  const input = value && typeof value === "object" ? value : {};
  return Object.fromEntries(RATING_ATTRIBUTES.map(key => {
    const score = input[key];
    return [key, score != null && score !== "" && Number.isFinite(Number(score)) &&
      Number(score) >= 0 && Number(score) <= 99 ? Math.round(Number(score)) : null];
  }));
}

export function hasAnyRating(value) {
  return RATING_ATTRIBUTES.some(key => normalizeRatings(value)[key] != null);
}
