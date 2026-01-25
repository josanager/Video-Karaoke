import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing, Img, staticFile } from 'remotion';
import React from 'react';

// Sample supporters - replace with actual names or load from a file
const SUPPORTERS = [
    "THANKS TO OUR PATRONS",
    "",
    "Gad Castro",
    "Haasinator13 PS4/PC",
    "Roy Treadwell III",
    "",
    "THANKS FOR YOUR SUPPORT!",
    "www.patreon.com/acapellakaraoke",
];

interface CreditsProps {
    startFrame: number; // Frame when credits should start
}

export const Credits: React.FC<CreditsProps> = ({ startFrame }) => {
    const frame = useCurrentFrame();
    const { fps, height } = useVideoConfig();

    // Only show after startFrame
    if (frame < startFrame) {
        return null;
    }

    // Calculate how many frames into the credits we are
    const creditsFrame = frame - startFrame;
    const creditsDuration = 15 * fps; // 15 seconds

    // Calculate vertical scroll position
    // Total content height - scaled up line height
    const lineHeight = 120; // Increased from 80
    const totalContentHeight = SUPPORTERS.length * lineHeight;

    // Scroll from bottom to top
    const scrollProgress = interpolate(
        creditsFrame,
        [0, creditsDuration],
        [height, -totalContentHeight],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.linear,
        }
    );

    // Fade in at start, fade out at end
    const opacity = interpolate(
        creditsFrame,
        [0, fps * 0.5, creditsDuration - fps * 0.5, creditsDuration],
        [0, 1, 1, 0],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    return (
        <AbsoluteFill style={{
            background: 'linear-gradient(180deg, #0a0a2e 0%, #1a0a3e 50%, #0a0a2e 100%)',
            overflow: 'hidden',
        }}>
            {/* Animated stars background */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(circle at ${50 + Math.sin(frame / 30) * 10}% ${50 + Math.cos(frame / 25) * 10}%, rgba(255,255,255,0.05) 0%, transparent 50%)`,
            }} />

            {/* Left side image */}
            <div style={{
                position: 'absolute',
                left: '5%',
                top: 0,
                bottom: 0,
                width: '45%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
                gap: 50, // Increased gap
            }}>
                <Img
                    src={staticFile('pentatonix.jpg')}
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '65%',
                        objectFit: 'contain',
                        borderRadius: 20,
                        transform: `rotate(${Math.sin(frame / 50) * 2}deg)`, // Very subtle rocking
                        transformOrigin: 'center center',
                    }}
                />
                <div style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 54, // Scaled up from 36
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    fontWeight: 700,
                    letterSpacing: 3,
                    textShadow: '0 3px 15px rgba(0,0,0,0.8)',
                    paddingTop: 30, // Increased padding
                    textAlign: 'center',
                }}>
                    FULL ALBUM (HI-FI) IN DESCRIPTION
                </div>
            </div>

            {/* Scrolling credits container */}
            <div style={{
                position: 'absolute',
                left: '55%', // Move to the right side
                right: 80, // Moved slightly more left
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // Center text within the right column
                transform: `translateY(${scrollProgress}px)`,
                opacity,
            }}>
                {SUPPORTERS.map((name, index) => {
                    const isTitle = name.includes('THANKS');
                    const isLink = name.includes('www') || name.includes('http');
                    const isEmpty = name === '';

                    if (isEmpty) {
                        return <div key={index} style={{ height: 60 }} />; // Increased spacing
                    }

                    let fontSize = 56; // Scaled Base size (from 38)
                    if (isTitle) fontSize = 72; // Scaled Title (from 48)
                    if (isLink) fontSize = 42; // Scaled Link (from 28)

                    return (
                        <div
                            key={index}
                            style={{
                                fontSize,
                                fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
                                fontWeight: isTitle ? 900 : (isLink ? 500 : 700),
                                color: isTitle ? '#ffff00' : (isLink ? 'rgba(255,255,255,0.7)' : '#ffffff'),
                                textShadow: isTitle
                                    ? '0 0 50px rgba(255,255,0,0.5), 0 3px 15px rgba(0,0,0,0.5)'
                                    : '0 3px 15px rgba(0,0,0,0.5)',
                                marginBottom: 30, // Increased
                                textAlign: 'center',
                                letterSpacing: isTitle ? 4 : 1.5,
                            }}
                        >
                            {name}
                        </div>
                    );
                })}
            </div>

            {/* Top and bottom gradients for smooth fade */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 150,
                background: 'linear-gradient(180deg, #0a0a2e 0%, transparent 100%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 150,
                background: 'linear-gradient(0deg, #0a0a2e 0%, transparent 100%)',
                pointerEvents: 'none',
            }} />
        </AbsoluteFill>
    );
};
