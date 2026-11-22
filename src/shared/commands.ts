import type { BaitId, SalvageMethod, SpotId, ZoneId } from "./types";
export type Command =
  | { type: "spot"; id: SpotId }
  | { type: "bait"; id: BaitId }
  | { type: "power"; value: number }
  | { type: "drag"; value: number }
  | { type: "charge-start" }
  | { type: "cast" }
  | { type: "strike" }
  | { type: "reel"; held: boolean }
  | { type: "tick"; dt: number }
  | { type: "next" }
  | { type: "release"; id: string }
  | { type: "claim"; id: string }
  | { type: "resupply" }
  | { type: "cleanup-open" }
  | { type: "cleanup-close" }
  | { type: "cleanup-target"; id: string }
  | { type: "cleanup-method"; method: SalvageMethod }
  | { type: "cleanup-preview" }
  | { type: "cleanup-confirm" }
  | { type: "cleanup-cast" }
  | { type: "cleanup-abandon" }
  | { type: "cleanup-next" }
  | { type: "cleanup-purify"; zone: ZoneId }
  | { type: "cleanup-claim"; id: string };
