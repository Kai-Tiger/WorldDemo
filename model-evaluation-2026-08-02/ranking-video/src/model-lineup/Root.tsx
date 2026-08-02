import {Composition} from "remotion";
import {ModelLineup} from "./ModelLineup";
import "./styles.css";

export const ModelLineupRoot: React.FC = () => {
  return (
    <Composition
      id="ModelLineup"
      component={ModelLineup}
      durationInFrames={750}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
