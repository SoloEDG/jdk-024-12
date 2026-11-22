import type { SiteState, SpotId, ZoneId } from "../../../shared/types";
import { ZONE_ORDER } from "../model/sites";

/** 各水域的流速：决定污染沿可通水区域扩散的快慢。 */
const FLOW_RATE: Record<SpotId, number> = { reed: 0.14, brook: 0.26, deep: 0.07 };
/** 可通水区域的连接关系：近岸 ⇄ 湾心 ⇄ 对岸。 */
const EDGES: [ZoneId, ZoneId][] = [
  ["near", "mid"],
  ["mid", "far"],
];
/** 每一轮扩散中，水中污染附着到本区沉积的比例（附着后不再随流平衡）。 */
const ATTACH = 0.08;
export const PURIFY_AMOUNT = 6;

/**
 * 污染只沿可通水区域逐步扩散并部分附着，
 * 因此局部净化无法直接抹平隔岸区域。
 */
export function diffuse(site: SiteState, rounds: number): SiteState {
  const water = { ...site.water };
  const sediment = { ...site.sediment };
  const rate = FLOW_RATE[site.spot];
  for (let r = 0; r < rounds; r++) {
    for (const [a, b] of EDGES) {
      const move = ((water[a] - water[b]) * rate) / 2;
      water[a] -= move;
      water[b] += move;
    }
    for (const z of ZONE_ORDER) {
      const stuck = water[z] * ATTACH;
      water[z] -= stuck;
      sediment[z] += stuck;
    }
  }
  return { ...site, water, sediment };
}

/** 局部净化：只从所选区域取走污染（先水中后附着），并记录移除总量。 */
export function purify(
  site: SiteState,
  zone: ZoneId,
): { site: SiteState; taken: number } {
  const water = { ...site.water };
  const sediment = { ...site.sediment };
  let left = PURIFY_AMOUNT;
  const fromWater = Math.min(water[zone], left);
  water[zone] -= fromWater;
  left -= fromWater;
  const fromSediment = Math.min(sediment[zone], left);
  sediment[zone] -= fromSediment;
  left -= fromSediment;
  const taken = Math.round((PURIFY_AMOUNT - left) * 100) / 100;
  if (taken <= 0) return { site, taken: 0 };
  const next = diffuse(
    { ...site, water, sediment, removed: site.removed + taken },
    2,
  );
  return { site: next, taken };
}
