import { Composition } from 'remotion';
import { MyComposition } from './Composition';
import { ManualSync } from './ManualSync';
import './index.css';
import lyricsDataJson from '../public/lyrics.json';

// Safe cast or check
const durationInSeconds = (lyricsDataJson as any).duration || 10;
const CREDITS_DURATION = 15; // Extra seconds for credits
const fps = 60;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Karaoke"
        component={MyComposition}
        durationInFrames={Math.ceil((durationInSeconds + CREDITS_DURATION) * fps)}
        fps={fps}
        width={2560}
        height={1440}
      />
      <Composition
        id="LyricSynchronizer"
        component={ManualSync}
        durationInFrames={Math.ceil((durationInSeconds + CREDITS_DURATION) * fps)}
        fps={fps}
        width={2560}
        height={1440}
      />
    </>
  );
};
