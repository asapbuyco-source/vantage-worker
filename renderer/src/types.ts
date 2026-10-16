// Shared render spec shape. The backend serializes a project into this
// deterministic snapshot; the composition renders ONLY what is in the spec.
// This is the contract between the API and the Remotion composition.

export type RenderSceneType = 'video' | 'image' | 'motion_graphic';

export type RenderTransition = 'cut' | 'fade' | 'dissolve' | 'slide' | 'zoom';

export type RenderCaptionStyle = 'classic' | 'accent' | 'minimal';

export interface RenderCaptionWord {
  word: string;
  /** seconds, relative to the scene */
  start: number;
  /** seconds, relative to the scene */
  end: number;
}

export interface RenderCaption {
  text: string;
  /** seconds */
  start: number;
  /** seconds */
  end: number;
  /** word-level timing for karaoke/emphasis rendering */
  words?: RenderCaptionWord[];
}

export interface RenderScene {
  sceneId: string;
  /** 0-based position in the timeline */
  index: number;
  type: RenderSceneType;
  /** seconds — voice-adjusted */
  duration: number;
  /** frames = round(duration * fps), computed by the builder */
  frames: number;
  /** asset URL (absolute) */
  url?: string;
  /** 'cover' crops/fills the frame; 'contain' letterboxes */
  fit?: 'cover' | 'contain';
  /** deterministic camera motion for images */
  motion?: 'zoom-in' | 'pan-left' | 'pan-right' | 'none';
  textOverlay?: string;
  transition: RenderTransition;
  /** narration audio URL (absolute) */
  voiceUrl?: string;
  /** narration gain (0–2, default 1) */
  voiceVolume?: number;
  captions?: RenderCaption[];
  captionStyle?: RenderCaptionStyle;
  /** Word-level caption timing (seconds, scene-relative) for animated captions */
  captionWords?: RenderCaptionWord[];
  /** Trim into the source asset (seconds) — renders only [trimStart, trimEnd] */
  trimStart?: number;
  trimEnd?: number;
  /** Vision-guided crop focus (0-100, horizontal) for 9:16 reframing */
  focusX?: number;
  /** focus position at the end of the scene (0-100) — animates when set */
  focusXEnd?: number;
}

export interface RenderBrand {
  logoUrl?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  /** Default CTA — appended as a final scene when the last scene isn't a CTA */
  cta?: string;
  /** Preferred caption style — used for scenes without their own */
  captionStyle?: RenderCaptionStyle;
}

export interface RenderSFX {
  url: string;
  /** seconds */
  start: number;
  /** seconds (optional — omitted = plays to the end) */
  end?: number;
  /** 0–1 */
  volume?: number;
}

export interface RenderOverlay {
  url: string;
  type: 'video' | 'image';
  /** seconds into the project timeline */
  start: number;
  /** seconds on screen */
  duration: number;
  /** 'full' covers the frame; 'pip' = picture-in-picture corner */
  position?: 'full' | 'pip';
}

export interface RenderSpec {
  meta: {
    fps: number;
    width: number;
    height: number;
    aspectRatio: string;
  };
  scenes: RenderScene[];
  music?: {
    url: string;
    /** 0–1 */
    volume: number;
  };
  sfx?: RenderSFX[];
  /** B-roll cutaways overlaid on the timeline (absolute seconds) */
  overlays?: RenderOverlay[];
  /** Per-project edit direction (the "dopamine dial") */
  edit?: {
    /** punch-in scale on every scene entry */
    punch?: boolean;
  };
  brand?: RenderBrand;
}