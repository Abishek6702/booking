/* eslint-disable @typescript-eslint/no-explicit-any */

export const matchVibe = (p: any, vibe: string): boolean => {
  if (!p || !vibe) return false;
  const text = `${p.title || ""} ${p.description || ""} ${p.city || ""} ${p.country || ""} ${(p.amenities || []).join(" ")}`.toLowerCase();
  const normalizedVibe = vibe.toLowerCase();

  if (normalizedVibe === "beach") {
    return text.includes("beach") || text.includes("sea") || text.includes("ocean") || text.includes("coast") || text.includes("lake") || text.includes("pool") || text.includes("water");
  }
  if (normalizedVibe === "mountains") {
    return text.includes("mountain") || text.includes("hill") || text.includes("trek") || text.includes("hiking") || text.includes("slope") || text.includes("forest");
  }
  if (normalizedVibe === "city") {
    return text.includes("city") || text.includes("downtown") || text.includes("center") || text.includes("urban");
  }
  if (normalizedVibe === "nature") {
    return text.includes("nature") || text.includes("forest") || text.includes("garden") || text.includes("lake") || text.includes("eco") || text.includes("green") || text.includes("tree");
  }
  if (normalizedVibe === "adventure") {
    return text.includes("adventure") || text.includes("surf") || text.includes("trek") || text.includes("hike") || text.includes("sports") || text.includes("ski") || text.includes("climb");
  }
  if (normalizedVibe === "cultural") {
    return text.includes("cultural") || text.includes("temple") || text.includes("museum") || text.includes("historic") || text.includes("heritage") || text.includes("castle") || text.includes("history");
  }
  if (normalizedVibe === "culinary") {
    return text.includes("culinary") || text.includes("restaurant") || text.includes("food") || text.includes("dining") || text.includes("chef") || text.includes("breakfast") || text.includes("cook");
  }
  if (normalizedVibe === "nightlife") {
    return text.includes("nightlife") || text.includes("bar") || text.includes("pub") || text.includes("club") || text.includes("dj") || text.includes("party") || text.includes("lounge") || text.includes("music");
  }
  return false;
};
