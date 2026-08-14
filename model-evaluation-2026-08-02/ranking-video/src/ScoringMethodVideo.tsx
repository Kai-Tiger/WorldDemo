import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

type ScoringMethod = {
  title: string;
  score: number;
  dimensions: string;
  principle: string;
  color: string;
  code: string;
};

const methods: ScoringMethod[] = [
  {
    title: "指令遵循度",
    score: 25,
    dimensions:
      "指定资产 7 · 冻结布局/水文 6 · 第三人称 4 · 固定机位/API/metrics 5 · 禁止项 3",
    principle: "看源码路径与最终运行结果；只写 URL 不等于成功交付",
    color: "#f5c451",
    code: "INSTRUCTION",
  },
  {
    title: "代码逻辑",
    score: 25,
    dimensions: "架构职责 7 · 数据/算法 7 · 运行正确性 6 · 测试/可观测性 5",
    principle:
      "构建和单测是证据，但不能抵消浏览器 shader、ready 或资产方向错误",
    color: "#77c7bd",
    code: "CODE",
  },
  {
    title: "视觉效果",
    score: 25,
    dimensions:
      "地形 5 · 水系 4.5 · 植被 4.5 · 构图/完整性 4.5 · 材质/光照 4 · 稳定性 2.5",
    principle:
      "以指定服务最终帧为主，观察贴图、树木、草地、河流、湖泊、瀑布和角色",
    color: "#8faee0",
    code: "VISUAL",
  },
  {
    title: "性能帧率",
    score: 25,
    dimensions: "稳态 FPS 10 · 等价可见负载 8 · 帧稳定性 4 · 指标可信度 3",
    principle:
      "高 FPS 不能补偿未绘制的草、水体或地形；renderer 统计失真单独扣分",
    color: "#d69a63",
    code: "PERFORMANCE",
  },
];

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const enter = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const CellText: React.FC<{
  frame: number;
  start: number;
  children: React.ReactNode;
  className?: string;
}> = ({ frame, start, children, className }) => {
  const progress = enter(frame, start, 18);
  return (
    <div
      className={className}
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 22}px)`,
        clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
      }}
    >
      {children}
    </div>
  );
};

const MethodRow: React.FC<{
  item: ScoringMethod;
  index: number;
  frame: number;
}> = ({ item, index, frame }) => {
  const start = 58 + index * 35;
  const rowProgress = enter(frame, start, 24);
  const lineProgress = enter(frame, start + 10, 30);
  const scoreProgress = enter(frame, start + 12, 25);
  const displayedScore = item.score * scoreProgress;

  return (
    <div
      className="method-row"
      style={{
        opacity: rowProgress,
        transform: `translateX(${(1 - rowProgress) * -180}px) scale(${0.98 + rowProgress * 0.02})`,
        borderColor: `${item.color}55`,
      }}
    >
      <div
        className="method-accent"
        style={{ background: item.color, transform: `scaleY(${lineProgress})` }}
      />
      <div className="method-name-cell">
        <CellText frame={frame} start={start + 5} className="method-code">
          {item.code}
        </CellText>
        <CellText frame={frame} start={start + 8} className="method-name">
          {item.title}
        </CellText>
      </div>
      <div
        className="method-score-cell"
        style={{
          opacity: scoreProgress,
          transform: `scale(${0.7 + scoreProgress * 0.3})`,
          color: item.color,
        }}
      >
        <span className="method-score-value">{displayedScore.toFixed(0)}</span>
        <span className="method-score-unit">分</span>
      </div>
      <div className="method-dimensions-cell">
        <CellText frame={frame} start={start + 17}>
          {item.dimensions}
        </CellText>
      </div>
      <div className="method-principle-cell">
        <CellText frame={frame} start={start + 25}>
          {item.principle}
        </CellText>
      </div>
    </div>
  );
};

export const ScoringMethodVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const eyebrowProgress = enter(frame, 4, 18);
  const titleProgress = interpolate(frame, [10, 34], [0, 1], clamp);
  const title = "评分方法";
  const titleCharacters = Math.floor(titleProgress * title.length);
  const subtitleProgress = enter(frame, 20, 22);
  const headerProgress = enter(frame, 36, 20);
  const footerProgress = enter(frame, 240, 28);
  const orbShift = Math.sin(frame / 72) * 42;

  return (
    <AbsoluteFill className="canvas method-canvas">
      <div
        className="orb orb-one"
        style={{ transform: `translate(${orbShift}px, ${-orbShift * 0.4}px)` }}
      />
      <div
        className="orb orb-two"
        style={{
          transform: `translate(${-orbShift * 0.6}px, ${orbShift * 0.5}px)`,
        }}
      />
      <div className="grid" />

      <header className="method-header">
        <div
          className="eyebrow"
          style={{
            opacity: eyebrowProgress,
            transform: `translateY(${(1 - eyebrowProgress) * 18}px)`,
          }}
        >
          COLD MOUNTAIN · EVALUATION FRAMEWORK
        </div>
        <div className="title-row">
          <h1>
            {title.slice(0, titleCharacters)}
            {titleProgress > 0 && titleProgress < 1 ? (
              <span className="cursor">▌</span>
            ) : null}
          </h1>
          <div
            className="weight-chip"
            style={{
              opacity: subtitleProgress,
              transform: `translateX(${(1 - subtitleProgress) * 40}px)`,
            }}
          >
            4 个维度 × 25 分 = 100
          </div>
        </div>
        <div
          className="method-subtitle"
          style={{
            opacity: subtitleProgress,
            transform: `translateY(${(1 - subtitleProgress) * 14}px)`,
          }}
        >
          八个计分候选 · 四个一级维度完全等权
        </div>
      </header>

      <main className="method-table">
        <div
          className="method-table-header"
          style={{
            opacity: headerProgress,
            transform: `translateY(${(1 - headerProgress) * 18}px)`,
          }}
        >
          <span>一级维度</span>
          <span>分值</span>
          <span>二级维度</span>
          <span>评分原则</span>
        </div>
        <div className="method-rows">
          {methods.map((item, index) => (
            <MethodRow
              key={item.title}
              item={item}
              index={index}
              frame={frame}
            />
          ))}
        </div>
      </main>

      <footer
        className="method-footer"
        style={{
          opacity: footerProgress,
          transform: `translateY(${(1 - footerProgress) * 16}px)`,
        }}
      >
        <span>总分 100</span>
        <span className="footer-dot">●</span>
        <span>启动等待不计分</span>
        <span className="footer-dot">●</span>
        <span>main 仅作视觉标杆</span>
      </footer>
    </AbsoluteFill>
  );
};
