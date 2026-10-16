import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame } from 'remotion';
import { RenderScene } from '../types';

// ─── Video (with cover crop / contain) ────────────────────────────────────────

const VideoVisual: React.FC<{ scene: RenderScene; fps: number }> = ({ scene, fps }) => {
  const frame = useCurrentFrame();
  const hasVoice = Boolean(scene.voiceUrl);
  // Trim into the source asset — renders only the selected segment
  const startFrom = scene.trimStart ? Math.round(scene.trimStart * fps) : undefined;
  const endAt = scene.trimEnd
    ? Math.round(scene.trimEnd * fps)
    : Math.min(scene.frames, Math.round((scene.trimStart ?? 0) * fps) + scene.frames);
  // Camera focus can animate across the scene when an end position is set
  const focusStart = scene.focusX ?? 50;
  const focusEnd = scene.focusXEnd ?? focusStart;
  const focus =
    scene.focusX !== undefined
      ? interpolate(frame, [0, Math.max(1, scene.frames)], [focusStart, focusEnd], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : undefined;
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={scene.url!}
        muted={hasVoice}
        startFrom={startFrom}
        endAt={endAt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: scene.fit ?? 'cover',
          objectPosition: focus !== undefined ? `${focus}% center` : 'center',
          backgroundColor: '#000',
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Image with deterministic zoom/pan ────────────────────────────────────────

const ImageVisual: React.FC<{ scene: RenderScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, scene.frames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let transform = 'scale(1)';
  const motion = scene.motion ?? 'zoom-in';
  if (motion === 'zoom-in') {
    const scale = interpolate(progress, [0, 1], [1, 1.12]);
    transform = `scale(${scale})`;
  } else if (motion === 'pan-left') {
    transform = `scale(1.18) translateX(${interpolate(progress, [0, 1], [0, -4])}%)`;
  } else if (motion === 'pan-right') {
    transform = `scale(1.18) translateX(${interpolate(progress, [0, 1], [0, 4])}%)`;
  }

  const focusStart = scene.focusX ?? 50;
  const focusEnd = scene.focusXEnd ?? focusStart;
  const focus =
    scene.focusX !== undefined ? interpolate(progress, [0, 1], [focusStart, focusEnd]) : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Img
        src={scene.url!}
        style={{
          width: '100%',
          height: '100%',
          objectFit: scene.fit ?? 'cover',
          objectPosition: focus !== undefined ? `${focus}% center` : 'center',
          transform,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Basic motion graphic (animated gradient + geometric bars) ────────────────

const MotionGraphic: React.FC<{
  scene: RenderScene;
  colors: { primary: string; accent: string };
  fontFamily: string;
}> = ({ scene, colors, fontFamily }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, scene.frames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const backgroundScale = interpolate(progress, [0, 1], [1, 1.25]);
  const barsShift = interpolate(progress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.primary}33 0%, #0a0a0f 55%, ${colors.accent}33 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, ${colors.accent}44 0%, transparent 55%)`,
          transform: `scale(${backgroundScale})`,
        }}
      />
      {/* drifting bars */}
      {[0.28, 0.5, 0.72].map((position, i) => (
        <AbsoluteFill
          key={i}
          style={{
            top: `${position * 100}%`,
            height: 14,
            transform: `translateX(${interpolate(barsShift, [0, 1], [-60 + i * 20, 60 - i * 20])}%)`,
            background: `linear-gradient(90deg, transparent, ${colors.primary}99, transparent)`,
            opacity: 0.5,
          }}
        />
      ))}
      {scene.textOverlay ? (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: 72,
              fontWeight: 800,
              fontFamily,
              textAlign: 'center',
              textShadow: `0 6px 30px ${colors.primary}66`,
              padding: '0 60px',
            }}
          >
            {scene.textOverlay}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ─── Scene dispatcher ─────────────────────────────────────────────────────────

export const SceneVisual: React.FC<{
  scene: RenderScene;
  colors: { primary: string; accent: string };
  fonts: { heading: string; body: string };
  fps: number;
}> = ({ scene, colors, fonts, fps }) => {
  switch (scene.type) {
    case 'video':
      return <VideoVisual scene={scene} fps={fps} />;
    case 'image':
      return <ImageVisual scene={scene} />;
    case 'motion_graphic':
      return <MotionGraphic scene={scene} colors={colors} fontFamily={fonts.heading} />;
    default:
      return <AbsoluteFill style={{ backgroundColor: '#0a0a0f' }} />;
  }
};