import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { rankings, type Ranking } from "./data";

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const enter = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: easeOut,
  });

const scoreText = (score: number) =>
  Number.isInteger(score) ? score.toFixed(1) : String(score);

const AnimatedText: React.FC<{
  children: React.ReactNode;
  frame: number;
  start: number;
  distance?: number;
  className?: string;
}> = ({ children, frame, start, distance = 22, className }) => {
  const progress = enter(frame, start, 16);
  return (
    <span
      className={className}
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * distance}px)`,
      }}
    >
      {children}
    </span>
  );
};

const ScoreCell: React.FC<{
  label: string;
  value: number;
  frame: number;
  start: number;
}> = ({ label, value, frame, start }) => (
  <div className="score-cell">
    <AnimatedText frame={frame} start={start} className="score-value">
      {scoreText(value)}
    </AnimatedText>
    <AnimatedText
      frame={frame}
      start={start + 3}
      distance={12}
      className="score-label"
    >
      {label}
    </AnimatedText>
  </div>
);

const RankingRow: React.FC<{
  item: Ranking;
  index: number;
  frame: number;
}> = ({ item, index, frame }) => {
  const start = 42 + index * 25;
  const rowProgress = enter(frame, start, 22);
  const badgeProgress = enter(frame, start + 3, 18);
  const nameProgress = interpolate(
    frame,
    [start + 8, start + 32],
    [0, 1],
    clamp,
  );
  const visibleCharacters = Math.floor(nameProgress * item.model.length);
  const barProgress = enter(frame, start + 18, 36);
  const totalProgress = enter(frame, start + 24, 28);
  const displayedTotal = item.total * totalProgress;
  const championGlow =
    item.rank === 1 ? 0.55 + Math.sin(Math.max(0, frame - 280) / 18) * 0.15 : 0;

  return (
    <div
      className={`ranking-row rank-${item.rank}`}
      style={{
        opacity: rowProgress,
        transform: `translateX(${(1 - rowProgress) * -150}px) scale(${0.97 + rowProgress * 0.03})`,
        borderColor:
          item.rank === 1
            ? `rgba(245,196,81,${0.48 + championGlow * 0.25})`
            : undefined,
        boxShadow:
          item.rank === 1
            ? `0 0 ${30 + championGlow * 24}px rgba(245,196,81,${championGlow * 0.18})`
            : undefined,
      }}
    >
      <div
        className="score-bar"
        style={{
          width: `${item.total * barProgress}%`,
          background: item.color,
        }}
      />
      <div
        className="rank-badge"
        style={{
          background: item.color,
          opacity: badgeProgress,
          transform: `scale(${0.65 + badgeProgress * 0.35}) rotate(${(1 - badgeProgress) * -12}deg)`,
        }}
      >
        {item.rank}
      </div>
      <div className="model-block">
        <div className="model-name">
          {item.model.slice(0, visibleCharacters)}
          {nameProgress > 0 && nameProgress < 1 ? (
            <span className="cursor">▌</span>
          ) : null}
        </div>
        <AnimatedText
          frame={frame}
          start={start + 18}
          distance={12}
          className="model-note"
        >
          {item.note}
        </AnimatedText>
      </div>
      <div className="score-grid">
        <ScoreCell
          label="指令"
          value={item.instruction}
          frame={frame}
          start={start + 12}
        />
        <ScoreCell
          label="代码"
          value={item.code}
          frame={frame}
          start={start + 16}
        />
        <ScoreCell
          label="视觉"
          value={item.visual}
          frame={frame}
          start={start + 20}
        />
        <ScoreCell
          label="性能"
          value={item.performance}
          frame={frame}
          start={start + 24}
        />
      </div>
      <div
        className="total-block"
        style={{
          opacity: totalProgress,
          transform: `translateX(${(1 - totalProgress) * 24}px)`,
        }}
      >
        <span className="total-number" style={{ color: item.color }}>
          {displayedTotal.toFixed(item.total % 1 === 0 ? 1 : 2)}
        </span>
        <span className="total-label">总分</span>
      </div>
    </div>
  );
};

export const ModelRanking: React.FC = () => {
  const frame = useCurrentFrame();
  const eyebrowProgress = enter(frame, 4, 18);
  const titleProgress = interpolate(frame, [10, 38], [0, 1], clamp);
  const title = "七模型综合排名";
  const titleCharacters = Math.floor(titleProgress * title.length);
  const subtitleProgress = enter(frame, 22, 22);
  const footerProgress = enter(frame, 270, 28);
  const lineProgress = enter(frame, 16, 34);
  const orbShift = Math.sin(frame / 70) * 40;

  return (
    <AbsoluteFill className="canvas">
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

      <header className="header">
        <div
          className="eyebrow"
          style={{
            opacity: eyebrowProgress,
            transform: `translateY(${(1 - eyebrowProgress) * 18}px)`,
          }}
        >
          COLD MOUNTAIN · MODEL EVALUATION 2026
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
            4 × 25 分 · 总分 100
          </div>
        </div>
        <div
          className="header-line"
          style={{ transform: `scaleX(${lineProgress})` }}
        />
        <div
          className="subtitle"
          style={{
            opacity: subtitleProgress,
            transform: `translateY(${(1 - subtitleProgress) * 16}px)`,
          }}
        >
          指令遵循度 · 代码逻辑 · 视觉效果 · 性能帧率
        </div>
      </header>

      <main className="ranking-list">
        {rankings.map((item, index) => (
          <RankingRow
            key={item.model}
            item={item}
            index={index}
            frame={frame}
          />
        ))}
      </main>

      <footer
        className="footer"
        style={{
          opacity: footerProgress,
          transform: `translateY(${(1 - footerProgress) * 16}px)`,
        }}
      >
        <span>main 仅作视觉标杆，不参与评分</span>
        <span className="footer-dot">●</span>
        <span>固定机位 · 统一视口 · 实测性能</span>
      </footer>
    </AbsoluteFill>
  );
};
