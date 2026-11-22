import {
  AlertTriangle,
  Anchor,
  ArrowLeft,
  Cable,
  Check,
  CircleDot,
  MousePointer2,
  Package,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type {
  CleanupSession,
  DebrisItem,
  GameDocument,
  SalvageMethod,
  SiteState,
} from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import {
  KIND_NAMES,
  METHOD_NAMES,
  METHOD_TOOL,
  TOOL_NAMES,
  ZONE_NAMES,
} from "../model/sites";
import { findDebris, targetable } from "../model/state";

const KIND_ICONS = {
  trash: Trash2,
  line: Cable,
  sunken: CircleDot,
  bag: Package,
} as const;

function statusLabel(d: DebrisItem) {
  if (d.status === "salvaged") return "已打捞";
  if (d.status === "lost") return "已沉失";
  if (d.status === "drifting") return `漂流中 ${Math.round(d.drift * 100)}%`;
  return "已锚定";
}

function DebrisRow({
  d,
  site,
  selected,
  onPick,
}: {
  d: DebrisItem;
  site: SiteState;
  selected: boolean;
  onPick: () => void;
}) {
  const Icon = KIND_ICONS[d.kind];
  const done = d.status === "salvaged" || d.status === "lost";
  const anchor = site.anchors.find((a) => a.id === d.anchor);
  const braceAnchor = site.anchors.find((a) => a.id === d.braceAnchor);
  return (
    <button
      className={
        "debris-row" + (selected ? " selected" : "") + (done ? " done" : "")
      }
      disabled={done}
      onClick={onPick}
    >
      <span className="debris-icon">
        <Icon size={17} />
      </span>
      <span className="debris-text">
        <strong>
          {d.name}
          {d.sealed && !d.torn && <em className="sealed-tag">密封·易泄漏</em>}
          {d.torn && <em className="torn-tag">已破损</em>}
        </strong>
        <small>
          {KIND_NAMES[d.kind]} · {ZONE_NAMES[d.zone]} · 质量 {d.mass}
          {d.status === "anchored" && anchor
            ? ` · 支点「${anchor.name}」`
            : ""}
          {d.brace > 0 && braceAnchor
            ? ` · 牵连：移走会加重「${braceAnchor.name}」+${d.brace}`
            : ""}
        </small>
      </span>
      <span className={"debris-status s-" + d.status}>{statusLabel(d)}</span>
    </button>
  );
}

function MethodCard({
  method,
  doc,
  cs,
  send,
}: {
  method: SalvageMethod;
  doc: GameDocument;
  cs: CleanupSession;
  send: (c: Command) => void;
}) {
  const tool = METHOD_TOOL[method];
  const left = doc.tools[tool];
  const active = cs.method === method;
  const hints: Record<SalvageMethod, string> = {
    pull: "快，但冲击支点、容易扯破密封袋",
    dismantle: "慢而稳，先剪断牵连，几乎不扰动支点",
    net: "兜住漂流中的废物，避免它漂出范围",
  };
  return (
    <button
      className={"method-card" + (active ? " active" : "")}
      disabled={left < 1}
      onClick={() => send({ type: "cleanup-method", method })}
    >
      <strong>{METHOD_NAMES[method]}</strong>
      <small>{hints[method]}</small>
      <span className="method-cost">
        {TOOL_NAMES[tool]} ×1（剩 {left}）
      </span>
    </button>
  );
}

export function CleanupPanel({
  doc,
  site,
  cs,
  send,
}: {
  doc: GameDocument;
  site: SiteState;
  cs: CleanupSession;
  send: (c: Command) => void;
}) {
  const target = findDebris(site, cs.targetId);
  const remaining = targetable(site);
  const plan = cs.plan;
  return (
    <div className="fishing-controls cleanup-controls">
      <div className="live-status" role="status">
        <span className={"status-dot " + (cs.phase === "reeling" ? "bite" : "")} />
        <span>{cs.message}</span>
      </div>

      {cs.phase === "survey" && (
        <>
          {remaining.length === 0 ? (
            <div className="cleanup-done">
              <Check size={18} />
              <p>
                这片水域的废物已经处理完毕。
                <small>残留的污染仍可净化，透明度会随修复慢慢回升。</small>
              </p>
            </div>
          ) : (
            <div className="debris-list">
              {site.debris.map((d) => (
                <DebrisRow
                  key={d.id}
                  d={d}
                  site={site}
                  selected={cs.targetId === d.id}
                  onPick={() => send({ type: "cleanup-target", id: d.id })}
                />
              ))}
            </div>
          )}
          {target && (
            <div className="method-row">
              {target.status === "drifting" ? (
                <MethodCard method="net" doc={doc} cs={cs} send={send} />
              ) : (
                <>
                  <MethodCard method="pull" doc={doc} cs={cs} send={send} />
                  <MethodCard method="dismantle" doc={doc} cs={cs} send={send} />
                </>
              )}
              <button
                className="primary"
                disabled={!cs.method}
                onClick={() => send({ type: "cleanup-preview" })}
              >
                预览后果
              </button>
            </div>
          )}
        </>
      )}

      {cs.phase === "preview" && plan && target && (
        <div className="plan-card">
          <div className="plan-head">
            <strong>
              {target.name} · {METHOD_NAMES[plan.method]}
            </strong>
            <span>
              {TOOL_NAMES[METHOD_TOOL[plan.method]]} ×1 · 抛竿力度需 ≥{" "}
              {Math.round(plan.reach * 100)}%
            </span>
          </div>
          <div className="plan-range">
            <div>
              <small>污染释放</small>
              <strong>
                {plan.releaseMin} – {plan.releaseMax}
              </strong>
            </div>
            <div>
              <small>水草损伤</small>
              <strong>
                {plan.grassMin} – {plan.grassMax}
              </strong>
            </div>
            <div>
              <small>连锁事件</small>
              <strong>{plan.certain.length + plan.risks.length} 项</strong>
            </div>
          </div>
          {plan.certain.length > 0 && (
            <div className="plan-section">
              <small className="plan-label">确定会发生：</small>
              <ul>
                {plan.certain.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="plan-section risks">
            <small className="plan-label">
              <AlertTriangle size={12} />
              仍未排除的连锁损伤（收线应力越高越可能触发）：
            </small>
            {plan.risks.length > 0 ? (
              <ul>
                {plan.risks.map((r) => (
                  <li key={r.text}>
                    <em>应力 ≥ {Math.round(r.threshold * 100)}%</em>
                    {r.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="plan-safe">本次操作已排除连锁损伤。</p>
            )}
          </div>
          <p className="plan-promise">
            确认后，实际后果不会超出上述范围；收线越平稳，结果越接近下限。
          </p>
          <div className="action-row plan-actions">
            <button
              className="text-btn"
              onClick={() => send({ type: "cleanup-abandon" })}
            >
              <ArrowLeft size={13} />
              重新选择
            </button>
            <button
              className="primary"
              onClick={() => send({ type: "cleanup-confirm" })}
            >
              <Anchor size={16} />
              确认执行 · 准备抛竿
            </button>
          </div>
        </div>
      )}

      {cs.phase === "charging" && plan && (
        <>
          <div className="action-row">
            <span className="control-tip">
              <MousePointer2 size={15} />
              力度 {Math.round(cs.charge * 100)}% · 目标需要 ≥{" "}
              {Math.round(plan.reach * 100)}%
            </span>
            <button
              className="primary"
              onClick={() => send({ type: "cleanup-cast" })}
            >
              抛竿 · {Math.round(cs.charge * 100)}%
            </button>
          </div>
          <progress className="charge-bar" max="1" value={cs.charge} />
        </>
      )}

      {cs.phase === "reeling" && plan && (
        <>
          <div className="fight-meters">
            <label>
              鱼线张力 <strong>{Math.round(cs.tension * 100)}%</strong>
              <meter
                aria-label="鱼线张力"
                min="0"
                max="1"
                low={0.3}
                high={0.9}
                optimum={0.5}
                value={cs.tension}
              />
            </label>
            <label>
              打捞进度 <strong>{Math.round(cs.progress * 100)}%</strong>
              <progress aria-label="打捞进度" max="1" value={cs.progress} />
            </label>
            <label className="stress-meter">
              累积应力（越满越接近预览最差）
              <strong>{Math.round(cs.stress * 100)}%</strong>
              <progress aria-label="累积应力" max="1" value={cs.stress} />
            </label>
            <small>
              松手可降低张力与应力；张力拉满过久会断线，工具不返还。
            </small>
          </div>
          <div className="action-row">
            <button
              className="text-btn"
              onClick={() => send({ type: "cleanup-abandon" })}
            >
              放弃本次打捞
            </button>
            <button
              className={"primary reel-button " + (cs.reeling ? "held" : "")}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                send({ type: "reel", held: true });
              }}
              onPointerUp={() => send({ type: "reel", held: false })}
              onPointerCancel={() => send({ type: "reel", held: false })}
              onLostPointerCapture={() => send({ type: "reel", held: false })}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  send({ type: "reel", held: true });
                }
              }}
              onKeyUp={() => send({ type: "reel", held: false })}
              onBlur={() => send({ type: "reel", held: false })}
            >
              按住收线
            </button>
          </div>
        </>
      )}

      {cs.phase === "settled" && cs.outcome && (
        <div className="outcome-card">
          <small className="plan-label">本次打捞结果</small>
          <ul>
            {cs.outcome.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="action-row">
            <span className="control-tip">
              <Check size={14} />
              已发生的变化不会回滚
            </span>
            <button
              className="primary"
              onClick={() => send({ type: "cleanup-next" })}
            >
              <RotateCcw size={15} />
              继续清障
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
