import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { RenderCaption, RenderCaptionStyle } from '../types';

const STYLES: Record<
  RenderCaptionStyle,
  { backgroundColor: string; border?: string; fontSize: number; borderRadius: number }
> = {
  classic: { backgroundColor: 'rgba(0,0,0,0.62)', fontSize: 34, borderRadius: 10 },
  accent: { backgroundColor: 'rgba(99,102,241,0.45)', fontSize: 38, borderRadius: 16 },
  minimal: { backgroundColor: 'transparent', fontSize: 30, borderRadius: 0 },
};

export const Captions: React.FC<{
  captions: RenderCaption[];
  fps: number;
  accent: string;
  style: RenderCaptionStyle;
  fontFamily: string;
}> = ({ captions, fps, accent, style: styleName, fontFamily }) => {
  const frame = useCurrentFrame();
  const time = frame / fps;
  const active = captions.find((c) => time >= c.start && time < c.end);

  if (!active) return null;

  const entrance = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const style = STYLES[styleName] ?? STYLES.classic!;
  const isMinimal = styleName === 'minimal';

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 230 }}>
      <div
        style={{
          backgroundColor: style.backgroundColor,
          ...(isMinimal
            ? {}
            : {
                borderLeft: `4px solid ${accent}`,
                boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
              }),
          borderRadius: style.borderRadius,
          padding: isMinimal ? '4px 26px' : '12px 26px',
          maxWidth: '84%',
          color: isMinimal ? '#ffffff' : '#ffffff',
          fontSize: style.fontSize,
          fontWeight: 600,
          fontFamily,
          textAlign: 'center',
          textShadow: isMinimal ? '0 2px 10px rgba(0,0,0,0.8)' : undefined,
          opacity: entrance,
          transform: `translateY(${interpolate(entrance, [0, 1], [10, 0])}px)`,
        }}
      >
        {active.words && active.words.length > 0 ? (
          // Karaoke: highlight the word currently being spoken
          <span>
            {active.words.map((w, i) => {
              const isActive = time >= w.start && time < w.end;
              return (
                <span
                  key={i}
                  style={{
                    color: isActive ? accent : '#ffffff',
                    textShadow: isActive ? `0 2px 14px ${accent}` : undefined,
                    transition: 'color 80ms linear',
                  }}
                >
                  {w.word}{i < active.words!.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </span>
        ) : (
          active.text
        )}
      </div>
    </AbsoluteFill>
  );
};