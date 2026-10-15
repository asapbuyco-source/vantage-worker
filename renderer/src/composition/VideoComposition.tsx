import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, Easing, Img, OffthreadVideo } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { RenderSpec } from '../types';
import { SceneVisual } from './SceneVisual';
import { Captions } from './Captions';
import { TextOverlay, LogoOverlay } from './Overlays';
import { presentationFor, TRANSITION_FRAMES } from './transitions';

const DEFAULT_COLORS = { primary: '#6366f1', secondary: '#8b5cf6', accent: '#a78bfa' };
const DEFAULT_FONTS = { heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif' };

/** Quick punch-in scale on scene entry — deterministic, adds "dopamine" snap. */
const PunchIn: React.FC<{ punch: boolean; children: React.ReactNode }> = ({ punch, children }) => {
  const frame = useCurrentFrame();
  if (!punch) return <>{children}</>;
  const scale = interpolate(frame, [0, 5], [1.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return <AbsoluteFill style={{ transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
};

export const VideoComposition: React.FC<{ spec: RenderSpec | null }> = ({ spec }) => {
  if (!spec) return null;
  const fps = spec.meta.fps;
  const total = spec.scenes.reduce((sum, scene) => sum + scene.frames, 0);
  // Scene start frames — used to duck the music whenever narration is playing
  const sceneStarts: number[] = [];
  let acc = 0;
  for (const scene of spec.scenes) {
    sceneStarts.push(acc);
    acc += scene.frames;
  }
  const musicVolume = (frame: number): number => {
    const base = spec.music?.volume ?? 0.18;
    const t = frame / fps;
    const narrationActive = spec.scenes.some((s, i) => {
      if (!s.voiceUrl) return false;
      const start = sceneStarts[i]! / fps;
      return t >= start && t < start + s.duration;
    });
    // Duck under speech (v1: -70%); the mix stays deterministic
    return narrationActive ? base * 0.3 : base;
  };
  const colors = spec.brand?.colors ?? DEFAULT_COLORS;
  const fonts = spec.brand?.fonts ?? DEFAULT_FONTS;
  const brand = {
    ...spec.brand,
    colors,
    fonts: { heading: fonts.heading ?? DEFAULT_FONTS.heading!, body: fonts.body ?? DEFAULT_FONTS.body! },
  };

  // Interleave TransitionSeries.Sequence elements with Transition elements
  const children: React.ReactNode[] = [];

  spec.scenes.forEach((scene, index) => {
    if (index > 0) {
      const presentation = presentationFor(scene.transition);
      if (presentation) {
children.push(
      <TransitionSeries.Transition
        key={`transition-${index}`}
        presentation={presentation}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />
    );
      }
    }

    children.push(
      <TransitionSeries.Sequence
        key={scene.sceneId}
        durationInFrames={Math.max(1, scene.frames)}
      >
        <PunchIn punch={spec.edit?.punch ?? false}>
          <SceneVisual scene={scene} colors={colors} fonts={brand.fonts} fps={fps} />
        </PunchIn>
        <TextOverlay scene={scene} color={colors.primary} fontFamily={brand.fonts.heading} />
        {scene.voiceUrl ? <Audio src={scene.voiceUrl} volume={scene.voiceVolume ?? 1} /> : null}
        {scene.captions && scene.captions.length > 0 ? (
          <Captions
            captions={scene.captions}
            fps={fps}
            accent={colors.accent}
            style={scene.captionStyle ?? 'classic'}
            fontFamily={brand.fonts.body}
          />
        ) : null}
      </TransitionSeries.Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0f' }}>
      {/* Background music (looped, low volume, ducked under narration) */}
      {spec.music?.url ? (
        <Sequence from={0} durationInFrames={Math.max(1, total)}>
          <Audio src={spec.music.url} volume={musicVolume} loop />
        </Sequence>
      ) : null}

      {/* Sound effects anchored to absolute seconds */}
      {spec.sfx && spec.sfx.length > 0
        ? spec.sfx.map((fx, i) => (
            <Sequence
              key={`sfx-${i}`}
              from={Math.max(0, Math.round(fx.start * fps))}
              durationInFrames={
                fx.end != null ? Math.max(1, Math.round((fx.end - fx.start) * fps)) : undefined
              }
            >
              <Audio src={fx.url} volume={fx.volume ?? 0.8} />
            </Sequence>
          ))
        : null}

      <TransitionSeries>{children}</TransitionSeries>

      {/* B-roll cutaways — cover the visual while speech keeps playing underneath */}
      {spec.overlays && spec.overlays.length > 0
        ? spec.overlays.map((ov, i) => {
            const from = Math.max(0, Math.round(ov.start * fps));
            const frames = Math.max(1, Math.round(ov.duration * fps));
            const pip = ov.position === 'pip';
            const body =
              ov.type === 'video' ? (
                <OffthreadVideo
                  src={ov.url}
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Img src={ov.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              );
            return (
              <Sequence key={`overlay-${i}`} from={from} durationInFrames={frames}>
                {pip ? (
                  <AbsoluteFill style={{ alignItems: 'flex-end', justifyContent: 'flex-end', padding: 48 }}>
                    <div
                      style={{
                        width: '38%',
                        height: '34%',
                        overflow: 'hidden',
                        borderRadius: 24,
                        border: `3px solid ${colors.accent}`,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                      }}
                    >
                      {body}
                    </div>
                  </AbsoluteFill>
                ) : (
                  <AbsoluteFill style={{ backgroundColor: '#000' }}>{body}</AbsoluteFill>
                )}
              </Sequence>
            );
          })
        : null}

      {spec.brand?.logoUrl ? (
        <LogoOverlay logoUrl={spec.brand.logoUrl} accent={colors.accent} />
      ) : null}
    </AbsoluteFill>
  );
};