import type { IndicatorSpec } from '../types.ts';
import type { BuiltinIndicatorName } from './names.ts';
import Atom from './Atom.ts';
import AudioEqualizer from './AudioEqualizer.ts';
import BallBeat from './BallBeat.ts';
import BallClipRotate from './BallClipRotate.ts';
import BallClipRotateMultiple from './BallClipRotateMultiple.ts';
import BallClipRotatePulse from './BallClipRotatePulse.ts';
import BallDoubleBounce from './BallDoubleBounce.ts';
import BallFall from './BallFall.ts';
import BallGridBeat from './BallGridBeat.ts';
import BallGridPulse from './BallGridPulse.ts';
import BallHelix from './BallHelix.ts';
import BallHoneycomb from './BallHoneycomb.ts';
import BallMerge from './BallMerge.ts';
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
import BallSquareSpin from './BallSquareSpin.ts';
import BallTrianglePath from './BallTrianglePath.ts';
import BallZigZag from './BallZigZag.ts';
import BallZigZagDeflect from './BallZigZagDeflect.ts';
import ChasingDots from './ChasingDots.ts';
import CircleStrokeSpin from './CircleStrokeSpin.ts';
import CubeTransition from './CubeTransition.ts';
import JellyBox from './JellyBox.ts';
import LineScale from './LineScale.ts';
import LineScaleParty from './LineScaleParty.ts';
import LineScalePulseOut from './LineScalePulseOut.ts';
import LineScalePulseOutRapid from './LineScalePulseOutRapid.ts';
import LineSlide from './LineSlide.ts';
import LineSpinFadeLoader from './LineSpinFadeLoader.ts';
import NewtonCradle from './NewtonCradle.ts';
import Orbit from './Orbit.ts';
import Pacman from './Pacman.ts';
import Radar from './Radar.ts';
import RunningDots from './RunningDots.ts';
import SemiCircleSpin from './SemiCircleSpin.ts';
import SquareGridFlip from './SquareGridFlip.ts';
import SquareGridWave from './SquareGridWave.ts';
import SquareSpin from './SquareSpin.ts';
import Timer from './Timer.ts';
import TriangleOrbit from './TriangleOrbit.ts';
import TriangleSkewSpin from './TriangleSkewSpin.ts';
import TripleArcSpin from './TripleArcSpin.ts';

export const BUILTIN_INDICATORS = {
  Atom,
  AudioEqualizer,
  BallBeat,
  BallClipRotate,
  BallClipRotateMultiple,
  BallClipRotatePulse,
  BallDoubleBounce,
  BallFall,
  BallGridBeat,
  BallGridPulse,
  BallHelix,
  BallHoneycomb,
  BallMerge,
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
  BallSquareSpin,
  BallTrianglePath,
  BallZigZag,
  BallZigZagDeflect,
  ChasingDots,
  CircleStrokeSpin,
  CubeTransition,
  JellyBox,
  LineScale,
  LineScaleParty,
  LineScalePulseOut,
  LineScalePulseOutRapid,
  LineSlide,
  LineSpinFadeLoader,
  NewtonCradle,
  Orbit,
  Pacman,
  Radar,
  RunningDots,
  SemiCircleSpin,
  SquareGridFlip,
  SquareGridWave,
  SquareSpin,
  Timer,
  TriangleOrbit,
  TriangleSkewSpin,
  TripleArcSpin,
} as const satisfies Record<BuiltinIndicatorName, IndicatorSpec>;

export { BUILTIN_INDICATOR_NAMES } from './names.ts';
export type { BuiltinIndicatorName } from './names.ts';
