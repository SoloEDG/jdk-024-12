import { Anchor, Droplets, Grip, Scissors, Wrench } from "lucide-react";
import type { GameDocument } from "../../../shared/types";
import { TOOL_NAMES } from "../model/sites";

const TOOL_ICONS = {
  hook: Anchor,
  shears: Scissors,
  net: Grip,
  cleanser: Droplets,
} as const;

export function ToolPanel({ doc }: { doc: GameDocument }) {
  return (
    <div className="tool-strip">
      <span className="tool-title">
        <Wrench size={14} />
        工具包
      </span>
      {(Object.keys(TOOL_NAMES) as (keyof typeof TOOL_NAMES)[]).map((t) => {
        const Icon = TOOL_ICONS[t];
        return (
          <span
            key={t}
            className={"tool-chip" + (doc.tools[t] < 1 ? " empty" : "")}
            title={TOOL_NAMES[t]}
          >
            <Icon size={14} />
            {TOOL_NAMES[t]} ×{doc.tools[t]}
          </span>
        );
      })}
      <small className="tool-note">
        工具仅发放一次，里程碑可补充；放弃或断线不返还已消耗工具。
      </small>
    </div>
  );
}
