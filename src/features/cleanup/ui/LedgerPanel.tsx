import { Droplets, Scale } from "lucide-react";
import type { CleanupSession, GameDocument } from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import { ZONE_NAMES, ZONE_ORDER } from "../model/sites";
import { contained, residual, zoneTotal } from "../model/state";
import { ZONE_CAP } from "../model/sites";

export function LedgerPanel({
  doc,
  cs,
  send,
}: {
  doc: GameDocument;
  cs: CleanupSession;
  send: (c: Command) => void;
}) {
  const site = doc.sites[cs.spot];
  if (!site) return null;
  const rest = residual(site);
  const released = site.released;
  const removed = site.removed;
  const sealed = contained(site);
  const busyPhase = cs.phase === "charging" || cs.phase === "reeling";
  return (
    <section className="cleanup-side ledger-panel">
      <div className="section-title">
        <Scale size={16} />
        <h2>污染总量对账</h2>
        <span>单位</span>
      </div>
      <div className="ledger-equation" aria-label="释放等于残留加移除">
        <span>
          已释放<strong>{released.toFixed(1)}</strong>
        </span>
        <em>=</em>
        <span>
          残留<strong>{rest.toFixed(1)}</strong>
        </span>
        <em>+</em>
        <span>
          已净化<strong>{removed.toFixed(1)}</strong>
        </span>
      </div>
      <div className="ledger-bar" role="img" aria-label="残留与已净化比例">
        <i
          className="rest"
          style={{ flexGrow: Math.max(rest, 0.001) }}
          title={`残留 ${rest.toFixed(1)}`}
        />
        <i
          className="gone"
          style={{ flexGrow: Math.max(removed, 0.001) }}
          title={`已净化 ${removed.toFixed(1)}`}
        />
      </div>
      <p className="ledger-contained">
        废物所含污染：已带走 {site.carried.toFixed(1)} · 仍封存{" "}
        {sealed.toFixed(1)} · 已泄漏 {site.leaked.toFixed(1)} · 漂失{" "}
        {site.drifted.toFixed(1)}
      </p>
      <div className="zone-list">
        {ZONE_ORDER.map((z) => {
          const total = zoneTotal(site, z);
          return (
            <div className="zone-row" key={z}>
              <span className="zone-label">{ZONE_NAMES[z]}</span>
              <span className="zone-bar">
                <i
                  style={{
                    width: `${Math.min(100, (total / ZONE_CAP) * 100)}%`,
                  }}
                />
              </span>
              <small>
                水中 {site.water[z].toFixed(1)} · 附着{" "}
                {site.sediment[z].toFixed(1)}
              </small>
              <button
                className="claim-btn"
                disabled={busyPhase || doc.tools.cleanser < 1 || total < 0.05}
                onClick={() => send({ type: "cleanup-purify", zone: z })}
              >
                <Droplets size={11} />
                净化
              </button>
            </div>
          );
        })}
      </div>
      <p className="muted ledger-note">
        净化只作用于所选区域；附着的污染不会随水流平衡，隔岸的浊水需要另行处理。
      </p>
    </section>
  );
}
