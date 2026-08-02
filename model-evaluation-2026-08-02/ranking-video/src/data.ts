export type Ranking = {
  rank: number;
  model: string;
  instruction: number;
  code: number;
  visual: number;
  performance: number;
  total: number;
  color: string;
  note: string;
};

export const rankings: Ranking[] = [
  {
    rank: 1,
    model: "GPT 5.6 Sol xhigh",
    instruction: 20.5,
    code: 20,
    visual: 15.5,
    performance: 22,
    total: 78,
    color: "#f5c451",
    note: "重负载下最均衡",
  },
  {
    rank: 2,
    model: "GPT 5.6 Luna Max",
    instruction: 19.5,
    code: 19.5,
    visual: 13,
    performance: 17,
    total: 69,
    color: "#9fb8d8",
    note: "宏观画面完整",
  },
  {
    rank: 3,
    model: "DeepSeek V4 Flash max",
    instruction: 15.5,
    code: 19,
    visual: 11.25,
    performance: 16.5,
    total: 62.25,
    color: "#d69a63",
    note: "2154 万三角形重负载",
  },
  {
    rank: 4,
    model: "GPT 5.5 xhigh",
    instruction: 18,
    code: 14.5,
    visual: 5.5,
    performance: 21,
    total: 59,
    color: "#77c7bd",
    note: "高帧率 · 地形水系失效",
  },
  {
    rank: 5,
    model: "GPT 5.6 Luna Medium",
    instruction: 16.5,
    code: 11,
    visual: 6.5,
    performance: 18,
    total: 52,
    color: "#8e95aa",
    note: "轻量原型",
  },
  {
    rank: 6,
    model: "GLM 5.2 xhigh",
    instruction: 15,
    code: 14.5,
    visual: 5.25,
    performance: 14,
    total: 48.75,
    color: "#777f92",
    note: "运行时错误影响交付",
  },
];
