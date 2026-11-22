import type { CleanupSession, GameDocument, Session, SpotId } from "./types";
export function newDocument(): GameDocument {
  return {
    version: 2,
    spot: "reed",
    bait: "worm",
    power: 0.6,
    drag: 0.4,
    seed: 48127,
    stock: { worm: 24, corn: 20, fly: 16 },
    bag: [],
    journal: {},
    stats: { casts: 0, catches: 0, escapes: 0, released: 0, salvaged: 0, torn: 0 },
    claimed: [],
    sites: {},
    tools: { hook: 0, shears: 0, net: 0, cleanser: 0 },
    kitIssued: false,
    cleanupClaimed: [],
  };
}
export function idleSession(): Session {
  return {
    id: "",
    phase: "ready",
    clock: 0,
    charge: 0,
    castPower: 0,
    spot: "reed",
    bait: "worm",
    fish: null,
    weight: 0,
    biteAt: 2,
    progress: 0,
    tension: 0.35,
    energy: 1,
    slackTime: 0,
    overload: 0,
    peak: 0,
    reeling: false,
    duration: 0,
    message: "深呼吸，把时间交给湖面。",
  };
}
export function idleCleanup(spot: SpotId): CleanupSession {
  return {
    spot,
    phase: "survey",
    targetId: null,
    method: null,
    plan: null,
    charge: 0,
    clock: 0,
    progress: 0,
    tension: 0.3,
    stress: 0,
    overload: 0,
    reeling: false,
    driftDelta: {},
    outcome: null,
    message: "先标记一件废物，再决定怎么打捞。",
  };
}
export function isBusy(s: Session) {
  return ["charging", "waiting", "bite", "fighting"].includes(s.phase);
}
export function cleanupBusy(c: CleanupSession | null) {
  return !!c && (c.phase === "charging" || c.phase === "reeling");
}
