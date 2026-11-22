import { Thermometer, Wind, Waves, Droplets } from "lucide-react";
import type { SpotId } from "../../../shared/types";
import { water } from "../model/waters";
export function WaterConditions({
  spot,
  clarity,
}: {
  spot: SpotId;
  clarity: number;
}) {
  const w = water(spot);
  return (
    <div className="conditions">
      <span>
        <Thermometer size={14} />
        {w.temperature}°C 水温
      </span>
      <span>
        <Wind size={14} />
        微风 2 级
      </span>
      <span>
        <Waves size={14} />
        {w.current} · {w.depth}
      </span>
      <span>
        <Droplets size={14} />
        透明度 {Math.round(clarity * 100)}%
      </span>
    </div>
  );
}
