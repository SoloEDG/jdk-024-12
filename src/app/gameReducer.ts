import type { Workspace } from "../shared/types";
import type { Command } from "../shared/commands";
import { cleanupBusy, idleCleanup, idleSession, isBusy } from "../shared/initial";
import { selectWater } from "../features/waters";
import {
  chooseBait,
  tune,
  consumeBait,
  resupply,
  attraction,
  biteDelay,
} from "../features/tackle";
import { prepareCast, tickSession, strike } from "../features/fishing";
import { landCatch, releaseCatch } from "../features/collection";
import { claimReward } from "../features/challenges";
import {
  accrueDrift,
  buildPreview,
  claimCleanupMilestone,
  cleanupTick,
  findDebris,
  mergeSessionDrift,
  openCleanup,
  purifyZone,
  settleOutcome,
  spotClarity,
  METHOD_TOOL,
  ZONE_NAMES,
} from "../features/cleanup";
export function gameReducer(state: Workspace, c: Command): Workspace {
  const { doc, session: s, cleanup: cs } = state;
  const busy = isBusy(s);
  const cBusy = cleanupBusy(cs);
  switch (c.type) {
    case "spot":
      return busy || cBusy
        ? state
        : { ...state, doc: selectWater(doc, c.id), cleanup: null };
    case "bait":
      return busy || cBusy ? state : { ...state, doc: chooseBait(doc, c.id) };
    case "power":
      return { ...state, doc: tune(doc, "power", c.value) };
    case "drag":
      return busy || cBusy ? state : { ...state, doc: tune(doc, "drag", c.value) };
    case "resupply":
      return busy || cBusy
        ? state
        : {
            ...state,
            doc: resupply(doc),
            notice: "鱼饵已补给，带上好心情出发。",
          };
    case "charge-start":
      return s.phase === "ready" && doc.stock[doc.bait] > 0 && !cs
        ? {
            ...state,
            session: {
              ...idleSession(),
              phase: "charging",
              message: "再次点击，把鱼饵抛向水面。",
            },
          }
        : state;
    case "cast": {
      if (s.phase !== "charging") return state;
      const consumed = consumeBait(doc);
      if (!consumed) return state;
      const pool = attraction(doc.spot, doc.bait, spotClarity(doc, doc.spot));
      if (!pool.length) return state;
      const cast = prepareCast(doc, s.charge, pool, (r) =>
        biteDelay(doc.bait, r),
      );
      return {
        ...state,
        doc: {
          ...consumed,
          seed: cast.seed,
          stats: { ...doc.stats, casts: doc.stats.casts + 1 },
        },
        session: cast.session,
      };
    }
    case "strike":
      return { ...state, session: strike(s) };
    case "reel":
      if (s.phase === "fighting")
        return { ...state, session: { ...s, reeling: c.held } };
      if (cs?.phase === "reeling")
        return { ...state, cleanup: { ...cs, reeling: c.held } };
      return state;
    case "tick": {
      const dt = Math.min(0.1, Math.max(0, c.dt));
      const next = tickSession(s, doc, dt);
      let updated = doc;
      if (next.phase === "landed" && s.phase !== "landed")
        updated = landCatch(doc, next, Date.now());
      if (next.phase === "escaped" && s.phase !== "escaped")
        updated = {
          ...updated,
          stats: { ...updated.stats, escapes: updated.stats.escapes + 1 },
        };
      let cleanup = cs;
      if (cs && (cs.phase === "charging" || cs.phase === "reeling")) {
        const site = updated.sites[cs.spot];
        const stepped = cleanupTick(
          site ? accrueDrift(cs, site, dt) : cs,
          dt,
        );
        if (stepped.phase === "settled") {
          const settled = settleOutcome(updated, stepped);
          updated = settled.doc;
          cleanup = settled.session;
        } else if (stepped.phase === "survey" && cs.phase === "reeling") {
          // 断线：合并作业期间的漂移，目标与现场保持原样
          updated = mergeSessionDrift(updated, stepped).doc;
          cleanup = { ...stepped, driftDelta: {}, plan: null };
        } else {
          cleanup = stepped;
        }
      }
      if (next === s && cleanup === cs && updated === doc) return state;
      return { ...state, doc: updated, session: next, cleanup };
    }
    case "next":
      return s.phase === "landed" || s.phase === "escaped"
        ? { ...state, session: idleSession() }
        : state;
    case "release":
      return { ...state, doc: releaseCatch(doc, c.id) };
    case "claim":
      return { ...state, doc: claimReward(doc, c.id) };
    case "cleanup-open": {
      if (busy || cs) return state;
      const opened = openCleanup(doc, doc.spot);
      const session = idleCleanup(doc.spot);
      if (opened.lost.length)
        session.message = `一段时间没来，「${opened.lost.join("」「")}」已随水流漂出打捞范围。`;
      return {
        ...state,
        doc: opened.doc,
        cleanup: session,
        notice: opened.kitGranted
          ? "清障工具包已发放（仅一次）：打捞钩×4、割线剪×3、抄网×2、净水剂×2。"
          : state.notice,
      };
    }
    case "cleanup-close": {
      if (!cs) return state;
      const merged = mergeSessionDrift(doc, cs);
      return { ...state, doc: merged.doc, cleanup: null };
    }
    case "cleanup-target": {
      if (!cs || cBusy) return state;
      const site = doc.sites[cs.spot];
      const target = site ? findDebris(site, c.id) : null;
      if (!target || target.status === "salvaged" || target.status === "lost")
        return state;
      return {
        ...state,
        cleanup: {
          ...cs,
          targetId: c.id,
          method: null,
          plan: null,
          phase: "survey",
          message: `已标记「${target.name}」，选择打捞方式。`,
        },
      };
    }
    case "cleanup-method":
      return cs && !cBusy
        ? { ...state, cleanup: { ...cs, method: c.method } }
        : state;
    case "cleanup-preview": {
      if (!cs || cBusy || !cs.targetId || !cs.method) return state;
      const site = doc.sites[cs.spot];
      const target = site ? findDebris(site, cs.targetId) : null;
      if (!site || !target) return state;
      const tool = METHOD_TOOL[cs.method];
      if (doc.tools[tool] < 1)
        return {
          ...state,
          cleanup: { ...cs, message: "对应工具不足，里程碑奖励可以补充。" },
        };
      if (cs.method === "net" && target.status !== "drifting") return state;
      if (cs.method !== "net" && target.status !== "anchored") return state;
      return {
        ...state,
        cleanup: {
          ...cs,
          plan: buildPreview(site, target.id, cs.method),
          phase: "preview",
          message: "预览已生成：确认前，请留意仍未排除的连锁损伤。",
        },
      };
    }
    case "cleanup-confirm":
      return cs?.phase === "preview" && cs.plan
        ? {
            ...state,
            cleanup: {
              ...cs,
              phase: "charging",
              clock: 0,
              charge: 0,
              message: "再次点击抛竿，把钩子送到目标旁。",
            },
          }
        : state;
    case "cleanup-cast": {
      if (!cs || cs.phase !== "charging" || !cs.plan || !cs.method) return state;
      if (cs.charge < cs.plan.reach)
        return {
          ...state,
          cleanup: {
            ...cs,
            phase: "survey",
            plan: null,
            message: `落点够不到目标（需要 ${Math.round(cs.plan.reach * 100)}% 力度）。工具未消耗，再试一次。`,
          },
        };
      const tool = METHOD_TOOL[cs.method];
      if (doc.tools[tool] < 1)
        return {
          ...state,
          cleanup: { ...cs, phase: "survey", plan: null, message: "工具不足。" },
        };
      return {
        ...state,
        doc: { ...doc, tools: { ...doc.tools, [tool]: doc.tools[tool] - 1 } },
        cleanup: {
          ...cs,
          phase: "reeling",
          clock: 0,
          progress: 0,
          tension: 0.3,
          stress: 0,
          overload: 0,
          reeling: false,
          message: "钩住了！按住收线；应力越低，结果越接近预览下限。",
        },
      };
    }
    case "cleanup-abandon": {
      if (!cs || cs.phase === "survey" || cs.phase === "settled") return state;
      const merged = mergeSessionDrift(doc, cs);
      return {
        ...state,
        doc: merged.doc,
        cleanup: {
          ...cs,
          phase: "survey",
          plan: null,
          reeling: false,
          driftDelta: {},
          message:
            "已放弃本次打捞。湖面的破损保持原样，消耗的工具不会返还。",
        },
      };
    }
    case "cleanup-next":
      return cs?.phase === "settled"
        ? {
            ...state,
            cleanup: {
              ...cs,
              phase: "survey",
              targetId: null,
              method: null,
              plan: null,
              outcome: null,
              message: "选择下一件标记废物，或退出稍作休息。",
            },
          }
        : state;
    case "cleanup-purify": {
      if (!cs || cBusy) return state;
      const { doc: updated, taken } = purifyZone(doc, cs, c.zone);
      return taken <= 0
        ? state
        : {
            ...state,
            doc: updated,
            cleanup: {
              ...cs,
              message: `净化了 ${taken} 单位污染（仅作用于${ZONE_NAMES[c.zone]}，隔岸不受影响）。`,
            },
          };
    }
    case "cleanup-claim":
      return { ...state, doc: claimCleanupMilestone(doc, c.id) };
  }
}
