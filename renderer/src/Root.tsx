import { Composition } from 'remotion';
import { VideoComposition } from './composition/VideoComposition';
import { RenderSpec } from './types';
import { totalFrames, dimensionsFor } from './spec';

export { dimensionsFor };

export const RemotionRoot = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ spec: null }}
      // inputProps flow into the composition component (VideoComposition),
      // not the root — calculateMetadata derives frame-accurate metadata
      // from those props at render time
      calculateMetadata={({ props }) => {
        const spec = (props as { spec?: RenderSpec | null }).spec;
        if (!spec) return { durationInFrames: 1 };
        const dims = dimensionsFor(spec.meta.aspectRatio);
        return {
          durationInFrames: totalFrames(spec),
          fps: spec.meta.fps,
          width: dims.width,
          height: dims.height,
        };
      }}
    />
  );
};