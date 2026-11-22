import type {
  DebrisItem,
  SalvageMethod,
  SiteState,
  SpotId,
  ToolId,
  ZoneId,
} from "../../../shared/types";

export const ZONE_ORDER: ZoneId[] = ["near", "mid", "far"];
export const ZONE_NAMES: Record<ZoneId, string> = {
  near: "近岸",
  mid: "湾心",
  far: "对岸",
};
export const REACH: Record<ZoneId, number> = { near: 0.15, mid: 0.35, far: 0.6 };
export const ZONE_CAP = 24;
export const STARTER_KIT: Record<ToolId, number> = {
  hook: 4,
  shears: 3,
  net: 2,
  cleanser: 2,
};
export const TOOL_NAMES: Record<ToolId, string> = {
  hook: "打捞钩",
  shears: "割线剪",
  net: "深水抄网",
  cleanser: "净水剂",
};
export const METHOD_NAMES: Record<SalvageMethod, string> = {
  pull: "强拉",
  dismantle: "逐段拆解",
  net: "抄网捞取",
};
export const KIND_NAMES: Record<DebrisItem["kind"], string> = {
  trash: "垃圾",
  line: "缠绕鱼线",
  sunken: "沉底废物",
  bag: "密封袋",
};
export const METHOD_TOOL: Record<SalvageMethod, ToolId> = {
  pull: "hook",
  dismantle: "shears",
  net: "net",
};

interface Blueprint {
  anchors: SiteState["anchors"];
  debris: SiteState["debris"];
  water: Record<ZoneId, number>;
  sediment: Record<ZoneId, number>;
}
const item = (
  id: string,
  kind: DebrisItem["kind"],
  name: string,
  anchor: string,
  zone: ZoneId,
  mass: number,
  extra?: Partial<DebrisItem>,
): DebrisItem => ({
  id,
  kind,
  name,
  anchor,
  zone,
  mass,
  sealed: false,
  torn: false,
  pollution: 0,
  brace: 0,
  braceAnchor: null,
  status: "anchored",
  drift: 0,
  ...extra,
});
const blueprints: Record<SpotId, Blueprint> = {
  reed: {
    anchors: [
      { id: "root", name: "老柳根", zone: "near", capacity: 5, intact: true },
      { id: "pile", name: "断木桩", zone: "mid", capacity: 7, intact: true },
    ],
    debris: [
      item("bag1", "bag", "密封化肥袋", "root", "near", 2, {
        sealed: true,
        pollution: 8,
      }),
      item("line1", "line", "缠绕鱼线团", "root", "near", 1),
      item("cans", "trash", "锈蚀罐头堆", "root", "near", 1),
      item("tire", "sunken", "旧轮胎", "pile", "mid", 3),
      item("net1", "trash", "破渔网", "pile", "mid", 2, {
        brace: 2,
        braceAnchor: "root",
      }),
      item("bag2", "bag", "密封农药袋", "pile", "far", 1, {
        sealed: true,
        pollution: 12,
      }),
    ],
    water: { near: 3, mid: 1, far: 0 },
    sediment: { near: 1, mid: 0, far: 0 },
  },
  brook: {
    anchors: [
      { id: "rock", name: "青石卡缝", zone: "mid", capacity: 9, intact: true },
      { id: "bush", name: "溪柳根团", zone: "near", capacity: 5, intact: true },
    ],
    debris: [
      item("bag3", "bag", "密封油桶", "rock", "mid", 3, {
        sealed: true,
        pollution: 14,
      }),
      item("pipe", "sunken", "锈蚀铁管", "rock", "mid", 3, {
        brace: 2,
        braceAnchor: "bush",
      }),
      item("rim", "sunken", "车轮钢圈", "rock", "far", 2),
      item("tarp", "trash", "破帆布", "bush", "near", 2),
      item("line2", "line", "废弃钓组", "bush", "near", 1),
      item("bag4", "bag", "密封涂料罐", "bush", "far", 1, {
        sealed: true,
        pollution: 10,
      }),
    ],
    water: { near: 2, mid: 2, far: 1 },
    sediment: { near: 0, mid: 1, far: 0 },
  },
  deep: {
    anchors: [
      { id: "stump", name: "湖心沉木", zone: "mid", capacity: 8, intact: true },
      { id: "chain", name: "旧锚链", zone: "far", capacity: 6, intact: true },
    ],
    debris: [
      item("net2", "trash", "沉没流网", "stump", "mid", 2, {
        brace: 3,
        braceAnchor: "chain",
      }),
      item("box", "sunken", "沉没工具箱", "stump", "mid", 2),
      item("bag6", "bag", "密封废料袋", "stump", "near", 1, {
        sealed: true,
        pollution: 9,
      }),
      item("crate", "trash", "漂浮木箱", "stump", "near", 1),
      item("bag5", "bag", "密封化工桶", "chain", "far", 3, {
        sealed: true,
        pollution: 18,
      }),
      item("line3", "line", "缠绕钢线", "chain", "far", 1),
    ],
    water: { near: 1, mid: 2, far: 2 },
    sediment: { near: 0, mid: 0, far: 1 },
  },
};
export function freshSite(spot: SpotId): SiteState {
  const b = blueprints[spot];
  const released =
    ZONE_ORDER.reduce((n, z) => n + b.water[z] + b.sediment[z], 0);
  return {
    spot,
    anchors: b.anchors.map((a) => ({ ...a })),
    debris: b.debris.map((d) => ({ ...d })),
    water: { ...b.water },
    sediment: { ...b.sediment },
    released,
    removed: 0,
    carried: 0,
    drifted: 0,
    leaked: 0,
    grass: 100,
    attempts: 0,
  };
}
