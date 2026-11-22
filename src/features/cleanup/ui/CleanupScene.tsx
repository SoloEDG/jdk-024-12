import type {
  CleanupSession,
  DebrisItem,
  SiteState,
  ZoneId,
} from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import { ZONE_CAP, ZONE_NAMES, ZONE_ORDER } from "../model/sites";
import { anchorLoad } from "../model/state";

const ZONE_X: Record<ZoneId, number> = { near: 0, mid: 334, far: 667 };
const ZONE_W = 333;

function DebrisMark({
  d,
  index,
  selected,
  onPick,
}: {
  d: DebrisItem;
  index: number;
  selected: boolean;
  onPick: (() => void) | null;
}) {
  const cx = ZONE_X[d.zone] + 84 + (index % 2) * 150;
  const cy = 96 + Math.floor(index / 2) * 62;
  if (d.status === "salvaged")
    return (
      <g className="debris salvaged" key={d.id}>
        <circle cx={cx} cy={cy} r="13" />
        <path d={`M${cx - 5} ${cy}l4 4 7-8`} />
      </g>
    );
  if (d.status === "lost")
    return (
      <g className="debris lost" key={d.id}>
        <circle cx={cx} cy={296} r="11" />
        <path d={`M${cx - 4} ${293}l8 7m0-7l-8 7`} />
      </g>
    );
  const drifting = d.status === "drifting";
  const dx = drifting ? d.drift * 110 : 0;
  const body = (
    <g
      className={
        "debris live" +
        (drifting ? " drifting" : "") +
        (selected ? " selected" : "")
      }
      key={d.id}
      transform={`translate(${cx + dx} ${cy})`}
      onClick={onPick ?? undefined}
      role={onPick ? "button" : undefined}
      aria-label={onPick ? `标记${d.name}` : undefined}
    >
      {selected && <circle className="pick-ring" r="21" />}
      {d.kind === "bag" && (
        <>
          <rect x="-11" y="-9" width="22" height="19" rx="5" />
          <path d="M-4-9q4-6 8 0" />
        </>
      )}
      {d.kind === "line" && (
        <>
          <circle r="10" />
          <path d="M-6-2q6-8 12 0-6 8-12 0Zm4 6q4-5 8-1" />
        </>
      )}
      {d.kind === "sunken" && (
        <>
          <circle r="11" />
          <circle r="5" className="hole" />
        </>
      )}
      {d.kind === "trash" && (
        <>
          <path d="M-10-8h20v17h-20z" />
          <path d="M-10-3h20M-4-8v17" />
        </>
      )}
      {d.sealed && !d.torn && <circle className="seal-dot" cx="9" cy="-9" r="3.4" />}
      {drifting && (
        <path className="drift-wake" d="M-24 4h9m-12 6h13" />
      )}
    </g>
  );
  return body;
}

export function CleanupScene({
  site,
  cs,
  send,
}: {
  site: SiteState;
  cs: CleanupSession;
  send: (c: Command) => void;
}) {
  const picking = cs.phase === "survey" || cs.phase === "preview";
  const anchors = site.anchors.map((a) => ({
    ...a,
    load: anchorLoad(site, a.id),
    x: ZONE_X[a.zone] + ZONE_W / 2,
  }));
  const byZone = (zone: ZoneId) =>
    site.debris.filter((d) => d.zone === zone);
  return (
    <svg
      className="lake-scene cleanup-map"
      viewBox="0 0 1000 340"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="清障水域示意：三个可通水区域、支点与标记废物"
    >
      <defs>
        <linearGradient id="cleanup-water" x2="0" y2="1">
          <stop stopColor="#9dc2c1" />
          <stop offset="1" stopColor="#5b8f8d" />
        </linearGradient>
      </defs>
      {ZONE_ORDER.map((z) => {
        const murk = Math.min(1, (site.water[z] + site.sediment[z]) / ZONE_CAP);
        return (
          <g key={z}>
            <rect
              x={ZONE_X[z]}
              width={ZONE_W + 1}
              height="308"
              fill="url(#cleanup-water)"
            />
            <rect
              x={ZONE_X[z]}
              width={ZONE_W + 1}
              height="308"
              fill="#7c6f49"
              opacity={murk * 0.55}
            />
            <text x={ZONE_X[z] + 16} y="26" className="zone-name">
              {ZONE_NAMES[z]}
            </text>
            <text x={ZONE_X[z] + 16} y="42" className="zone-murk">
              {murk > 0.02 ? `浊度 ${Math.round(murk * 100)}%` : "水质清澈"}
            </text>
          </g>
        );
      })}
      <g className="flow-arrows">
        <path d="M306 150h24m-8-6 8 6-8 6" />
        <path d="M640 150h24m-8-6 8 6-8 6" />
      </g>
      <g className="grass-bed">
        <path
          d="M0 308h1000v32H0z"
          fill={site.grass > 45 ? "#4d7a63" : "#776f4a"}
        />
        {Array.from({ length: Math.max(2, Math.round(site.grass / 9)) }).map(
          (_, i) => (
            <path
              key={i}
              d={`M${30 + i * 83} 308q6-22-3-34m10 34q-2-18 8-30`}
              stroke={site.grass > 45 ? "#6f9c72" : "#8a7f52"}
              strokeWidth="3"
              fill="none"
            />
          ),
        )}
      </g>
      {anchors.map((a) => (
        <g
          key={a.id}
          className={"anchor-node" + (a.intact ? "" : " broken")}
          transform={`translate(${a.x} 268)`}
        >
          <ellipse rx="34" ry="16" />
          <text y="-24" textAnchor="middle">
            {a.name}
          </text>
          <g className="load-bar" transform="translate(-33 22)">
            <rect width="66" height="5" rx="2.5" className="load-bg" />
            <rect
              width={Math.min(66, (a.load / a.capacity) * 66)}
              height="5"
              rx="2.5"
              className={
                "load-fill" + (a.load > a.capacity * 0.8 ? " strained" : "")
              }
            />
          </g>
          <text className="load-text" y="40" textAnchor="middle">
            {a.intact ? `负荷 ${a.load}/${a.capacity}` : "已垮塌"}
          </text>
        </g>
      ))}
      {site.debris
        .filter((d) => d.status === "anchored")
        .map((d) => {
          const anchor = anchors.find((a) => a.id === d.anchor);
          if (!anchor) return null;
          const siblings = byZone(d.zone).filter((x) => x.status !== "lost");
          const index = siblings.findIndex((x) => x.id === d.id);
          const cx = ZONE_X[d.zone] + 84 + (index % 2) * 150;
          const cy = 96 + Math.floor(index / 2) * 62;
          return (
            <path
              key={"tether-" + d.id}
              className="tether"
              d={`M${cx} ${cy + 12}Q${(cx + anchor.x) / 2} ${cy + 60} ${anchor.x} 258`}
            />
          );
        })}
      {ZONE_ORDER.map((z) =>
        byZone(z)
          .filter((d) => d.status !== "lost")
          .map((d, i) => (
            <DebrisMark
              key={d.id}
              d={d}
              index={i}
              selected={cs.targetId === d.id}
              onPick={
                picking && d.status !== "salvaged"
                  ? () => send({ type: "cleanup-target", id: d.id })
                  : null
              }
            />
          )),
      )}
      {site.debris
        .filter((d) => d.status === "lost")
        .map((d, i) => (
          <DebrisMark key={d.id} d={d} index={i} selected={false} onPick={null} />
        ))}
    </svg>
  );
}
