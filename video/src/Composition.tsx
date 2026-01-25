import { AbsoluteFill, Audio, staticFile, useVideoConfig } from 'remotion';
import { LyricWord, LyricsData, KaraokeDisplay } from './Karaoke';
import { Credits } from './Credits';

// Load lyrics JSON
import lyricsDataJson from '../public/lyrics.json';

const lyricsData = lyricsDataJson as unknown as LyricsData | LyricWord[];
const songDuration = (lyricsDataJson as any).duration || 10;

export const MyComposition = () => {
  const { fps } = useVideoConfig();

  // Extract lyrics array from JSON
  const lyrics = 'lyrics' in lyricsData ? lyricsData.lyrics : (lyricsData as LyricWord[]);

  // Calculate when music ends (in frames)
  // Ensure we use the duration from JSON if available, otherwise default to audio duration
  const musicEndFrame = Math.ceil(songDuration * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Audio track */}
      <Audio src={staticFile('Na Na Na.wav')} />

      {/* Karaoke Display - shows 2 lines at a time */}
      <KaraokeDisplay lyrics={lyrics} fadeOutStartFrame={musicEndFrame} />

      {/* Credits section - appears after music ends */}
      <Credits startFrame={musicEndFrame} />
    </AbsoluteFill>
  );
};
