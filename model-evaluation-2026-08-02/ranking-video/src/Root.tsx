import "./index.css";
import { Composition } from "remotion";
import { ModelRanking } from "./Composition";
import { ProjectPromptFlow } from "./ProjectPromptFlow";
import { ScoringMethodVideo } from "./ScoringMethodVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ModelRanking"
        component={ModelRanking}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ScoringMethod"
        component={ScoringMethodVideo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ProjectPromptFlow"
        component={ProjectPromptFlow}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
