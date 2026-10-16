// Pure, deterministic spec builder — shared by the backend (render jobs) and
// the frontend (live editor preview). No I/O, no remotion imports: a ProjectSnapshot
// in, a RenderSpec out.

import { RenderSpec, RenderScene, RenderCaption, RenderTransition, RenderCaptionStyle, RenderCaptionWord, RenderSFX, RenderOverlay } from './types';

export type { RenderSpec, RenderScene, RenderCaption } from './types';

export const FPS = 30;
export const MUSIC_VOLUME = 0.18;

export type SnapshotVisualType = 'video' | 'image' | 'motion_graphic' | 'uploaded_asset' | 'avatar';

export interface SnapshotScene {
  sceneId: string;
  visualType: SnapshotVisualType;
  /** seconds — voice-adjusted */
  duration: number;
  purpose?: string;
  textOverlay?: string;
  transition?: string;
  voiceover?: string;
  voiceUrl?: string | null;
  /** narration gain (0–2) */
  voiceVolume?: number;
  /** measured voice duration in seconds */
  voiceDuration?: number | null;
  /** resolved (absolute or data:) visual asset URL */
  assetUrl?: string | null;
  /** asset media type, when visualType is 'uploaded_asset' */
  assetType?: 'video' | 'image';
  fit?: 'cover' | 'contain';
  motion?: string;
  captionStyle?: RenderCaptionStyle;
  /** Word-level caption timing (seconds, scene-relative) — drives animated captions */
  captionWords?: RenderCaptionWord[];
  /** Trim into the source asset (seconds) */
  trimStart?: number;
  trimEnd?: number;
  /** Vision-guided crop focus (0-100) */
  focusX?: number;
  focusXEnd?: number;
}

export interface ProjectSnapshot {
  aspectRatio: string;
  scenes: SnapshotScene[];
  /** sound effects overlaid on the timeline (seconds, absolute) */
  sfx?: RenderSFX[];
  /** B-roll cutaways overlaid on the timeline (seconds, absolute) */
  overlays?: RenderOverlay[];
  /** edit direction: punch-in etc. */
  edit?: { punch?: boolean };
  brand?: {
    logoUrl?: string;
    colors?: { primary: string; secondary: string; accent: string };
    fonts?: { heading?: string; body?: string };
    cta?: string;
    captionStyle?: RenderCaptionStyle;
  } | null;
  musicUrl?: string | null;
}

export function buildCaptions(text: string, duration: number): RenderCaption[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || duration <= 0) return [];

  const chunkSize = 5;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }

  const per = duration / chunks.length;
  return chunks.map((chunk, i) => ({
    text: chunk,
    start: Math.round(i * per * 10) / 10,
    end: Math.round((i + 1) * per * 10) / 10,
  }));
}

/** Group word-level timings into short on-screen caption chunks. */
export function buildWordCaptions(words: RenderCaptionWord[], chunkSize = 4): RenderCaption[] {
  const chunks: RenderCaption[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const slice = words.slice(i, i + chunkSize);
    if (slice.length === 0) continue;
    chunks.push({
      text: slice.map((w) => w.word).join(' '),
      start: slice[0]!.start,
      end: slice[slice.length - 1]!.end,
      words: slice,
    });
  }
  return chunks;
}

/** Total frames including one overlap frame per transition. */
export function totalFrames(spec: RenderSpec): number {
  const frames = spec.scenes.reduce((sum, scene) => sum + scene.frames, 0);
  return Math.max(1, frames + Math.max(0, spec.scenes.length - 1));
}

const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};

/** Single source of truth for output dimensions (used by the spec builder and
 *  the Remotion root's calculateMetadata). */
export function dimensionsFor(aspectRatio?: string): { width: number; height: number } {
  return ASPECT_DIMENSIONS[aspectRatio ?? '16:9'] ?? ASPECT_DIMENSIONS['16:9']!;
}

/**
 * Build a RenderSpec from a plain project snapshot. The output is a pure
 * function of the input — same snapshot, same spec, same render.
 */
export function buildRenderSpec(snapshot: ProjectSnapshot, fps: number = FPS): RenderSpec {
  const dims = dimensionsFor(snapshot.aspectRatio);
  const brandCaptionStyle = snapshot.brand?.captionStyle ?? 'classic';

  const scenes: RenderScene[] = snapshot.scenes.map((scene, index) => {
    let type: RenderScene['type'];
    if (scene.visualType === 'video') type = 'video';
    else if (scene.visualType === 'image') type = 'image';
    else if (scene.visualType === 'motion_graphic') type = 'motion_graphic';
    // Avatar videos are normal video assets — they combine with other scenes
    // through the existing rendering engine, unchanged
    else if (scene.visualType === 'avatar') type = 'video';
    else type = scene.assetType === 'video' ? 'video' : 'image'; // uploaded_asset

    const url = scene.assetUrl ?? undefined;
    // Scenes without a visual degrade gracefully to a motion graphic instead
    // of breaking the composition
    if ((type === 'video' || type === 'image') && !url) type = 'motion_graphic';

    const duration = scene.duration > 0 ? scene.duration : 5;
    const frames = Math.max(1, Math.round(duration * fps));

    const voiceUrl = scene.voiceUrl ?? undefined;
    // Captions render whenever narration text exists — timed by the measured
    // voice duration, or the scene duration for avatar scenes (audio baked in).
    // Word-level timings (from transcription) take priority for animated captions.
    const captions = scene.captionWords && scene.captionWords.length > 0
      ? buildWordCaptions(scene.captionWords)
      : scene.voiceover
        ? buildCaptions(scene.voiceover, scene.voiceDuration ?? duration)
        : undefined;

    return {
      sceneId: scene.sceneId,
      index,
      type,
      duration,
      frames,
      url,
      fit: scene.fit ?? 'cover',
      motion: (scene.motion ?? (type === 'image' ? 'zoom-in' : undefined)) as
        | 'zoom-in'
        | 'pan-left'
        | 'pan-right'
        | 'none'
        | undefined,
      textOverlay: scene.textOverlay,
      transition: (scene.transition ?? 'cut') as RenderTransition,
      voiceUrl,
      voiceVolume: scene.voiceVolume,
      captions,
      captionStyle: scene.captionStyle ?? brandCaptionStyle,
      captionWords: scene.captionWords,
      trimStart: scene.trimStart,
      trimEnd: scene.trimEnd,
      focusX: scene.focusX,
      focusXEnd: scene.focusXEnd,
    };
  });

  // Brand default CTA → final scene: append a CTA scene unless the last scene
  // already has CTA purpose. Deterministic — same brand, same result.
  const lastPurpose = snapshot.scenes[snapshot.scenes.length - 1]?.purpose;
  if (snapshot.brand?.cta && lastPurpose !== 'cta') {
    const duration = 4;
    scenes.push({
      sceneId: 'brand-cta',
      index: scenes.length,
      type: 'motion_graphic',
      duration,
      frames: Math.max(1, Math.round(duration * fps)),
      textOverlay: snapshot.brand.cta,
      transition: 'fade',
      captionStyle: brandCaptionStyle,
    });
  }

  return {
    meta: { fps, width: dims.width, height: dims.height, aspectRatio: snapshot.aspectRatio },
    scenes,
    ...(snapshot.musicUrl ? { music: { url: snapshot.musicUrl, volume: MUSIC_VOLUME } } : {}),
    ...(snapshot.sfx && snapshot.sfx.length > 0 ? { sfx: snapshot.sfx } : {}),
    ...(snapshot.overlays && snapshot.overlays.length > 0 ? { overlays: snapshot.overlays } : {}),
    ...(snapshot.edit ? { edit: snapshot.edit } : {}),
    ...(snapshot.brand
      ? {
          brand: {
            logoUrl: snapshot.brand.logoUrl,
            colors: snapshot.brand.colors,
            fonts: snapshot.brand.fonts,
            cta: snapshot.brand.cta,
            captionStyle: brandCaptionStyle,
          },
        }
      : {}),
  };
}