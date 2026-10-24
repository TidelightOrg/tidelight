/** @param {Date} [at] @returns {"daylight" | "blue" | "night"} */
/** Resolve the automatic palette from the visitor's local clock. */
export function automaticTheme(at = new Date()) {
  const hour = at.getHours();
  return hour >= 7 && hour < 17 ? "daylight" : hour >= 17 && hour < 21 ? "blue" : "night";
}
