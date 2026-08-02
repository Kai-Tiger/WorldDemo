import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Platform = "codex" | "opencode";

type Model = {
  accent: string;
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
  },
  {
    name: "GPT 5.6 Sol",
    variant: "xhigh",
    platform: "codex",
    accent: "#7c8cff",
  },
  {
    name: "GPT 5.6 Luna",
    variant: "max",
    platform: "codex",
    accent: "#ff70d3",
  },
  {
    name: "GPT 5.6 Luna",
    variant: "medium",
    platform: "codex",
    accent: "#c790ff",
  },
  {
    name: "GPT 5.5",
    variant: "xhigh",
    platform: "codex",
    accent: "#8be88b",
  },
  {
    name: "GLM 5.2",
    platform: "opencode",
    accent: "#ffb44f",
  },
];

const ENTRY_FRAMES = [60, 144, 228, 312, 396, 480];

const LOGOS: Record<Platform, string> = {
  codex: staticFile("model-lineup/codex.png"),
  opencode: staticFile("model-lineup/opencode.png"),
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
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

const PlatformHeader: React.FC<{
  count: number;
  delay: number;
  platform: Platform;
}> = ({count, delay, platform}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame: Math.max(0, frame - delay),
    fps,
    durationInFrames: 32,
    config: {damping: 17, mass: 0.8, stiffness: 135},
  });
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], clamp);

  return (
    <div
      className="platform-header"
      style={{
        opacity,
        transform: `translateY(${interpolate(enter, [0, 1], [42, 0])}px)`,
      }}
    >
      <Img src={LOGOS[platform]} />
      <div>
        <strong>{platform === "codex" ? "CODEX" : "OPENCODE"}</strong>
        <span>{count} {count === 1 ? "MODEL" : "MODELS"}</span>
      </div>
    </div>
  );
};

const ModelRow: React.FC<{index: number; model: Model}> = ({index, model}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = ENTRY_FRAMES[index];
  const localFrame = frame - start;
  const enter = spring({
    frame: Math.max(0, localFrame),
    fps,
    durationInFrames: 34,
    config: {damping: 16, mass: 0.76, stiffness: 150},
  });
  const opacity = interpolate(localFrame, [0, 10], [0, 1], clamp);
  const logoEnter = spring({
    frame: Math.max(0, localFrame - 12),
    fps,
    durationInFrames: 22,
    config: {damping: 13, mass: 0.7, stiffness: 180},
  });
  const logoOpacity = interpolate(localFrame, [12, 20], [0, 1], clamp);
  const reveal = interpolate(localFrame, [3, 24], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const highlightX = interpolate(localFrame, [4, 34], [-260, 1180], clamp);
  const highlightOpacity = interpolate(localFrame, [3, 10, 26, 35], [0, 0.46, 0.28, 0], clamp);
  const name = [model.name, model.variant, model.edition].filter(Boolean).join(" · ");

  return (
    <div
      className="model-row"
      style={{
        opacity,
        transform: `translateY(${interpolate(enter, [0, 1], [34, 0])}px) scale(${interpolate(enter, [0, 1], [0.965, 1])})`,
      }}
    >
      <div
        className="row-highlight"
        style={{opacity: highlightOpacity, transform: `translateX(${highlightX}px) skewX(-16deg)`}}
      />
      <i className="model-accent" style={{backgroundColor: model.accent, boxShadow: `0 0 22px ${model.accent}`}} />
      <span
        className="model-name"
        style={{clipPath: `inset(0 ${interpolate(reveal, [0, 1], [100, 0])}% 0 0)`}}
      >
        {name}
      </span>
      <div
        className="row-logo-wrap"
        style={{
          opacity: logoOpacity,
          transform: `scale(${interpolate(logoEnter, [0, 1], [0.56, 1])}) rotate(${interpolate(logoEnter, [0, 1], [-8, 0])}deg)`,
        }}
      >
        <Img src={LOGOS[model.platform]} />
      </div>
    </div>
  );
};

const RuntimeNote: React.FC = () => {
  const frame = useCurrentFrame();
  const start = ENTRY_FRAMES[5] + 24;
  const enter = interpolate(frame, [start, start + 20], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      className="runtime-note"
      style={{
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`,
      }}
    >
      GLM 5.2 在 OpenCode 中运行
    </div>
  );
};

export const ModelLineup: React.FC = () => {
  const frame = useCurrentFrame();
  const pageEnter = interpolate(frame, [0, 18], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const pageExit = interpolate(frame, [720, 749], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill className="video-root">
      <Background />
      <AbsoluteFill className="lineup-page" style={{opacity: pageEnter * (1 - pageExit)}}>
        <div className="lineup-columns">
          <section className="lineup-column">
            <PlatformHeader count={5} delay={10} platform="codex" />
            <div className="model-list">
              {MODELS.slice(0, 5).map((model, index) => (
                <ModelRow
                  index={index}
                  key={`${model.name}-${model.variant ?? model.edition ?? "base"}`}
                  model={model}
                />
              ))}
            </div>
          </section>
          <div className="column-divider" />
          <section className="lineup-column">
            <PlatformHeader count={1} delay={18} platform="opencode" />
            <div className="model-list">
              <ModelRow index={5} model={MODELS[5]} />
            </div>
            <RuntimeNote />
          </section>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
