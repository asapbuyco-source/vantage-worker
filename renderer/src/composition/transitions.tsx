import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';
import { RenderTransition } from '../types';

const TRANSITION_FRAMES = 12; // 0.4s at 30fps

type PresentationProps = Record<string, never>;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const fadePresentation = (): TransitionPresentation<PresentationProps> => {
  const Fade: React.FC<TransitionPresentationComponentProps<PresentationProps>> = ({
    children,
    presentationProgress,
  }) => {
    const opacity = interpolate(presentationProgress, [0, 1], [0, 1], clamp);
    return <AbsoluteFill style={{ opacity, backgroundColor: '#0a0a0f' }}>{children}</AbsoluteFill>;
  };
  return { component: Fade, props: {} };
};

const dissolvePresentation = (): TransitionPresentation<PresentationProps> => {
  const Dissolve: React.FC<TransitionPresentationComponentProps<PresentationProps>> = ({
    children,
    presentationDirection,
    presentationProgress,
  }) => {
    const entering = presentationDirection === 'entering';
    const opacity = interpolate(presentationProgress, [0, 1], [0, 1], clamp);
    const scale = interpolate(presentationProgress, [0, 1], entering ? [0.96, 1] : [1, 1.04], clamp);
    return (
      <AbsoluteFill style={{ opacity, scale, backgroundColor: '#0a0a0f' }}>{children}</AbsoluteFill>
    );
  };
  return { component: Dissolve, props: {} };
};

const slidePresentation = (): TransitionPresentation<PresentationProps> => {
  const Slide: React.FC<TransitionPresentationComponentProps<PresentationProps>> = ({
    children,
    presentationDirection,
    presentationProgress,
  }) => {
    const entering = presentationDirection === 'entering';
    const translateX = interpolate(
      presentationProgress,
      [0, 1],
      entering ? [100, 0] : [0, 100],
      clamp
    );
    return (
      <AbsoluteFill style={{ transform: `translateX(${translateX}%)`, backgroundColor: '#0a0a0f' }}>
        {children}
      </AbsoluteFill>
    );
  };
  return { component: Slide, props: {} };
};

const zoomPresentation = (): TransitionPresentation<PresentationProps> => {
  const Zoom: React.FC<TransitionPresentationComponentProps<PresentationProps>> = ({
    children,
    presentationDirection,
    presentationProgress,
  }) => {
    const entering = presentationDirection === 'entering';
    const scale = interpolate(
      presentationProgress,
      [0, 1],
      entering ? [0.85, 1] : [1, 1.15],
      clamp
    );
    return <AbsoluteFill style={{ scale, backgroundColor: '#0a0a0f' }}>{children}</AbsoluteFill>;
  };
  return { component: Zoom, props: {} };
};

/** Map a scene's transition to a Remotion presentation (or null for cut). */
export function presentationFor(
  transition: RenderTransition
): TransitionPresentation<PresentationProps> | null {
  switch (transition) {
    case 'fade':
      return fadePresentation();
    case 'slide':
      return slidePresentation();
    case 'dissolve':
      return dissolvePresentation();
    case 'zoom':
      return zoomPresentation();
    case 'cut':
    default:
      return null;
  }
}

export { TRANSITION_FRAMES };