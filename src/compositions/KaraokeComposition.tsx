import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {
  title: string;
  artist: string;
  currentLine: string;
  nextLine: string;
  accentColor: string;
};

export const KaraokeComposition: React.FC<Props> = ({
  title,
  artist,
  currentLine,
  nextLine,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleRise = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 110,
    },
  });

  const glow = interpolate(frame, [0, 120, 240], [0.18, 0.34, 0.18], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #1b140f 0%, #2a1e14 55%, #18120d 100%)',
        color: '#f6ede3',
        fontFamily: 'SF Pro Display, Helvetica Neue, Helvetica, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '34px 40px 20px 40px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: -1.2,
              transform: `translateY(${(1 - titleRise) * 20}px)`,
              opacity: titleRise,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#ccbba7',
              marginTop: 6,
            }}
          >
            {artist}
          </div>
        </div>
        <div
          style={{
            border: `1px solid ${accentColor}55`,
            color: '#ead8c6',
            borderRadius: 999,
            padding: '10px 16px',
            fontSize: 16,
            backgroundColor: '#ffffff08',
          }}
        >
          Karaoke
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 28,
          padding: '20px 40px 40px 40px',
        }}
      >
        <div
          style={{
            border: '1px solid #4a3728',
            borderRadius: 18,
            background: 'linear-gradient(180deg, #221912 0%, #1a130f 100%)',
            padding: 34,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: `0 0 0 1px #00000022, 0 14px 40px rgba(0,0,0,${glow})`,
          }}
        >
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.08,
              fontWeight: 700,
              color: '#fff6ee',
              marginBottom: 22,
            }}
          >
            {currentLine}
          </div>
          <div
            style={{
              fontSize: 42,
              lineHeight: 1.18,
              fontWeight: 500,
              color: '#bda894',
            }}
          >
            {nextLine}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateRows: 'repeat(4, 1fr)',
          }}
        >
          {[
            ['Fuente', 'Cancion descargada en descargas'],
            ['Vocal', 'Lead vocal e instrumental listos'],
            ['Letra', 'Zona para alinear y revisar lineas'],
            ['Render', 'Base para ensamblar el video final'],
          ].map(([label, text]) => {
            return (
              <div
                key={label}
                style={{
                  border: '1px solid #4a3728',
                  borderRadius: 16,
                  backgroundColor: '#1d1611',
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    color: '#ccbba7',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    lineHeight: 1.2,
                    fontWeight: 600,
                    color: '#fff2e6',
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
