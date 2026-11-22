import { Check, Fish, Flag, Sprout } from "lucide-react";
import type { CleanupSession, GameDocument } from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import {
  cleanupMilestones,
  milestoneProgress,
  milestoneReady,
  spotClarity,
  spotFish,
} from "../lib/restore";

const STATE_LABELS = { active: "活跃", wary: "谨慎", hidden: "隐匿" } as const;

export function RestorePanel({
  doc,
  cs,
  send,
}: {
  doc: GameDocument;
  cs: CleanupSession;
  send: (c: Command) => void;
}) {
  const site = doc.sites[cs.spot];
  const clarity = spotClarity(doc, cs.spot);
  const fish = spotFish(doc, cs.spot);
  return (
    <section className="cleanup-side restore-panel">
      <div className="section-title">
        <Sprout size={16} />
        <h2>修复进展</h2>
        <span>{Math.round(clarity * 100)}%</span>
      </div>
      <label className="clarity-meter">
        水体透明度 <strong>{Math.round(clarity * 100)}%</strong>
        <meter min="0" max="1" low={0.35} high={0.75} optimum={0.9} value={clarity} />
      </label>
      <label className="clarity-meter">
        水草健康 <strong>{Math.round(site?.grass ?? 100)}%</strong>
        <progress max="100" value={site?.grass ?? 100} />
      </label>
      <div className="fish-return">
        <small className="plan-label">可活动鱼群（随透明度恢复）</small>
        <div className="fish-chips">
          {fish.map(({ fish: f, state }) => (
            <span key={f.id} className={"fish-chip " + state}>
              <Fish size={12} />
              {f.name}
              <em>{STATE_LABELS[state]}</em>
            </span>
          ))}
        </div>
      </div>
      <div className="milestone-list">
        <small className="plan-label">清障里程碑</small>
        {cleanupMilestones.map((m) => {
          const n = milestoneProgress(doc, m);
          const claimed = doc.cleanupClaimed.includes(m.id);
          const ready = milestoneReady(doc, m);
          return (
            <div className="milestone-item" key={m.id}>
              <div className={"challenge-stamp " + (n >= m.target ? "done" : "")}>
                <Flag size={15} />
              </div>
              <div>
                <strong>{m.name}</strong>
                <small>{m.description}</small>
                <progress max={m.target} value={n} />
                <small className="reward">奖励 · {m.reward}</small>
              </div>
              {claimed ? (
                <Check size={15} />
              ) : ready ? (
                <button
                  className="claim-btn"
                  onClick={() => send({ type: "cleanup-claim", id: m.id })}
                >
                  领取
                </button>
              ) : (
                <span className="challenge-count">
                  {n}/{m.target}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
