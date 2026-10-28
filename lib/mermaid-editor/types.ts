export const DIRECTIONS = ["TD", "TB", "LR", "RL", "BT"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const SHAPES = [
  "rect",
  "round",
  "diamond",
  "circle",
  "stadium",
  "cylinder",
  "hexagon",
] as const;
export type Shape = (typeof SHAPES)[number];

export const EDGE_STYLES = ["solid", "dotted", "thick"] as const;
export type EdgeStyle = (typeof EDGE_STYLES)[number];

export type FlowNode = {
  id: string;
  label: string;
  shape: Shape;
};

export type FlowEdge = {
  from: string;
  to: string;
  label: string | null;
  style: EdgeStyle;
};

export type FlowGroup = {
  id: string;
  title: string;
  dir: Direction | null;
  members: string[];
};

export type FlowModel = {
  kind: "flowchart";
  dir: Direction;
  nodes: FlowNode[];
  edges: FlowEdge[];
  pos: Record<string, [number, number]>;
  groups: FlowGroup[];
  classDefs: string[];
  classes: { ids: string[]; name: string }[];
  styles: { id: string; rest: string }[];
};

export const ARROWS = ["->>", "-->>", "-x", "--x", "->", "-->"] as const;
export type Arrow = (typeof ARROWS)[number];

export type Party = {
  id: string;
  label: string | null;
  actor: boolean;
};

export type Message = {
  from: string;
  to: string;
  arrow: Arrow;
  text: string;
};

export type SeqModel = {
  kind: "sequence";
  parties: Party[];
  messages: Message[];
};

export type Model = FlowModel | SeqModel;

export type ParseResult =
  | { ok: true; model: Model }
  | { ok: false; reason: string; line: number | null };
