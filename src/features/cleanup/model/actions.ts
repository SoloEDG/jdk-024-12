import type {
  CleanupSession,
  GameDocument,
  SiteState,
  SpotId,
  ZoneId,
} from "../../../shared/types";
import { clamp } from "../../../shared/random";
import { freshSite, STARTER_KIT } from "./sites";
import { mergeDrift } from "./state";
import { simulate } from "../lib/simulation";
import { diffuse, purify } from "../lib/pollution";
import { cleanupMilestones, milestoneReady } from "../lib/restore";

/** 各水域的漂流速度（每秒），作业与离开期间漂流物都会继续漂。 */
const DRIFT_RATE: Record<SpotId, number> = { reed: 0.02, brook: 0.035, deep: 0.012 };
/** 再次来到现场时，漂流物已被水流推远一截。 */
const DRIFT_BUMP = 0.2;

export function openCleanup(
  doc: GameDocument,
  spot: SpotId,
): { doc: GameDocument; kitGranted: boolean; lost: string[] } {
  let next = doc;
  let kitGranted = false;
  if (!next.kitIssued) {
    next = { ...next, kitIssued: true, tools: { ...STARTER_KIT } };
    kitGranted = true;
  }
  let site = next.sites[spot] ?? freshSite(spot);
  const bump: Record<string, number> = {};
  for (const d of site.debris)
    if (d.status === "drifting") bump[d.id] = DRIFT_BUMP;
  const merged = mergeDrift(site, bump);
  site = diffuse(merged.site, 4);
  next = { ...next, sites: { ...next.sites, [spot]: site } };
  return {
    doc: next,
    kitGranted,
    lost: merged.lost.map((d) => d.name),
  };
}

export function cleanupTick(
  cs: CleanupSession,
  dt: number,
): CleanupSession {
  if (cs.phase === "charging") {
    const clock = cs.clock + dt;
    return {
      ...cs,
      clock,
      charge: clamp((Math.sin(clock * 2.2 - Math.PI / 2) + 1) / 2),
    };
  }
  if (cs.phase !== "reeling" || !cs.method) return cs;
  const clock = cs.clock + dt;
  const method = cs.method;
  const sway = method === "pull" ? 0.3 : method === "dismantle" ? 0.15 : 0.08;
  const base = method === "pull" ? 0.52 : method === "dismantle" ? 0.42 : 0.35;
  const aim = cs.reeling
    ? base + sway * (0.5 + 0.5 * Math.sin(clock * 1.9))
    : 0.18;
  const tension = clamp(cs.tension + (aim - cs.tension) * dt * 2.4, 0, 1.15);
  const safeBand = method === "pull" ? 0.62 : method === "dismantle" ? 0.8 : 1.2;
  const stress = clamp(cs.stress + Math.max(0, tension - safeBand) * dt * 0.55);
  const rate = method === "pull" ? 0.15 : method === "dismantle" ? 0.075 : 0.2;
  const progress = clamp(cs.progress + (cs.reeling ? rate : -0.01) * dt);
  const overload =
    tension > 0.97 ? cs.overload + dt : Math.max(0, cs.overload - dt * 2);
  return {
    ...cs,
    clock,
    tension,
    stress,
    progress,
    overload,
    phase: overload > 1.2 ? "survey" : progress >= 1 ? "settled" : "reeling",
    reeling: overload > 1.2 || progress >= 1 ? false : cs.reeling,
    message:
      overload > 1.2
        ? "鱼线绷断了，目标还在原处。消耗的工具不会返还。"
        : progress >= 1
          ? "打捞完成，看看这次的结果。"
          : cs.message,
  };
}

/** 作业期间，漂流中的废物持续随流移动（只累积在会话里，结算时合并）。 */
export function accrueDrift(
  cs: CleanupSession,
  site: SiteState,
  dt: number,
): CleanupSession {
  if (cs.phase !== "reeling") return cs;
  const rate = DRIFT_RATE[cs.spot] * dt;
  const driftDelta = { ...cs.driftDelta };
  let changed = false;
  for (const d of site.debris) {
    if (d.status !== "drifting") continue;
    driftDelta[d.id] = (driftDelta[d.id] ?? 0) + rate;
    changed = true;
  }
  return changed ? { ...cs, driftDelta } : cs;
}

/** 把会话里累积的漂移合并回文档（结算 / 放弃 / 退出 / 断线时调用）。 */
export function mergeSessionDrift(
  doc: GameDocument,
  cs: CleanupSession,
): { doc: GameDocument; lost: string[] } {
  const site = doc.sites[cs.spot];
  if (!site || !Object.keys(cs.driftDelta).length) return { doc, lost: [] };
  const merged = mergeDrift(site, cs.driftDelta);
  return {
    doc: { ...doc, sites: { ...doc.sites, [cs.spot]: merged.site } },
    lost: merged.lost.map((d) => d.name),
  };
}

/**
 * 结算：按实际累积应力在承诺范围内重放整组模拟，
 * 应用释放、垮塌、下沉、漂移与打捞结果，并推进污染扩散。
 */
export function settleOutcome(
  doc: GameDocument,
  cs: CleanupSession,
): { doc: GameDocument; session: CleanupSession } {
  const site = doc.sites[cs.spot];
  if (!site || !cs.targetId || !cs.method || !cs.plan)
    return { doc, session: { ...cs, phase: "survey" } };
  const outcome = simulate(site, cs.targetId, cs.method, cs.stress);
  const water = { ...site.water };
  const sediment = { ...site.sediment };
  for (const e of outcome.events) {
    if (!e.zone || e.release <= 0) continue;
    if (e.type === "tear") water[e.zone] += e.release;
    else sediment[e.zone] += e.release;
  }
  const debris = site.debris.map((d) => {
    if (d.id === cs.targetId)
      return { ...d, status: "salvaged" as const, torn: outcome.tornTarget };
    if (outcome.sunk.includes(d.id))
      return {
        ...d,
        status: "lost" as const,
        torn: d.torn || outcome.tornSunk.includes(d.id),
      };
    if (outcome.drifting.includes(d.id))
      return { ...d, status: "drifting" as const, drift: 0 };
    return d;
  });
  const target = site.debris.find((d) => d.id === cs.targetId);
  const anchors = site.anchors.map((a) =>
    outcome.failedAnchors.includes(a.id) ? { ...a, intact: false } : a,
  );
  let next: SiteState = {
    ...site,
    anchors,
    debris,
    water,
    sediment,
    released: site.released + outcome.release,
    carried: site.carried + (outcome.tornTarget ? 0 : (target?.pollution ?? 0)),
    leaked: site.leaked + outcome.release,
    grass: clamp(site.grass - outcome.grass, 0, 100),
    attempts: site.attempts + 1,
  };
  const merged = mergeDrift(next, cs.driftDelta);
  next = diffuse(merged.site, 2);
  const tornCount =
    (outcome.tornTarget ? 1 : 0) + outcome.tornSunk.length;
  const lines: string[] = [
    ...outcome.events.map((e) => e.text),
    ...merged.lost.map((d) => `「${d.name}」已随水流漂出打捞范围`),
  ];
  lines.push(
    outcome.release > 0
      ? `本次释放 ${outcome.release} 单位污染（承诺上限 ${cs.plan.releaseMax}），残留可继续净化。`
      : "本次没有新的污染释放。",
  );
  if (outcome.grass > 0)
    lines.push(`水草受损 ${outcome.grass} 点（承诺上限 ${cs.plan.grassMax}）。`);
  lines.push("实际结果未超出预览承诺的安全范围。");
  return {
    doc: {
      ...doc,
      sites: { ...doc.sites, [cs.spot]: next },
      stats: {
        ...doc.stats,
        salvaged: doc.stats.salvaged + 1,
        torn: doc.stats.torn + tornCount,
      },
    },
    session: {
      ...cs,
      phase: "settled",
      reeling: false,
      driftDelta: {},
      outcome: lines,
      message: "打捞完成，结果已记入手记。",
    },
  };
}

export function purifyZone(
  doc: GameDocument,
  cs: CleanupSession,
  zone: ZoneId,
): { doc: GameDocument; taken: number } {
  const site = doc.sites[cs.spot];
  if (!site || doc.tools.cleanser < 1) return { doc, taken: 0 };
  const { site: next, taken } = purify(site, zone);
  if (taken <= 0) return { doc, taken: 0 };
  return {
    doc: {
      ...doc,
      tools: { ...doc.tools, cleanser: doc.tools.cleanser - 1 },
      sites: { ...doc.sites, [cs.spot]: next },
    },
    taken,
  };
}

export function claimCleanupMilestone(
  doc: GameDocument,
  id: string,
): GameDocument {
  const m = cleanupMilestones.find((m) => m.id === id);
  if (!m || !milestoneReady(doc, m)) return doc;
  const tools = { ...doc.tools };
  for (const [tool, n] of Object.entries(m.grant))
    tools[tool as keyof typeof tools] += n ?? 0;
  return {
    ...doc,
    tools,
    cleanupClaimed: [...doc.cleanupClaimed, m.id],
  };
}
