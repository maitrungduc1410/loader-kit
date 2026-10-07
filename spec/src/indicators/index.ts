import type { IndicatorSpec } from '../types.ts';
import AudioEqualizer from './AudioEqualizer.ts';
import BallBeat from './BallBeat.ts';
import BallClipRotate from './BallClipRotate.ts';
import BallClipRotateMultiple from './BallClipRotateMultiple.ts';
import BallClipRotatePulse from './BallClipRotatePulse.ts';
import BallDoubleBounce from './BallDoubleBounce.ts';
import BallGridBeat from './BallGridBeat.ts';
import BallGridPulse from './BallGridPulse.ts';
import BallPulse from './BallPulse.ts';
import BallPulseRise from './BallPulseRise.ts';
import BallPulseSync from './BallPulseSync.ts';
import BallRotate from './BallRotate.ts';
import BallRotateChase from './BallRotateChase.ts';
import BallScale from './BallScale.ts';
import BallScaleMultiple from './BallScaleMultiple.ts';
import BallScaleRipple from './BallScaleRipple.ts';
import BallScaleRippleMultiple from './BallScaleRippleMultiple.ts';
import BallSpinFadeLoader from './BallSpinFadeLoader.ts';
import BallTrianglePath from './BallTrianglePath.ts';
import BallZigZag from './BallZigZag.ts';
import BallZigZagDeflect from './BallZigZagDeflect.ts';
import CircleStrokeSpin from './CircleStrokeSpin.ts';
import CubeTransition from './CubeTransition.ts';
import LineScale from './LineScale.ts';
import LineScaleParty from './LineScaleParty.ts';
import LineScalePulseOut from './LineScalePulseOut.ts';
import LineScalePulseOutRapid from './LineScalePulseOutRapid.ts';
import LineSpinFadeLoader from './LineSpinFadeLoader.ts';
import Orbit from './Orbit.ts';
import Pacman from './Pacman.ts';
import SemiCircleSpin from './SemiCircleSpin.ts';
import SquareSpin from './SquareSpin.ts';
import TriangleSkewSpin from './TriangleSkewSpin.ts';

export const BUILTIN_INDICATORS = {
  AudioEqualizer,
  BallBeat,
  BallClipRotate,
  BallClipRotateMultiple,
  BallClipRotatePulse,
  BallDoubleBounce,
  BallGridBeat,
  BallGridPulse,
  BallPulse,
  BallPulseRise,
  BallPulseSync,
  BallRotate,
  BallRotateChase,
  BallScale,
  BallScaleMultiple,
  BallScaleRipple,
  BallScaleRippleMultiple,
  BallSpinFadeLoader,
  BallTrianglePath,
  BallZigZag,
  BallZigZagDeflect,
  CircleStrokeSpin,
  CubeTransition,
  LineScale,
  LineScaleParty,
  LineScalePulseOut,
  LineScalePulseOutRapid,
  LineSpinFadeLoader,
  Orbit,
  Pacman,
  SemiCircleSpin,
  SquareSpin,
  TriangleSkewSpin,
} as const satisfies Record<string, IndicatorSpec>;

export type BuiltinIndicatorName = keyof typeof BUILTIN_INDICATORS;

export const BUILTIN_INDICATOR_NAMES = Object.keys(BUILTIN_INDICATORS) as BuiltinIndicatorName[];
