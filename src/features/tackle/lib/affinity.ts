import { fishCatalog } from "../../../shared/catalog";
import type { BaitId, SpotId } from "../../../shared/types";
import { fishState } from "../../cleanup/lib/restore";
export function attraction(spot: SpotId, bait: BaitId, clarity = 1) {
  return fishCatalog
    .filter((f) => f.waters.includes(spot))
    .map((f) => {
      const state = fishState(f, clarity);
      return {
        fish: f,
        weight:
          (f.baits.includes(bait) ? 5 : 1) *
          (f.rarity === "稀有" ? 0.45 : f.rarity === "少见" ? 0.7 : 1) *
          (state === "hidden" ? 0 : state === "wary" ? 0.45 : 1),
      };
    })
    .filter((v) => v.weight > 0);
}
export function biteDelay(bait: BaitId, roll: number) {
  return (bait === "worm" ? 1.8 : 2.3) + roll * 2;
}
