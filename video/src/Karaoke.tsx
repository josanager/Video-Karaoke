import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from 'remotion';
import React, { useMemo } from 'react';
import { CssLiquidBackground } from './CssLiquidBackground';

export interface LyricWord {
    word: string;
    start: number;
    end: number;
}

export interface LyricLine {
    words: LyricWord[];
    startTime: number;
    endTime: number;
    text: string;
}

export interface LyricsData {
    duration: number;
    lyrics: LyricWord[];
}

interface KaraokeDisplayProps {
    lyrics: LyricWord[];
    fadeOutStartFrame?: number;
}

// Group words into lines
function groupWordsIntoLines(words: LyricWord[], wordsPerLine: number = 7): LyricLine[] {
    const lines: LyricLine[] = [];

    for (let i = 0; i < words.length; i += wordsPerLine) {
        const lineWords = words.slice(i, i + wordsPerLine);
        if (lineWords.length > 0) {
            lines.push({
                words: lineWords,
                startTime: lineWords[0].start,
                endTime: lineWords[lineWords.length - 1].end,
                text: lineWords.map(w => w.word).join(' ')
            });
        }
    }

    return lines;
}

// Main Karaoke Display Component
export const KaraokeDisplay: React.FC<KaraokeDisplayProps> = ({ lyrics, fadeOutStartFrame }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;

    // Calculate fade out opacity if fadeOutStartFrame is provided
    let containerOpacity = 1;
    if (fadeOutStartFrame) {
        containerOpacity = interpolate(
            frame,
            [fadeOutStartFrame - fps, fadeOutStartFrame], // Fade out over 1 second before credits
            [1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
    }

    // Group words into lines - Memoized to prevent re-calculation on every frame
    const lines = useMemo(() => groupWordsIntoLines(lyrics, 7), [lyrics]);

    // Find current line index
    const currentLineIndex = useMemo(() => {
        let index = 0;
        for (let i = 0; i < lines.length; i++) {
            if (currentTime >= lines[i].startTime) {
                index = i;
            }
        }
        return index;
    }, [currentTime, lines]);

    // Get current and next line
    const currentLine = lines[currentLineIndex] || null;
    const nextLine = lines[currentLineIndex + 1] || null;

    // Calculate progress
    const totalLines = lines.length;
    const progressPercent = ((currentLineIndex + 1) / totalLines) * 100;

    // Use fixed color scheme (orange + navy blue) throughout the entire video
    const colorScheme = 1;

    // Accent color for progress bar (matches the orange theme)
    const accent = '#ff6b9d';

    return (
        <AbsoluteFill style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            padding: 60, // Increased padding
            overflow: 'hidden',
            opacity: containerOpacity,
        }}>
            {/* Liquid Gradient Background (Optimized for Render) */}
            <CssLiquidBackground colorScheme={colorScheme} />

            {/* Logo in upper-left corner with gentle rocking animation */}
            <Img
                src={staticFile('logo.svg')}
                style={{
                    position: 'absolute',
                    top: 45, // Scaled up
                    left: 45, // Scaled up
                    width: 120, // Scaled from 80
                    height: 'auto',
                    opacity: 0.9,
                    zIndex: 10,
                    transform: `rotate(${Math.sin(frame / 30) * 8}deg)`,
                    transformOrigin: 'center center',
                }}
            />

            {/* Lyrics container */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 50, // Increased gap
                maxWidth: '95%',
                zIndex: 1,
            }}>
                {/* Current line */}
                {currentLine && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        {currentLine.words.map((word: LyricWord, idx: number) => {
                            const wordDuration = word.end - word.start;
                            const progress = wordDuration > 0
                                ? (currentTime - word.start) / wordDuration
                                : (currentTime >= word.start ? 1 : 0);
                            const clampedProgress = Math.min(Math.max(progress, 0), 1);

                            // Bounce animation using spring
                            const bounceSpring = spring({
                                frame: frame - Math.floor(word.start * fps),
                                fps,
                                config: {
                                    damping: 10,
                                    stiffness: 200,
                                    mass: 0.5,
                                },
                            });

                            // Only apply bounce when word becomes active
                            const isActive = clampedProgress > 0 && clampedProgress < 1;
                            const isPassed = clampedProgress >= 1;
                            const bounceScale = isActive ? 1 + (bounceSpring * 0.15) : 1;
                            const bounceY = isActive ? -bounceSpring * 8 : 0;

                            // Colors
                            let color = '#ffffff';
                            let textShadow = '0 3px 15px rgba(0,0,0,0.5)'; // Scaled shadow

                            if (isPassed) {
                                color = '#00d4ff'; // Clean cyan color
                                textShadow = '0 3px 6px rgba(0,0,0,0.5)';
                            } else if (isActive) {
                                color = '#ffff00';
                                textShadow = '0 0 60px rgba(255, 255, 0, 1), 0 0 120px rgba(255, 255, 0, 0.6), 0 3px 15px rgba(0,0,0,0.5)';
                            }

                            return (
                                <span
                                    key={idx}
                                    style={{
                                        fontSize: 100, // Scaled from 68
                                        fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
                                        fontWeight: 900,
                                        color,
                                        margin: '0 15px 15px 15px', // Scaled margins
                                        transform: `scale(${bounceScale}) translateY(${bounceY}px)`,
                                        textShadow,
                                        display: 'inline-block',
                                        letterSpacing: '3px',
                                        WebkitTextStroke: isPassed || isActive ? 'none' : '2px rgba(255,255,255,0.3)',
                                    }}
                                >
                                    {word.word}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Next line (dimmed) */}
                {nextLine && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: 0.4,
                    }}>
                        {nextLine.words.map((word: LyricWord, idx: number) => (
                            <span
                                key={idx}
                                style={{
                                    fontSize: 70, // Scaled from 52
                                    fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
                                    fontWeight: 900,
                                    color: '#aaaaaa',
                                    margin: '0 12px 12px 12px',
                                    textShadow: '0 3px 15px rgba(0,0,0,0.5)',
                                    letterSpacing: '2px',
                                }}
                            >
                                {word.word}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Styled Progress Bar */}
            <div style={{
                position: 'absolute',
                bottom: 60, // Scaled up
                left: 90,
                right: 90,
                height: 40, // Scaled from 28
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: 'inset 0 3px 15px rgba(0,0,0,0.3), 0 0 30px rgba(0,0,0,0.2)',
            }}>
                {/* Gradient progress fill */}
                <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${accent}, #ffff00, ${accent})`,
                    backgroundSize: '200% 100%',
                    backgroundPosition: `${-frame % 200}% 0`,
                    borderRadius: 20,
                    boxShadow: `0 0 30px ${accent}88, 0 0 60px ${accent}44`,
                }} />

                {/* Animated shine effect */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '50%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                    borderRadius: '20px 20px 0 0',
                }} />
            </div>

            {/* Line counter with style */}
            <div style={{
                position: 'absolute',
                bottom: 110, // Scaled up
                fontSize: 28, // Scaled from 18
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
            }}>
                Line {currentLineIndex + 1} of {totalLines}
            </div>
        </AbsoluteFill>
    );
};

export { ManualSync } from './ManualSync';
