import type {
  PreviewPlan,
  SalvageMethod,
  SiteState,
  ZoneId,
} from "../../../shared/types";
import { REACH, ZONE_NAMES } from "../model/sites";

export interface SimEvent {
  type: "tear" | "anchor" | "sink" | "drift";
  text: string;
  release: number;
  zone: ZoneId | null;
  grass: number;
}
export interface SimOutcome {
  events: SimEvent[];
  release: number;
  grass: number;
  tornTarget: boolean;
  failedAnchors: string[];
  sunk: string[];
  tornSunk: string[];
  drifting: string[];
}
/** 密封袋被扯破的应力阈值：强拉很脆，逐段拆解更可控。 */
const TEAR_AT: Record<SalvageMethod, number> = {
  pull: 0.3,
  dismantle: 0.85,
  net: 2,
};
/** 强拉时目标质量对支点的瞬时冲击系数。 */
const YANK = 1.6;
/** 失去依托时，达到该质量的废物会压穿水草下沉，否则随流漂移。 */
const SINK_MASS = 2;

/**
 * 以整组支点为单位模拟一次打捞：不移除目标逐件判定，
 * 而是把目标移走后的负荷重分布、支点垮塌与连锁漂移一次算清。
 * 结果关于应力单调，应力 1 的结果即最坏情况（承诺安全范围）。
 */
export function simulate(
  site: SiteState,
  targetId: string,
  method: SalvageMethod,
  stress: number,
): SimOutcome {
  const anchors = new Map(site.anchors.map((a) => [a.id, { ...a }]));
  const items = new Map(
    site.debris
      .filter((d) => d.status === "anchored" || d.status === "drifting")
      .map((d) => [d.id, { ...d }]),
  );
  const target = items.get(targetId);
  const events: SimEvent[] = [];
  const failedAnchors: string[] = [];
  const sunk: string[] = [];
  const tornSunk: string[] = [];
  const drifting: string[] = [];
  const shift: Record<string, number> = {};
  let tornTarget = false;
  if (!target)
    return {
      events,
      release: 0,
      grass: 0,
      tornTarget,
      failedAnchors,
      sunk,
      tornSunk,
      drifting,
    };
  const loadOn = (anchorId: string) => {
    let n = shift[anchorId] ?? 0;
    for (const it of items.values()) if (it.anchor === anchorId) n += it.mass;
    return n;
  };
  const failAnchor = (anchorId: string) => {
    const anchor = anchors.get(anchorId);
    if (!anchor || !anchor.intact) return;
    anchor.intact = false;
    failedAnchors.push(anchorId);
    events.push({
      type: "anchor",
      text: `支点「${anchor.name}」超负荷垮塌，整组废物失去依托`,
      release: 0,
      zone: null,
      grass: 0,
    });
    for (const it of [...items.values()]) {
      if (it.anchor !== anchorId) continue;
      items.delete(it.id);
      if (it.braceAnchor && it.brace > 0)
        shift[it.braceAnchor] = (shift[it.braceAnchor] ?? 0) + it.brace;
      if (it.mass >= SINK_MASS) {
        sunk.push(it.id);
        let release = 0;
        if (it.sealed && !it.torn) {
          release = it.pollution;
          tornSunk.push(it.id);
        }
        events.push({
          type: "sink",
          text: `「${it.name}」压穿水草沉入湖底${release ? "，密封层被撞破" : ""}`,
          release,
          zone: it.zone,
          grass: it.mass * 4,
        });
      } else {
        drifting.push(it.id);
        events.push({
          type: "drift",
          text: `「${it.name}」脱离支点，随水流缓缓漂移`,
          release: 0,
          zone: it.zone,
          grass: 0,
        });
      }
    }
    for (const a of anchors.values())
      if (a.intact && loadOn(a.id) > a.capacity) failAnchor(a.id);
  };
  // 1. 目标本身是否被扯破（密封袋）
  if (target.sealed && !target.torn && stress >= TEAR_AT[method]) {
    tornTarget = true;
    events.push({
      type: "tear",
      text: `「${target.name}」被扯破，污染物尽数释入${ZONE_NAMES[target.zone]}水域`,
      release: target.pollution,
      zone: target.zone,
      grass: 0,
    });
  }
  // 2. 强拉的瞬时冲击可能先压垮目标所在支点（目标仍挂在支点上）
  const yankFailed: string[] = [];
  if (method === "pull" && target.status === "anchored") {
    const anchor = anchors.get(target.anchor);
    if (
      anchor &&
      anchor.intact &&
      loadOn(anchor.id) + stress * YANK * target.mass > anchor.capacity
    )
      yankFailed.push(anchor.id);
  }
  // 3. 目标被捞起移走；强拉会把牵连负荷一次性转嫁给共用支点
  items.delete(targetId);
  if (method === "pull" && target.braceAnchor && target.brace > 0)
    shift[target.braceAnchor] =
      (shift[target.braceAnchor] ?? 0) + target.brace;
  // 4. 连锁：垮塌支点依次触发，直到整组重新稳定
  for (const id of yankFailed) failAnchor(id);
  for (const a of anchors.values())
    if (a.intact && loadOn(a.id) > a.capacity) failAnchor(a.id);
  const release = events.reduce((n, e) => n + e.release, 0);
  const grass = events.reduce((n, e) => n + e.grass, 0);
  return {
    events,
    release,
    grass,
    tornTarget,
    failedAnchors,
    sunk,
    tornSunk,
    drifting,
  };
}

/**
 * 快速预览：给出结果范围（应力 0 与应力 1 两次模拟），
 * 并列出中间应力区间仍未能排除的连锁损伤及其触发阈值。
 */
export function buildPreview(
  site: SiteState,
  targetId: string,
  method: SalvageMethod,
): PreviewPlan {
  const best = simulate(site, targetId, method, 0);
  const worst = simulate(site, targetId, method, 1);
  const certain = best.events.map((e) => e.text);
  const certainSet = new Set(certain);
  const risks: PreviewPlan["risks"] = [];
  for (const e of worst.events) {
    if (certainSet.has(e.text)) continue;
    let threshold = 1;
    for (let s = 0.02; s <= 1; s += 0.02) {
      if (simulate(site, targetId, method, s).events.some((x) => x.text === e.text)) {
        threshold = Math.round(s * 100) / 100;
        break;
      }
    }
    risks.push({ threshold, text: e.text });
  }
  const target = site.debris.find((d) => d.id === targetId);
  return {
    targetId,
    method,
    releaseMin: best.release,
    releaseMax: worst.release,
    grassMin: best.grass,
    grassMax: worst.grass,
    certain,
    risks,
    reach: target ? REACH[target.zone] : 0,
  };
}
