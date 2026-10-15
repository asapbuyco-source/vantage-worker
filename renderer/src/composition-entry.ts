// Browser-safe entry for the frontend editor preview.
// Importing this must NOT run registerRoot (that stays in index.ts).
// NOTE: use explicit import-then-export (not `export ... from`) so Rollup's
// CommonJS interop can statically resolve named exports in the built dist.

import { VideoComposition } from './composition/VideoComposition';
import { RemotionRoot, dimensionsFor } from './Root';
import { buildRenderSpec, buildCaptions, totalFrames, FPS, MUSIC_VOLUME } from './spec';

export {
  VideoComposition,
  RemotionRoot,
  dimensionsFor,
  buildRenderSpec,
  buildCaptions,
  totalFrames,
  FPS,
  MUSIC_VOLUME,
};

export type {
  ProjectSnapshot,
  SnapshotScene,
  SnapshotVisualType,
} from './spec';
export type {
  RenderSpec,
  RenderScene,
  RenderCaption,
  RenderCaptionStyle,
  RenderTransition,
  RenderSceneType,
  RenderBrand,
} from './types';