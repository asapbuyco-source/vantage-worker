import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { RenderScene } from '../types';

// Animated on-screen text (slides up + fades in over the first 12 frames)
export const TextOverlay: React.FC<{
  scene: RenderScene;
  color: string;
  fontFamily: string;
}> = ({ scene, color, fontFamily }) => {
  const frame = useCurrentFrame();
  if (!scene.textOverlay) return null;

  const entrance = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 96 }}>
      <div
        style={{
          color,
          fontSize: 58,
          fontWeight: 800,
          fontFamily,
          textAlign: 'center',
          textShadow: '0 4px 24px rgba(0,0,0,0.7)',
          padding: '0 48px',
          opacity: entrance,
          transform: `translateY(${interpolate(entrance, [0, 1], [24, 0])}px)`,
        }}
      >
        {scene.textOverlay}
      </div>
    </AbsoluteFill>
  );
};

// Brand logo, bottom-right, fades in once
export const LogoOverlay: React.FC<{ logoUrl: string; accent: string }> = ({ logoUrl, accent }) => {
  const frame = useCurrentFrame();
  const entrance = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-end', padding: 28 }}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 16,
          overflow: 'hidden',
          background: '#0f0f1a',
          border: `1px solid ${accent}55`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          opacity: entrance,
        }}
      >
        <Img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </AbsoluteFill>
  );
};