import { X } from "lucide-react";
import type {
  CleanupSession,
  GameDocument,
  SiteState,
} from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import { water } from "../../waters";
import { spotClarity } from "../lib/restore";
import { residual } from "../model/state";
import { CleanupScene } from "./CleanupScene";
import { CleanupPanel } from "./CleanupPanel";
import { ToolPanel } from "./ToolPanel";

export function CleanupStage({
  doc,
  cs,
  send,
}: {
  doc: GameDocument;
  cs: CleanupSession;
  send: (c: Command) => void;
}) {
  const site = doc.sites[cs.spot] as SiteState;
  const place = water(cs.spot);
  const clarity = Math.round(spotClarity(doc, cs.spot) * 100);
  return (
    <section className="fishing-stage cleanup-stage" id="cleanup">
      <div className="lake-top">
        <div>
          <span className="eyebrow">CLEANUP OPERATION</span>
          <h2>
            {place.name}
            <span>清障行动</span>
          </h2>
        </div>
        <button
          className="text-btn cleanup-exit"
          onClick={() => send({ type: "cleanup-close" })}
        >
          <X size={13} />
          退出 · 进度已保存
        </button>
      </div>
      <div className="scene-wrap cleanup-wrap">
        <CleanupScene site={site} cs={cs} send={send} />
        <div className="scene-caption">
          <span>透明度 {clarity}%</span>
          <span>支点和废物会互相牵连，先看整组，再动手。</span>
        </div>
      </div>
      <div className="conditions cleanup-conditions">
        <span>残留污染 {residual(site).toFixed(1)}</span>
        <span>已释放 {site.released.toFixed(1)}</span>
        <span>已净化 {site.removed.toFixed(1)}</span>
        <span>水草 {Math.round(site.grass)}%</span>
      </div>
      <CleanupPanel doc={doc} site={site} cs={cs} send={send} />
      <ToolPanel doc={doc} />
    </section>
  );
}
