export type SpotId = "reed" | "brook" | "deep";
export type BaitId = "worm" | "corn" | "fly";
export type FishId = "crucian" | "perch" | "carp" | "trout" | "bass" | "pike";
export type Phase =
  "ready" | "charging" | "waiting" | "bite" | "fighting" | "landed" | "escaped";
export type ZoneId = "near" | "mid" | "far";
export type DebrisKind = "trash" | "line" | "sunken" | "bag";
export type DebrisStatus = "anchored" | "drifting" | "salvaged" | "lost";
export type ToolId = "hook" | "shears" | "net" | "cleanser";
export type SalvageMethod = "pull" | "dismantle" | "net";
export type CleanupPhase =
  "survey" | "preview" | "charging" | "reeling" | "settled";
export interface FishSpecies {
  id: FishId;
  name: string;
  latin: string;
  color: string;
  rarity: string;
  min: number;
  max: number;
  strength: number;
  waters: SpotId[];
  baits: BaitId[];
  note: string;
}
export interface Catch {
  id: string;
  fish: FishId;
  weight: number;
  spot: SpotId;
  bait: BaitId;
  time: number;
  duration: number;
  peakTension: number;
}
export interface JournalEntry {
  count: number;
  best: number;
  first: number;
}
export interface AnchorState {
  id: string;
  name: string;
  zone: ZoneId;
  capacity: number;
  intact: boolean;
}
export interface DebrisItem {
  id: string;
  kind: DebrisKind;
  name: string;
  anchor: string;
  zone: ZoneId;
  mass: number;
  sealed: boolean;
  torn: boolean;
  pollution: number;
  brace: number;
  braceAnchor: string | null;
  status: DebrisStatus;
  drift: number;
}
export interface SiteState {
  spot: SpotId;
  anchors: AnchorState[];
  debris: DebrisItem[];
  water: Record<ZoneId, number>;
  sediment: Record<ZoneId, number>;
  released: number;
  removed: number;
  carried: number;
  drifted: number;
  leaked: number;
  grass: number;
  attempts: number;
}
export interface ChainRisk {
  threshold: number;
  text: string;
}
export interface PreviewPlan {
  targetId: string;
  method: SalvageMethod;
  releaseMin: number;
  releaseMax: number;
  grassMin: number;
  grassMax: number;
  certain: string[];
  risks: ChainRisk[];
  reach: number;
}
export interface CleanupSession {
  spot: SpotId;
  phase: CleanupPhase;
  targetId: string | null;
  method: SalvageMethod | null;
  plan: PreviewPlan | null;
  charge: number;
  clock: number;
  progress: number;
  tension: number;
  stress: number;
  overload: number;
  reeling: boolean;
  driftDelta: Record<string, number>;
  outcome: string[] | null;
  message: string;
}
export interface GameDocument {
  version: 2;
  spot: SpotId;
  bait: BaitId;
  power: number;
  drag: number;
  seed: number;
  stock: Record<BaitId, number>;
  bag: Catch[];
  journal: Partial<Record<FishId, JournalEntry>>;
  stats: {
    casts: number;
    catches: number;
    escapes: number;
    released: number;
    salvaged: number;
    torn: number;
  };
  claimed: string[];
  sites: Partial<Record<SpotId, SiteState>>;
  tools: Record<ToolId, number>;
  kitIssued: boolean;
  cleanupClaimed: string[];
}
export interface Session {
  id: string;
  phase: Phase;
  clock: number;
  charge: number;
  castPower: number;
  spot: SpotId;
  bait: BaitId;
  fish: FishId | null;
  weight: number;
  biteAt: number;
  progress: number;
  tension: number;
  energy: number;
  slackTime: number;
  overload: number;
  peak: number;
  reeling: boolean;
  duration: number;
  message: string;
}
export interface Workspace {
  doc: GameDocument;
  session: Session;
  cleanup: CleanupSession | null;
  notice: string;
}
