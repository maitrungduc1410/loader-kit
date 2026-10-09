// Test vectors of LoaderKitProgress: resolved options, draw commands and animator runs.
import {
  PROGRESS_TYPES,
  ProgressAnimator,
  progressCommands,
  progressContentInset,
  progressIntrinsicSize,
  progressVariants,
  resolveProgress,
  type ProgressOptions,
  type ProgressState,
  type ProgressType,
} from '../src/index.ts';

const round = (value: number) => Math.round(value * 1e9) / 1e9 + 0;
const json = (value: unknown) => JSON.stringify(value, (_key, v: unknown) => (typeof v === 'number' ? round(v) : v));

export interface ProgressVectorFile {
  name: string;
  content: string;
}

// ----- resolve -----

const RESOLVE_CASES: { description: string; options: ProgressOptions }[] = [
  { description: 'No options: circular flat', options: {} },
  ...PROGRESS_TYPES.flatMap((type) =>
    progressVariants(type).map((variant) => ({ description: `Defaults of ${type} ${variant}`, options: { type, variant } }))
  ),
  { description: 'Unknown type falls back to circular', options: { type: 'spiral' as ProgressType } },
  { description: 'A variant the type does not have falls back to its default', options: { type: 'pie', variant: 'wavy' } },
  { description: 'Null options take the defaults', options: { type: 'linear', variant: 'wavy', thickness: null, amplitude: null, wavelength: null } },
  {
    description: 'Out of range numbers are clamped',
    options: { type: 'gauge', variant: 'segmented', thickness: -3, trackGap: -1, segments: 1000, sweepAngle: 400, cornerRadius: -2, wavelength: 0.2, amplitude: -1 },
  },
  { description: 'Segments round half up and steps need two', options: { type: 'linear', variant: 'steps', segments: 1.4 } },
  { description: 'Half segments round up', options: { type: 'circular', variant: 'segmented', segments: 2.5 } },
  { description: 'Negative half segments fall back to the minimum', options: { type: 'bars', segments: -0.5 } },
  { description: 'Short waves are lengthened to 8', options: { type: 'circular', variant: 'wavy', wavelength: 3 } },
  { description: 'Grid columns are limited', options: { type: 'grid', segments: 40 } },
  { description: 'Small sweep angle', options: { type: 'gauge', sweepAngle: 10 } },
  {
    description: 'Every option set',
    options: {
      type: 'linear',
      variant: 'striped',
      thickness: 16,
      trackGap: 2,
      segments: 7,
      showLabel: true,
      stopIndicator: false,
      strokeCap: 'butt',
      amplitude: 5,
      wavelength: 30,
      waveSpeed: -0.5,
      sweepAngle: 200,
      cornerRadius: 20,
      speed: 2,
    },
  },
  { description: 'Linear label outside sets a minimum height', options: { type: 'linear', variant: 'glow', showLabel: true } },
  { description: 'Border inset', options: { type: 'border', thickness: 4, trackGap: 6 } },
  { description: 'Border glow inset makes room for the glow', options: { type: 'border', variant: 'glow', thickness: 4, trackGap: 6 } },
  { description: 'Linear chevrons and ticks grow with the thickness', options: { type: 'linear', variant: 'ticks', thickness: 8 } },
];

function resolveFile(): ProgressVectorFile {
  const lines = RESOLVE_CASES.map(({ description, options }) => {
    const resolved = resolveProgress(options);
    return `    ${json({ description, options, resolved, intrinsicSize: progressIntrinsicSize(resolved), contentInset: progressContentInset(resolved) })}`;
  });
  return { name: 'resolve.json', content: `{\n  "description": "resolveProgress, progressIntrinsicSize and progressContentInset",\n  "cases": [\n${lines.join(',\n')}\n  ]\n}\n` };
}

// ----- geometry -----

interface GeometryCase {
  description: string;
  options: ProgressOptions;
  width: number;
  height: number;
  state: ProgressState;
}

const state = (value: number | null, extra: Partial<ProgressState> = {}): ProgressState => ({
  indeterminate: value === null,
  value: value ?? 0,
  buffer: 0,
  wave: 1,
  time: 0,
  indeterminateTime: 0,
  ...extra,
});

function boxFor(options: ProgressOptions): [number, number] {
  const resolved = resolveProgress(options);
  const size = progressIntrinsicSize(resolved);
  return [size.width ?? (resolved.type === 'border' ? 160 : 240), size.height ?? 56];
}

function geometryCases(type: ProgressType): GeometryCase[] {
  const cases: GeometryCase[] = [];
  const add = (description: string, options: ProgressOptions, s: ProgressState, box?: [number, number]) => {
    const [width, height] = box ?? boxFor(options);
    cases.push({ description, options, width, height, state: s });
  };
  for (const variant of progressVariants(type)) {
    const options: ProgressOptions = { type, variant };
    const name = `${type} ${variant}`;
    add(`${name} at 0`, options, state(0, { wave: 0 }));
    add(`${name} at 0.37`, options, state(0.37, { time: 0.8 }));
    add(`${name} at 1`, options, state(1, { wave: 0, time: 1.3 }));
    for (const t of [0.3, 1.1, 2.75]) add(`${name} indeterminate at ${t} s`, options, state(null, { indeterminateTime: t, time: t * 0.9 }));
    add(`${name} with butt caps at 0.62`, { ...options, strokeCap: 'butt' }, state(0.62, { time: 0.4, wave: 0.6 }));
    add(`${name} with a label at 0.48`, { ...options, showLabel: true }, state(0.48, { time: 0.2 }));
  }
  if (type === 'linear') {
    add('linear flat with a buffer', { type, variant: 'flat' }, state(0.3, { buffer: 0.55 }));
    add('linear wavy with a buffer below the value', { type, variant: 'wavy' }, state(0.5, { buffer: 0.4, wave: 0.8, time: 2.1 }));
    add('linear flat without the stop indicator', { type, variant: 'flat', stopIndicator: false }, state(0.3));
    add('linear wavy with a custom wave', { type, variant: 'wavy', amplitude: 5, wavelength: 24, waveSpeed: -1.5, thickness: 6 }, state(0.6, { time: 0.7 }));
    add('linear flat label inside', { type, variant: 'flat', thickness: 18, showLabel: true }, state(0.42));
    add('linear striped label inside', { type, variant: 'striped', thickness: 16, showLabel: true }, state(0.73, { time: 0.33 }));
    add('linear shimmer label inside', { type, variant: 'shimmer', thickness: 16, showLabel: true }, state(0.5, { time: 0.9 }));
    add('linear segmented with 5 segments and no gap', { type, variant: 'segmented', segments: 5, trackGap: 0 }, state(0.5));
    add('linear steps with 6 steps', { type, variant: 'steps', segments: 6 }, state(0.5));
    add('linear dots with 1 dot', { type, variant: 'dots', segments: 1 }, state(0.5));
    add('linear chevrons with 3 chevrons', { type, variant: 'chevrons', segments: 3, thickness: 5 }, state(0.5));
    add('linear ticks with 1 tick', { type, variant: 'ticks', segments: 1 }, state(1));
    add('linear flat in a narrow box', { type, variant: 'flat' }, state(0.5), [6, 8]);
    add('linear glow too narrow for the label', { type, variant: 'glow', showLabel: true }, state(0.5), [60, 14]);
    add('linear flat while one segment leaves and the next enters', { type, variant: 'flat' }, state(null, { indeterminateTime: 1.155 }));
    add('linear flat after a long time', { type, variant: 'flat' }, state(null, { indeterminateTime: 3600.4 }));
  }
  if (type === 'circular') {
    add('circular wavy below 32 draws flat', { type, variant: 'wavy' }, state(0.5, { time: 0.6 }), [30, 30]);
    add('circular in a wide box', { type, variant: 'flat' }, state(0.5), [80, 50]);
    add('circular flat without a track gap at 1', { type, variant: 'flat', trackGap: 0 }, state(1));
    add('circular segmented with 7 segments', { type, variant: 'segmented', segments: 7, thickness: 6 }, state(0.6));
    add('circular large label', { type, variant: 'flat', showLabel: true }, state(0.5), [240, 240]);
    add('circular dual too small to draw', { type, variant: 'dual' }, state(0.5), [10, 10]);
    add('circular orbit with a thick dot', { type, variant: 'orbit', thickness: 8 }, state(0.8), [64, 64]);
    add('circular wavy after a long time', { type, variant: 'wavy' }, state(null, { indeterminateTime: 7201.3, time: 7200.1 }), [96, 96]);
  }
  if (type === 'gauge') {
    add('gauge with a 180 degree sweep', { type, sweepAngle: 180 }, state(0.5));
    add('gauge segmented with a 120 degree sweep', { type, variant: 'segmented', sweepAngle: 120, segments: 4 }, state(0.6));
    add('gauge needle with a 180 degree sweep and a label', { type, variant: 'needle', sweepAngle: 180, showLabel: true }, state(0.25), [96, 96]);
    add('gauge dots with 1 dot', { type, variant: 'dots', segments: 1 }, state(1));
    add('gauge gradient with butt caps', { type, variant: 'gradient', strokeCap: 'butt' }, state(0.5));
    add('gauge gradient thicker than its radius', { type, variant: 'gradient', thickness: 30 }, state(0.5));
  }
  if (type === 'pie') add('pie segmented with 1 segment', { type, variant: 'segmented', segments: 1 }, state(0.5));
  if (type === 'liquid') {
    add('liquid with a thick ring in a tall box', { type, thickness: 8, waveSpeed: 2 }, state(0.3, { time: 1.7, wave: 0.5 }), [50, 70]);
    add('liquid heart with a thick ring in a tall box', { type, variant: 'heart', thickness: 8 }, state(0.6, { time: 0.9 }), [50, 70]);
  }
  if (type === 'border') {
    add('border with a large radius', { type, cornerRadius: 40, thickness: 4 }, state(0.8), [120, 60]);
    add('border without corners', { type, cornerRadius: 0 }, state(0.6), [100, 40]);
    add('border wrapping past the start', { type }, state(null, { indeterminateTime: 0.95 }), [100, 40]);
    add('border too small to draw', { type, thickness: 10 }, state(0.5), [10, 40]);
    add('border glow too small to draw', { type, variant: 'glow' }, state(0.5), [10, 40]);
    add('border glow wrapping past the start', { type, variant: 'glow' }, state(null, { indeterminateTime: 0.95 }), [100, 40]);
    add('border segmented with too many segments', { type, variant: 'segmented', segments: 200, thickness: 8 }, state(0.5), [60, 30]);
  }
  if (type === 'bars') {
    add('bars with 3 bars in a wide box', { type, segments: 3 }, state(0.5), [100, 30]);
    add('bars dots with 3 bars in a tall box', { type, variant: 'dots', segments: 3 }, state(0.5), [60, 120]);
    add('bars dots with 1 bar wider than the box is tall', { type, variant: 'dots', segments: 1 }, state(0.5), [48, 36]);
    add('bars arcs with 2 arcs in a wide box', { type, variant: 'arcs', segments: 2 }, state(0.75), [100, 30]);
  }
  if (type === 'grid') {
    add('grid with 3 columns', { type, segments: 3, strokeCap: 'butt' }, state(0.5));
    add('grid dots with 7 columns', { type, variant: 'dots', segments: 7 }, state(0.3));
  }
  if (type === 'battery') {
    add('battery in a tall box', { type, showLabel: true }, state(0.9), [40, 60]);
    add('battery segmented with too many cells', { type, variant: 'segmented', segments: 40 }, state(0.5), [30, 15]);
  }
  if (type === 'hourglass') {
    add('hourglass in a wide box', { type }, state(0.5), [80, 50]);
    add('hourglass turning over', { type }, state(null, { indeterminateTime: 2.2 }));
    add('hourglass with a thick glass', { type, thickness: 8 }, state(0.25), [96, 96]);
  }
  return cases;
}

function geometryFile(type: ProgressType): ProgressVectorFile {
  const body = geometryCases(type)
    .map(({ description, options, width, height, state: s }) => {
      const resolved = resolveProgress(options);
      const { x, y, commands } = progressCommands(resolved, s, width, height);
      const head = json({ description, options, width, height, state: s, x, y }).slice(0, -1);
      const lines = commands.map((command) => `      ${json(command)}`);
      return `    ${head}, "commands": [${lines.length > 0 ? `\n${lines.join(',\n')}\n    ` : ''}]}`;
    })
    .join(',\n');
  return { name: `geometry-${type}.json`, content: `{\n  "description": "progressCommands for ${type}",\n  "cases": [\n${body}\n  ]\n}\n` };
}

// ----- animator -----

type AnimatorEvent =
  | { frame: number; set: 'value' | 'buffer'; value: number | null; smooth: boolean }
  | { frame: number; set: 'speed'; value: number }
  | { frame: number; set: 'reduceMotion'; value: boolean };

interface AnimatorScenario {
  description: string;
  fps?: number;
  initial: { value: number | null; buffer: number | null };
  speed: number;
  reduceMotion: boolean;
  frames: number;
  every: number;
  events: AnimatorEvent[];
}

const value = (frame: number, v: number | null, smooth = true): AnimatorEvent => ({ frame, set: 'value', value: v, smooth });

const SCENARIOS: AnimatorScenario[] = [
  {
    description: 'Isolated updates glide forward in 0.5 s and backward in 0.4 s',
    initial: { value: 0, buffer: null },
    speed: 1,
    reduceMotion: false,
    frames: 420,
    every: 3,
    events: [value(0, 0.3), value(120, 0.7), value(240, 0.2), value(330, 1)],
  },
  {
    description: 'Rhythmic updates every 0.1 s keep moving without stopping',
    initial: { value: 0, buffer: null },
    speed: 1,
    reduceMotion: false,
    frames: 300,
    every: 2,
    events: Array.from({ length: 40 }, (_, i) => value(i * 6, Math.min(1, (i + 1) * 0.025))),
  },
  {
    description: 'Rhythmic updates that slow down, with a jump back',
    initial: { value: 0.1, buffer: null },
    speed: 1,
    reduceMotion: false,
    frames: 360,
    every: 3,
    events: [value(0, 0.2), value(30, 0.35), value(75, 0.5), value(135, 0.45), value(170, 0.8), value(260, 0.81)],
  },
  {
    description: 'Without smooth the value jumps',
    initial: { value: 0.2, buffer: null },
    speed: 1,
    reduceMotion: false,
    frames: 90,
    every: 3,
    events: [value(0, 0.6, false), value(30, 0.1, false), value(45, 0.9), value(60, 0.4, false)],
  },
  {
    description: 'Indeterminate, then determinate from 0, then indeterminate again at speed 1.5',
    initial: { value: null, buffer: null },
    speed: 1.5,
    reduceMotion: false,
    frames: 240,
    every: 3,
    events: [value(60, 0.5), value(90, 0.55), value(150, null), value(200, Number.NaN)],
  },
  {
    description: 'Reduce motion jumps to the value, stops ambient time and halves the indeterminate speed',
    initial: { value: 0.05, buffer: 0.2 },
    speed: 1,
    reduceMotion: false,
    frames: 240,
    every: 3,
    events: [
      value(0, 0.6),
      { frame: 10, set: 'reduceMotion', value: true },
      value(40, 0.98),
      { frame: 80, set: 'reduceMotion', value: false },
      value(100, 0.3),
      value(160, null),
      { frame: 200, set: 'reduceMotion', value: true },
    ],
  },
  {
    description: 'The buffer glides on its own',
    initial: { value: 0.1, buffer: null },
    speed: 1,
    reduceMotion: false,
    frames: 180,
    every: 3,
    events: [
      { frame: 0, set: 'buffer', value: 0.4, smooth: true },
      value(20, 0.3),
      { frame: 50, set: 'buffer', value: 0.9, smooth: true },
      { frame: 110, set: 'buffer', value: null, smooth: true },
      { frame: 150, set: 'buffer', value: 0.5, smooth: false },
    ],
  },
  {
    description: 'Zero, negative and changing speeds',
    initial: { value: null, buffer: null },
    speed: 0,
    reduceMotion: false,
    frames: 120,
    every: 4,
    events: [
      { frame: 30, set: 'speed', value: -1 },
      { frame: 60, set: 'speed', value: 2 },
      { frame: 90, set: 'speed', value: 0.25 },
    ],
  },
  {
    description: 'Values outside 0 to 1 are clamped and the wave flattens near the ends',
    initial: { value: 0.5, buffer: 3 },
    speed: 1,
    reduceMotion: false,
    frames: 200,
    every: 4,
    events: [value(0, -2), value(40, 0.97), value(100, 5), value(150, 0.5)],
  },
  {
    description: 'Long frames of 0.1 s keep the wave spring settled',
    fps: 10,
    initial: { value: 0, buffer: null },
    speed: 1,
    reduceMotion: false,
    frames: 40,
    every: 1,
    events: [value(0, 0.5), value(12, 1), value(24, 0.3)],
  },
];

const snapshot = (a: ProgressAnimator) => ({ ...a.state, target: a.target, moving: a.moving });

function animatorFile(): ProgressVectorFile {
  const body = SCENARIOS.map(({ description, fps = 60, ...scenario }) => {
    const dt = 1 / fps;
    const animator = new ProgressAnimator(scenario.initial.value, scenario.initial.buffer);
    const initialState = snapshot(animator);
    let speed = scenario.speed;
    let reduceMotion = scenario.reduceMotion;
    const snapshots: string[] = [];
    for (let frame = 0; frame < scenario.frames; frame++) {
      const now = frame / fps;
      for (const event of scenario.events) {
        if (event.frame !== frame) continue;
        switch (event.set) {
          case 'value':
            animator.setValue(event.value, now, event.smooth);
            break;
          case 'buffer':
            animator.setBuffer(event.value, now, event.smooth);
            break;
          case 'speed':
            speed = event.value;
            break;
          case 'reduceMotion':
            reduceMotion = event.value;
            break;
        }
      }
      animator.step(dt, speed, reduceMotion);
      if (frame % scenario.every === 0) snapshots.push(`      ${json({ frame, ...snapshot(animator) })}`);
    }
    // NaN is not JSON; a NaN value event is written as the string "NaN".
    const events = scenario.events.map((event) => (typeof event.value === 'number' && Number.isNaN(event.value) ? { ...event, value: 'NaN' } : event));
    const head = json({ description, fps, ...scenario, events, initialState }).slice(0, -1);
    return `    ${head}, "snapshots": [\n${snapshots.join(',\n')}\n    ]}`;
  }).join(',\n');
  return {
    name: 'animator.json',
    content: `{\n  "description": "ProgressAnimator runs at \`fps\` frames per second. Each frame applies its events with now = frame / fps, steps by 1 / fps, then records the state when frame is a multiple of \`every\`. A value of \\"NaN\\" stands for NaN.",\n  "scenarios": [\n${body}\n  ]\n}\n`,
  };
}

export function progressVectorFiles(): ProgressVectorFile[] {
  return [resolveFile(), ...PROGRESS_TYPES.map(geometryFile), animatorFile()];
}
