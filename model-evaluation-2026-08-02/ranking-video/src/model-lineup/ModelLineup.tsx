import type {CSSProperties} from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Platform = "codex" | "opencode";

type Model = {
  accent: string;
  accentSoft: string;
  edition?: string;
  name: string;
  platform: Platform;
  variant?: string;
};

const MODELS: Model[] = [
  {
    name: "DeepSeek V4 Flash",
    edition: "正式版",
    platform: "codex",
    accent: "#39d9ff",
    accentSoft: "#0d4f68",
  },
  {
    name: "GPT 5.6 Sol",
    variant: "xhigh",
    platform: "codex",
    accent: "#7c8cff",
    accentSoft: "#303a80",
  },
  {
    name: "GPT 5.6 Luna",
    variant: "max",
    platform: "codex",
    accent: "#ff70d3",
    accentSoft: "#7e2865",
  },
  {
    name: "GPT 5.6 Luna",
    variant: "medium",
    platform: "codex",
    accent: "#c790ff",
    accentSoft: "#59327e",
  },
  {
    name: "GPT 5.5",
    variant: "xhigh",
    platform: "codex",
    accent: "#8be88b",
    accentSoft: "#2e693d",
  },
  {
    name: "GLM 5.2",
    platform: "opencode",
    accent: "#ffb44f",
    accentSoft: "#7c5025",
  },
];

const LOGOS: Record<Platform, string> = {
  codex: staticFile("model-lineup/codex.png"),
  opencode: staticFile("model-lineup/opencode.png"),
};

const PLATFORM_LABELS: Record<Platform, string> = {
  codex: "Codex",
  opencode: "OpenCode",
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const fadeWindow = (
  frame: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number,
) => {
  const enter = interpolate(frame, [0, enterEnd], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exit = interpolate(frame, [exitStart, exitEnd], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  return enter * (1 - exit);
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 55) * 32;
  const sweep = interpolate(frame, [0, 750], [-480, 2260], clamp);

  return (
    <AbsoluteFill className="background">
      <div
        className="background-orb background-orb-blue"
        style={{transform: `translate3d(${drift}px, ${-drift * 0.4}px, 0)`}}
      />
      <div
        className="background-orb background-orb-purple"
        style={{transform: `translate3d(${-drift * 0.7}px, ${drift * 0.3}px, 0)`}}
      />
      <div className="grid" />
      <div className="sweep" style={{transform: `translateX(${sweep}px) rotate(14deg)`}} />
      <div className="grain" />
    </AbsoluteFill>
  );
};

const PlatformBadge: React.FC<{
  compact?: boolean;
  delay?: number;
  platform: Platform;
}> = ({compact = false, delay = 0, platform}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({
    frame: Math.max(0, frame - delay),
    fps,
    durationInFrames: compact ? 18 : 24,
    config: {damping: 14, mass: 0.75, stiffness: 180},
  });
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], clamp);

  return (
    <div
      className={compact ? "platform-badge platform-badge-compact" : "platform-badge"}
      style={{
        opacity,
        transform: `translateY(${interpolate(pop, [0, 1], [28, 0])}px) scale(${interpolate(pop, [0, 1], [0.72, 1])})`,
      }}
    >
      <Img className="platform-logo" src={LOGOS[platform]} />
      {!compact && <span>{PLATFORM_LABELS[platform]}</span>}
    </div>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = fadeWindow(frame, 16, 82, 105);
  const titleSpring = spring({
    frame,
    fps,
    durationInFrames: 34,
    config: {damping: 16, mass: 0.8, stiffness: 130},
  });
  const sixSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    durationInFrames: 34,
    config: {damping: 14, mass: 0.75, stiffness: 155},
  });
  const lineWidth = interpolate(frame, [8, 42], [0, 100], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill className="intro" style={{opacity}}>
      <div className="intro-kicker">MODEL COMPARISON · 2026</div>
      <div className="intro-main">
        <div
          className="intro-copy"
          style={{transform: `translateY(${interpolate(titleSpring, [0, 1], [90, 0])}px)`}}
        >
          我一共比较了
        </div>
        <div
          className="intro-six"
          style={{
            transform: `translateY(${interpolate(sixSpring, [0, 1], [120, 0])}px) scale(${interpolate(sixSpring, [0, 1], [0.72, 1])})`,
          }}
        >
          <span>6</span>
          <div>
            <strong>个模型</strong>
            <small>5 × CODEX&nbsp;&nbsp; / &nbsp;&nbsp;1 × OPENCODE</small>
          </div>
        </div>
      </div>
      <div className="intro-rule">
        <div style={{width: `${lineWidth}%`}} />
      </div>
      <div className="intro-indexes">
        {MODELS.map((model, index) => (
          <div key={`${model.name}-${model.variant ?? model.edition ?? "base"}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i style={{backgroundColor: model.accent}} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const ModelScene: React.FC<{index: number; model: Model}> = ({index, model}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = fadeWindow(frame, 10, 66, 88);
  const panelSpring = spring({
    frame,
    fps,
    durationInFrames: 27,
    config: {damping: 17, mass: 0.8, stiffness: 145},
  });
  const textProgress = interpolate(frame, [6, 25], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const detailProgress = interpolate(frame, [18, 37], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exitX = interpolate(frame, [66, 88], [0, -180], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const accentStyle = {
    "--accent": model.accent,
    "--accent-soft": model.accentSoft,
  } as CSSProperties;

  return (
    <AbsoluteFill className="model-scene" style={{...accentStyle, opacity}}>
      <div
        className="model-accent-plane"
        style={{
          opacity: interpolate(panelSpring, [0, 1], [0, 0.42]),
          transform: `translateX(${interpolate(panelSpring, [0, 1], [520, 0])}px) skewX(-12deg)`,
        }}
      />
      <div className="model-ghost-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="model-content" style={{transform: `translateX(${exitX}px)`}}>
        <div className="model-meta">
          <span>MODEL {String(index + 1).padStart(2, "0")}</span>
          <i />
          <span>{index + 1} / {MODELS.length}</span>
        </div>
        <div className="model-lockup">
          <div className="model-name-mask">
            <div
              className="model-name"
              style={{
                opacity: textProgress,
                transform: `translateY(${interpolate(textProgress, [0, 1], [126, 0])}px)`,
              }}
            >
              {model.name}
            </div>
          </div>
          <PlatformBadge delay={15} platform={model.platform} />
        </div>
        <div
          className="model-details"
          style={{
            opacity: detailProgress,
            transform: `translateY(${interpolate(detailProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          {(model.variant || model.edition) && (
            <span className="variant-pill">{model.variant ?? model.edition}</span>
          )}
          <span className="platform-copy">
            运行于 {PLATFORM_LABELS[model.platform]}
          </span>
        </div>
      </div>
      <div
        className="model-progress"
        style={{
          transform: `scaleX(${interpolate(frame, [0, 76], [0, 1], clamp)})`,
          backgroundColor: model.accent,
        }}
      />
    </AbsoluteFill>
  );
};

const SummaryChip: React.FC<{index: number; model: Model}> = ({index, model}) => {
  const frame = useCurrentFrame();
  const delay = 20 + index * 7;
  const enter = interpolate(frame, [delay, delay + 18], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const name = [model.name, model.variant, model.edition].filter(Boolean).join(" · ");

  return (
    <div
      className="summary-chip"
      style={{
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [70, 0])}px)`,
      }}
    >
      <i style={{backgroundColor: model.accent}} />
      <span>{name}</span>
      <PlatformBadge compact delay={delay + 4} platform={model.platform} />
    </div>
  );
};

const Summary: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = fadeWindow(frame, 15, 184, 210);
  const titleSpring = spring({
    frame,
    fps,
    durationInFrames: 32,
    config: {damping: 17, mass: 0.8, stiffness: 135},
  });
  const finalProgress = interpolate(frame, [118, 150], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill className="summary" style={{opacity}}>
      <div className="summary-heading">
        <span>RUNNING ENVIRONMENTS</span>
        <h2
          style={{transform: `translateY(${interpolate(titleSpring, [0, 1], [60, 0])}px)`}}
        >
          六个模型，两种运行环境
        </h2>
      </div>
      <div className="summary-columns">
        <div className="summary-column summary-column-codex">
          <div className="summary-platform-title">
            <Img src={LOGOS.codex} />
            <div>
              <strong>CODEX</strong>
              <span>5 MODELS</span>
            </div>
          </div>
          <div className="summary-list">
            {MODELS.slice(0, 5).map((model, index) => (
              <SummaryChip
                index={index}
                key={`${model.name}-${model.variant ?? model.edition ?? "base"}`}
                model={model}
              />
            ))}
          </div>
        </div>
        <div className="summary-divider" />
        <div className="summary-column summary-column-opencode">
          <div className="summary-platform-title">
            <Img src={LOGOS.opencode} />
            <div>
              <strong>OPENCODE</strong>
              <span>1 MODEL</span>
            </div>
          </div>
          <div className="summary-list">
            <SummaryChip index={5} model={MODELS[5]} />
          </div>
          <div className="summary-note">GLM 5.2 在 OpenCode 中运行</div>
        </div>
      </div>
      <div
        className="summary-final"
        style={{
          opacity: finalProgress,
          transform: `translateY(${interpolate(finalProgress, [0, 1], [36, 0])}px)`,
        }}
      >
        <span>6 MODELS</span>
        <i />
        <span>ONE COMPARISON</span>
      </div>
    </AbsoluteFill>
  );
};

export const ModelLineup: React.FC = () => {
  return (
    <AbsoluteFill className="video-root">
      <Background />
      <Sequence durationInFrames={106} premountFor={15}>
        <Intro />
      </Sequence>
      {MODELS.map((model, index) => (
        <Sequence
          durationInFrames={89}
          from={96 + index * 73}
          key={`${model.name}-${model.variant ?? model.edition ?? "base"}`}
          premountFor={15}
        >
          <ModelScene index={index} model={model} />
        </Sequence>
      ))}
      <Sequence durationInFrames={211} from={539} premountFor={15}>
        <Summary />
      </Sequence>
    </AbsoluteFill>
  );
};
