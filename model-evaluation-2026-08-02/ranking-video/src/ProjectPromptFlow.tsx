import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import "./ProjectPromptFlow.css";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const LINE_HEIGHT = 40;
const VIEWPORT_HEIGHT = 1080;
const VERTICAL_PADDING = 88;

type PromptLine = {
  text: string;
  kind: "blank" | "body" | "bullet" | "code" | "heading-1" | "heading-2" | "heading-3";
};

const classifyLine = (text: string): PromptLine["kind"] => {
  const trimmed = text.trim();
  if (trimmed === "") return "blank";
  if (trimmed.startsWith("### ")) return "heading-3";
  if (trimmed.startsWith("## ")) return "heading-2";
  if (trimmed.startsWith("# ")) return "heading-1";
  if (/^[-*] /.test(trimmed)) return "bullet";
  if (trimmed.startsWith("```") || trimmed.startsWith("?")) return "code";
  return "body";
};

export const ProjectPromptFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [handle] = useState(() => delayRender("Loading pasted text"));

  useEffect(() => {
    fetch(staticFile("pasted-text.txt"))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load pasted-text.txt: ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        setPrompt(text);
        continueRender(handle);
      })
      .catch((error: unknown) => {
        cancelRender(error instanceof Error ? error : new Error(String(error)));
      });
  }, [handle]);

  const lines = useMemo<PromptLine[]>(() => {
    if (prompt === null) return [];
    const rawLines = prompt.replace(/\r\n/g, "\n").split("\n");
    if (rawLines[rawLines.length - 1] === "") rawLines.pop();
    return rawLines.map((text) => ({ text, kind: classifyLine(text) }));
  }, [prompt]);

  if (lines.length === 0) return null;

  const entrance = interpolate(frame, [0, 14], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scrollProgress = interpolate(frame, [30, 876], [0, 1], clamp);
  const contentHeight = lines.length * LINE_HEIGHT;
  const endY = VIEWPORT_HEIGHT - contentHeight - VERTICAL_PADDING;
  const scrollY = interpolate(
    scrollProgress,
    [0, 1],
    [VERTICAL_PADDING, endY],
  );
  const ambientShift = interpolate(frame, [0, 899], [-70, 90], clamp);

  return (
    <AbsoluteFill className="prompt-flow">
      <div
        className="prompt-flow__aura prompt-flow__aura--top"
        style={{ transform: `translate3d(${ambientShift}px, 0, 0)` }}
      />
      <div
        className="prompt-flow__aura prompt-flow__aura--bottom"
        style={{ transform: `translate3d(${-ambientShift * 0.7}px, 0, 0)` }}
      />
      <div className="prompt-flow__grid" />

      <main className="prompt-flow__viewport" style={{ opacity: entrance }}>
        <div
          className="prompt-flow__lines"
          style={{ transform: `translate3d(0, ${scrollY}px, 0)` }}
        >
          {lines.map((line, index) => (
            <div
              className={`prompt-flow__line prompt-flow__line--${line.kind}`}
              key={`${index}-${line.text.slice(0, 18)}`}
            >
              {line.text || " "}
            </div>
          ))}
        </div>
        <div className="prompt-flow__shade prompt-flow__shade--top" />
        <div className="prompt-flow__shade prompt-flow__shade--bottom" />
      </main>
    </AbsoluteFill>
  );
};
