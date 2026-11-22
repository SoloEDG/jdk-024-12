import type {
  FishSpecies,
  GameDocument,
  SiteState,
  SpotId,
  ToolId,
} from "../../../shared/types";
import { fishCatalog } from "../../../shared/catalog";
import { clamp } from "../../../shared/random";
import { freshSite } from "../model/sites";
import { residual, salvagedCount, siteCleared } from "../model/state";

export function clarityOf(site: SiteState) {
  const total = site.debris.length || 1;
  const purity = 1 - clamp(residual(site) / 22);
  return clamp(
    0.45 * purity + 0.35 * (salvagedCount(site) / total) + 0.2 * (site.grass / 100),
  );
}
export function spotClarity(doc: GameDocument, spot: SpotId) {
  return clarityOf(doc.sites[spot] ?? freshSite(spot));
}
export type FishState = "active" | "wary" | "hidden";
/** 透明度决定鱼群是否恢复活动：稀有鱼最敏感，常见鱼最顽强。 */
export function fishState(fish: FishSpecies, clarity: number): FishState {
  if (fish.rarity === "稀有")
    return clarity >= 0.62 ? "active" : clarity >= 0.42 ? "wary" : "hidden";
  if (fish.rarity === "少见")
    return clarity >= 0.4 ? "active" : clarity >= 0.22 ? "wary" : "hidden";
  return clarity >= 0.08 ? "active" : "wary";
}
export function spotFish(doc: GameDocument, spot: SpotId) {
  const clarity = spotClarity(doc, spot);
  return fishCatalog
    .filter((f) => f.waters.includes(spot))
    .map((f) => ({ fish: f, state: fishState(f, clarity) }));
}
export interface CleanupMilestone {
  id: string;
  name: string;
  description: string;
  target: number;
  reward: string;
  grant: Partial<Record<ToolId, number>>;
  measure: (doc: GameDocument) => number;
  extra?: (doc: GameDocument) => boolean;
}
const spots: SpotId[] = ["reed", "brook", "deep"];
const totalRemoved = (doc: GameDocument) =>
  spots.reduce((n, s) => n + (doc.sites[s]?.removed ?? 0), 0);
export const cleanupMilestones: CleanupMilestone[] = [
  {
    id: "salvage-1",
    name: "第一兜收获",
    description: "成功打捞 1 件废物",
    target: 1,
    reward: "深水抄网 ×1",
    grant: { net: 1 },
    measure: (d) => d.stats.salvaged,
  },
  {
    id: "gentle-3",
    name: "轻柔之手",
    description: "累计打捞 3 件，且从未扯破密封袋",
    target: 3,
    reward: "割线剪 ×2",
    grant: { shears: 2 },
    measure: (d) => d.stats.salvaged,
    extra: (d) => d.stats.torn === 0,
  },
  {
    id: "salvage-6",
    name: "清障熟手",
    description: "累计打捞 6 件废物",
    target: 6,
    reward: "打捞钩 ×3",
    grant: { hook: 3 },
    measure: (d) => d.stats.salvaged,
  },
  {
    id: "purify-12",
    name: "净水行动",
    description: "累计净化 12 单位污染",
    target: 12,
    reward: "净水剂 ×2",
    grant: { cleanser: 2 },
    measure: (d) => Math.round(totalRemoved(d)),
  },
  {
    id: "clarity-80",
    name: "重见清澈",
    description: "任一水域透明度达到 80%",
    target: 80,
    reward: "打捞钩 ×2",
    grant: { hook: 2 },
    measure: (d) =>
      Math.round(Math.max(...spots.map((s) => spotClarity(d, s))) * 100),
  },
  {
    id: "site-clear",
    name: "还一片净滩",
    description: "完成任意水域的全部打捞",
    target: 1,
    reward: "护水徽章",
    grant: {},
    measure: (d) =>
      spots.filter((s) => d.sites[s] && siteCleared(d.sites[s])).length,
  },
];
export function milestoneProgress(doc: GameDocument, m: CleanupMilestone) {
  return Math.min(m.target, m.measure(doc));
}
export function milestoneReady(doc: GameDocument, m: CleanupMilestone) {
  return (
    m.measure(doc) >= m.target &&
    (m.extra ? m.extra(doc) : true) &&
    !doc.cleanupClaimed.includes(m.id)
  );
}
