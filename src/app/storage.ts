import { newDocument } from "../shared/initial";
import { fishCatalog } from "../shared/catalog";
import type { GameDocument, SiteState } from "../shared/types";
const key = "stillwater-jdk024-v1";
const spots = ["reed", "brook", "deep"];
const baits = ["worm", "corn", "fly"];
const zones = ["near", "mid", "far"];
const kinds = ["trash", "line", "sunken", "bag"];
const statuses = ["anchored", "drifting", "salvaged", "lost"];
const tools = ["hook", "shears", "net", "cleanser"];
function validBase(d: GameDocument) {
  const fishIds = fishCatalog.map((f) => f.id);
  return (
    spots.includes(d.spot) &&
    baits.includes(d.bait) &&
    Number.isFinite(d.power) &&
    d.power >= 0.15 &&
    d.power <= 0.95 &&
    Number.isFinite(d.drag) &&
    d.drag >= 0.15 &&
    d.drag <= 0.95 &&
    Number.isInteger(d.seed) &&
    !!d.stock &&
    baits.every(
      (b) =>
        Number.isInteger(d.stock[b as keyof typeof d.stock]) &&
        d.stock[b as keyof typeof d.stock] >= 0,
    ) &&
    !!d.stats &&
    ["casts", "catches", "escapes", "released"].every(
      (k) =>
        Number.isInteger(d.stats[k as keyof typeof d.stats]) &&
        d.stats[k as keyof typeof d.stats] >= 0,
    ) &&
    Array.isArray(d.claimed) &&
    d.claimed.every((c) => typeof c === "string") &&
    Array.isArray(d.bag) &&
    d.bag.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        fishIds.includes(c.fish) &&
        spots.includes(c.spot) &&
        baits.includes(c.bait) &&
        [c.weight, c.time, c.duration, c.peakTension].every(Number.isFinite),
    ) &&
    !!d.journal &&
    Object.entries(d.journal).every(
      ([id, e]) =>
        fishIds.includes(id as (typeof fishIds)[number]) &&
        e &&
        Number.isInteger(e.count) &&
        e.count > 0 &&
        Number.isFinite(e.best) &&
        Number.isFinite(e.first),
    )
  );
}
function validSite(s: SiteState) {
  return (
    !!s &&
    typeof s === "object" &&
    spots.includes(s.spot) &&
    Array.isArray(s.anchors) &&
    s.anchors.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.name === "string" &&
        zones.includes(a.zone) &&
        Number.isFinite(a.capacity) &&
        typeof a.intact === "boolean",
    ) &&
    Array.isArray(s.debris) &&
    s.debris.every(
      (d) =>
        d &&
        typeof d.id === "string" &&
        kinds.includes(d.kind) &&
        typeof d.name === "string" &&
        typeof d.anchor === "string" &&
        zones.includes(d.zone) &&
        Number.isFinite(d.mass) &&
        typeof d.sealed === "boolean" &&
        typeof d.torn === "boolean" &&
        Number.isFinite(d.pollution) &&
        Number.isFinite(d.brace) &&
        (d.braceAnchor === null || typeof d.braceAnchor === "string") &&
        statuses.includes(d.status) &&
        Number.isFinite(d.drift),
    ) &&
    !!s.water &&
    !!s.sediment &&
    zones.every(
      (z) =>
        Number.isFinite(s.water[z as keyof typeof s.water]) &&
        Number.isFinite(s.sediment[z as keyof typeof s.sediment]),
    ) &&
    [s.released, s.removed, s.carried, s.drifted, s.leaked, s.grass].every(
      Number.isFinite,
    ) &&
    Number.isInteger(s.attempts)
  );
}
function validV2(d: GameDocument) {
  return (
    d.version === 2 &&
    validBase(d) &&
    Number.isInteger(d.stats.salvaged) &&
    d.stats.salvaged >= 0 &&
    Number.isInteger(d.stats.torn) &&
    d.stats.torn >= 0 &&
    !!d.sites &&
    Object.entries(d.sites).every(
      ([spot, s]) => spots.includes(spot) && validSite(s),
    ) &&
    !!d.tools &&
    tools.every(
      (t) =>
        Number.isInteger(d.tools[t as keyof typeof d.tools]) &&
        d.tools[t as keyof typeof d.tools] >= 0,
    ) &&
    typeof d.kitIssued === "boolean" &&
    Array.isArray(d.cleanupClaimed) &&
    d.cleanupClaimed.every((c) => typeof c === "string")
  );
}
function migrate(parsed: unknown): GameDocument | null {
  if (!parsed || typeof parsed !== "object") return null;
  const version = (parsed as { version?: unknown }).version;
  const d = parsed as GameDocument;
  if (version === 2) return validV2(d) ? d : null;
  if (version !== 1 || !validBase(d)) return null;
  return {
    ...d,
    version: 2,
    stats: { ...d.stats, salvaged: 0, torn: 0 },
    sites: {},
    tools: { hook: 0, shears: 0, net: 0, cleanser: 0 },
    kitIssued: false,
    cleanupClaimed: [],
  };
}
export function loadGame(): { doc: GameDocument; notice: string; recovery?: true } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { doc: newDocument(), notice: "" };
    const parsed: unknown = JSON.parse(raw);
    const doc = migrate(parsed);
    return doc
      ? { doc, notice: "" }
      : {
          doc: newDocument(),
          notice: "本地手记格式或版本无法读取，已保留原手记并开启临时游玩。",
          recovery: true,
        };
  } catch {
    return {
      doc: newDocument(),
      notice: "无法读取本地手记，已暂停自动保存，本次可以临时游玩。",
      recovery: true,
    };
  }
}
export function saveGame(doc: GameDocument) {
  try {
    localStorage.setItem(key, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}
