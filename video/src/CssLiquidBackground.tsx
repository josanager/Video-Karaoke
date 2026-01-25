import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export const CssLiquidBackground: React.FC<{ colorScheme?: number }> = ({ colorScheme = 1 }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    // Define colors based on scheme (matching the original WebGL themes)
    const colors = {
        1: { bg: '#0a0e27', blob: '#F15A22', accent: '#FF8850' }, // Orange + Navy
        2: { bg: '#0a0e27', blob: '#40E0D0', accent: '#FF6C50' }, // Turquoise + Coral
        3: { bg: '#050215', blob: '#9933cc', accent: '#3366cc' }, // Purple + Blue
    }[colorScheme] || { bg: '#0a0e27', blob: '#F15A22', accent: '#FF8850' };

    // movement logic helper
    const getPos = (offset: number, speed: number) => {
        const t = frame * 0.02 * speed;
        const x = 50 + Math.sin(t + offset) * 30;
        const y = 50 + Math.cos(t * 0.8 + offset) * 20;
        return { top: `${y}%`, left: `${x}%` };
    };

    return (
        <AbsoluteFill style={{
            backgroundColor: colors.bg,
            overflow: 'hidden',
            zIndex: 0
        }}>
            {/* Background Texture/Grain simulation (CSS noise) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.05,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                transform: 'scale(1.5)',
            }} />

            {/* Blob 1 - Main Color */}
            <div style={{
                position: 'absolute',
                ...getPos(0, 1),
                width: '60%',
                height: '60%',
                background: `radial-gradient(circle, ${colors.blob} 0%, transparent 70%)`,
                filter: 'blur(60px)',
                opacity: 0.6,
                transform: 'translate(-50%, -50%)',
            }} />

            {/* Blob 2 - Accent Color */}
            <div style={{
                position: 'absolute',
                ...getPos(2, 1.2),
                width: '50%',
                height: '50%',
                background: `radial-gradient(circle, ${colors.accent} 0%, transparent 70%)`,
                filter: 'blur(50px)',
                opacity: 0.5,
                transform: 'translate(-50%, -50%)',
            }} />

            {/* Blob 3 - Moving opposite */}
            <div style={{
                position: 'absolute',
                ...getPos(4, 0.8),
                width: '70%',
                height: '70%',
                background: `radial-gradient(circle, ${colors.blob} 0%, transparent 70%)`,
                filter: 'blur(80px)',
                opacity: 0.4,
                transform: 'translate(-50%, -50%)',
            }} />

            {/* Overlay Gradient to darken edges */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at 50% 50%, transparent 40%, ${colors.bg} 100%)`,
                opacity: 0.8,
            }} />
        </AbsoluteFill>
    );
};
