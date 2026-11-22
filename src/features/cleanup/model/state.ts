import type { DebrisItem, SiteState, ZoneId } from "../../../shared/types";
import { ZONE_ORDER } from "./sites";

export function residual(site: SiteState) {
  return ZONE_ORDER.reduce((n, z) => n + site.water[z] + site.sediment[z], 0);
}
export function contained(site: SiteState) {
  return site.debris
    .filter(
      (d) => (d.status === "anchored" || d.status === "drifting") && !d.torn,
    )
    .reduce((n, d) => n + d.pollution, 0);
}
export function salvagedCount(site: SiteState) {
  return site.debris.filter((d) => d.status === "salvaged").length;
}
export function siteCleared(site: SiteState) {
  return site.debris.every((d) => d.status === "salvaged");
}
export function anchorLoad(site: SiteState, anchorId: string) {
  return site.debris
    .filter((d) => d.status === "anchored" && d.anchor === anchorId)
    .reduce((n, d) => n + d.mass, 0);
}
export function driftingItems(site: SiteState) {
  return site.debris.filter((d) => d.status === "drifting");
}
export function targetable(site: SiteState) {
  return site.debris.filter(
    (d) => d.status === "anchored" || d.status === "drifting",
  );
}
export function findDebris(site: SiteState, id: string | null) {
  return site.debris.find((d) => d.id === id) ?? null;
}
export function zoneTotal(site: SiteState, zone: ZoneId) {
  return site.water[zone] + site.sediment[zone];
}
/** 把本次作业期间累积的漂移量合并进现场，漂移到底的废物就此漂失。 */
export function mergeDrift(
  site: SiteState,
  delta: Record<string, number>,
): { site: SiteState; lost: DebrisItem[] } {
  const lost: DebrisItem[] = [];
  let drifted = site.drifted;
  const debris = site.debris.map((d) => {
    const add = delta[d.id] ?? 0;
    if (d.status !== "drifting" || add <= 0) return d;
    const next = { ...d, drift: Math.min(1, d.drift + add) };
    if (next.drift >= 1) {
      next.status = "lost";
      if (!next.torn) drifted += next.pollution;
      lost.push(next);
    }
    return next;
  });
  return { site: { ...site, debris, drifted }, lost };
}
