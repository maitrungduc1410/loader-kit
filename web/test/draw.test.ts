import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ElementState, IndicatorSpec, Part } from '@loader-kit/spec';
import { drawIndicator, prepare } from '../src/index.ts';
import { RecordingContext, type Affine, type Command } from './support/recording-context.ts';
import { distanceToCurve, specPoint, type Box } from './support/spec-transform.ts';

const close = (actual: number, expected: number, message: string, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} != ${expected}`);

const closePoint = (actual: readonly number[], expected: readonly number[], message: string, tolerance = 1e-9) => {
  close(actual[0]!, expected[0]!, `${message} x`, tolerance);
  close(actual[1]!, expected[1]!, `${message} y`, tolerance);
};

/** A 200 by 100 frame at (10, 20): the box is the centered 100 by 100 square. */
const FRAME = { x: 10, y: 20, width: 200, height: 100, color: '#123456' };
const BOX: Box = { left: 60, top: 20, side: 100 };

const GROUP = [
  { property: 'rotate', keyTimes: [0, 1], values: [0.4, 0.4] },
  { property: 'scaleX', keyTimes: [0, 1], values: [0.9, 0.9] },
  { property: 'scaleY', keyTimes: [0, 1], values: [1.1, 1.1] },
  { property: 'translateX', keyTimes: [0, 1], values: [0.03, 0.03] },
  { property: 'translateY', keyTimes: [0, 1], values: [-0.02, -0.02] },
] as const;

const AFFINE_REST = { rotate: 0.3, scaleX: 0.8, scaleY: 1.2, translateX: 0.05, translateY: -0.04 };
const PERSPECTIVE_REST = { ...AFFINE_REST, rotateX: 0.7, rotateY: -0.45 };

function spec(part: Partial<Part> & Pick<Part, 'shape'> & { params?: Record<string, number> }, extra: Partial<IndicatorSpec> = {}): IndicatorSpec {
  return {
    schemaVersion: 1,
    name: 'Test',
    duration: 1,
    layout: { type: 'single', size: 0.5, width: 0.5, height: 0.3, x: 0.45, y: 0.55 },
    groupTracks: GROUP,
    ...part,
    ...extra,
  } as IndicatorSpec;
}

function draw(source: IndicatorSpec, frame: Parameters<typeof drawIndicator>[3] = FRAME, t = 0) {
  const prepared = prepare({ spec: source });
  const ctx = new RecordingContext();
  drawIndicator(ctx.context, prepared, t, frame);
  assert.equal(ctx.depth, 0, 'the context state is restored');
  return { ctx, states: prepared.evaluate(t) };
}

const applyAffine = (m: Affine, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** The command's transform maps element points (frame units) where SPEC section 6 puts them. */
function assertSpecTransform(command: Command, state: ElementState, message: string) {
  const w = state.width * BOX.side;
  const h = state.height * BOX.side;
  for (const [x, y] of [[0, 0], [w / 2, 0], [0, h / 2], [-w / 2, h / 2], [w / 3, -h / 2]] as const) {
    closePoint(applyAffine(command.transform, x, y), specPoint(state, x / BOX.side, y / BOX.side, BOX), `${message} (${x}, ${y})`);
  }
}

const ops = (ctx: RecordingContext, ...names: string[]) => ctx.commands.filter((command) => names.includes(command.op));

test('a full circle is an ellipse inscribed in the element, through the SPEC matrix', () => {
  const { ctx, states } = draw(spec({ shape: { type: 'circle' }, rest: AFFINE_REST }));
  const [ellipse] = ops(ctx, 'ellipse');
  assert.ok(ellipse);
  const [x, y, rx, ry, start, end, ccw] = ellipse.args;
  assert.deepEqual([x, y, ccw], [0, 0, 0]);
  close(rx!, 25, 'rx');
  close(ry!, 15, 'ry');
  close(start!, -Math.PI / 2, 'start');
  close(end! - start!, 2 * Math.PI, 'sweep');
  assertSpecTransform(ellipse, states[0]!, 'circle');
  assert.equal(ctx.paints.length, 1);
  assert.equal(ctx.paints[0]!.kind, 'fill');
  assert.equal(ctx.paints[0]!.style, '#123456');
});

test('a circle with a sweep below 2π is the part between the arc and its chord', () => {
  const { ctx, states } = draw(spec({ shape: { type: 'circle', startAngle: 0.2, sweep: 2 }, rest: AFFINE_REST }));
  const [ellipse] = ops(ctx, 'ellipse');
  close(ellipse!.args[4]!, 0.2, 'start');
  close(ellipse!.args[5]!, 2.2, 'end');
  assert.equal(ops(ctx, 'closePath').length, 1);
  const [subpath] = ctx.paints[0]!.subpaths;
  assert.ok(subpath!.closed, 'the chord closes the arc');
  const state = states[0]!;
  const at = (a: number) => specPoint(state, (0.25 * Math.cos(a)) , (0.15 * Math.sin(a)), BOX);
  closePoint(subpath!.points[0]!, at(0.2), 'arc start', 1e-9);
  closePoint(subpath!.points[subpath!.points.length - 1]!, at(2.2), 'arc end', 1e-9);
});

test('a circle sweep is clamped to [0, 2π] and draws nothing at or below 0', () => {
  const full = draw(spec({ params: { sweep: 9 }, shape: { type: 'circle', sweep: { $param: 'sweep' } }, rest: AFFINE_REST }));
  const [ellipse] = ops(full.ctx, 'ellipse');
  close(ellipse!.args[5]! - ellipse!.args[4]!, 2 * Math.PI, 'clamped sweep');
  for (const sweep of [0, -1]) {
    const prepared = prepare({ spec: spec({ params: { sweep: 1 }, shape: { type: 'circle', sweep: { $param: 'sweep' } } }) }, { sweep });
    const ctx = new RecordingContext();
    drawIndicator(ctx.context, prepared, 0, FRAME);
    assert.equal(ctx.paints.length, 0, `sweep ${sweep}`);
  }
});

test('a rect without a corner radius has its four corners where SPEC section 6 puts them', () => {
  const { ctx, states } = draw(spec({ shape: { type: 'rect' }, rest: AFFINE_REST }));
  const state = states[0]!;
  const corners = [[-0.25, -0.15], [0.25, -0.15], [0.25, 0.15], [-0.25, 0.15]] as const;
  const points = ctx.paints[0]!.subpaths[0]!.points;
  corners.forEach(([x, y], i) => closePoint(points[i]!, specPoint(state, x, y, BOX), `corner ${i}`));
});

test('a rect corner radius is cornerRadius times the shorter side, clamped to half of it', () => {
  for (const [cornerRadius, expected] of [[0.25, 7.5], [2, 15]] as const) {
    const { ctx, states } = draw(spec({ shape: { type: 'rect', cornerRadius }, rest: AFFINE_REST }));
    const arcs = ops(ctx, 'ellipse');
    assert.equal(arcs.length, 4);
    for (const arc of arcs) {
      close(arc.args[2]!, expected, `radius for ${cornerRadius}`);
      close(arc.args[3]!, expected, `radius for ${cornerRadius}`);
      close(arc.args[5]! - arc.args[4]!, Math.PI / 2, 'quarter turn');
    }
    // The top-right corner arc is centered (r, r) inside the corner.
    close(arcs[0]!.args[0]!, 25 - expected, 'corner center x');
    close(arcs[0]!.args[1]!, -15 + expected, 'corner center y');
    assertSpecTransform(arcs[0]!, states[0]!, 'rect');
  }
});

test('a line is a rect with a corner radius of half the shorter side', () => {
  const { ctx } = draw(spec({ shape: { type: 'line' }, rest: AFFINE_REST }));
  const arcs = ops(ctx, 'ellipse');
  assert.equal(arcs.length, 4);
  for (const arc of arcs) close(arc.args[2]!, 15, 'radius');
});

test('a triangle is top-center, bottom-right, bottom-left', () => {
  const { ctx, states } = draw(spec({ shape: { type: 'triangle' }, rest: AFFINE_REST }));
  const state = states[0]!;
  const points = ctx.paints[0]!.subpaths[0]!.points;
  closePoint(points[0]!, specPoint(state, 0, -0.15, BOX), 'top');
  closePoint(points[1]!, specPoint(state, 0.25, 0.15, BOX), 'bottom right');
  closePoint(points[2]!, specPoint(state, -0.25, 0.15, BOX), 'bottom left');
  assert.ok(ctx.paints[0]!.subpaths[0]!.closed);
});

test('ring arcs are trimmed by strokeStart and strokeEnd, with butt caps and a scaled stroke', () => {
  const ring = { type: 'ring', strokeWidth: 0.2, startAngle: 0.1, sweep: 1.5, segments: 3 } as const;
  const { ctx, states } = draw(spec({ shape: ring, rest: { ...AFFINE_REST, strokeStart: 0.25, strokeEnd: 0.75 } }));
  const strokes = ctx.paints.filter((paint) => paint.kind === 'stroke');
  assert.equal(strokes.length, 3);
  const arcs = ops(ctx, 'arc');
  assert.equal(arcs.length, 3);
  arcs.forEach((arc, k) => {
    const [x, y, radius, from, to] = arc.args;
    assert.deepEqual([x, y], [0, 0]);
    close(radius!, (30 - 6) / 2, 'radius');
    const a = 0.1 + (k * 2 * Math.PI) / 3;
    close(from!, a + 0.25 * 1.5, `arc ${k} start`);
    close(to!, a + 0.75 * 1.5, `arc ${k} end`);
    assertSpecTransform(arc, states[0]!, `arc ${k}`);
  });
  for (const paint of strokes) {
    close(paint.lineWidth, 6, 'stroke width in element units');
    assert.equal(paint.lineCap, 'butt');
    // The stroke is drawn under the element matrix, so it scales with scaleX and scaleY like the native engines.
    assertSpecTransform({ op: 'stroke', args: [], transform: paint.transform }, states[0]!, 'stroke transform');
  }
});

test('a ring draws nothing when the trim is empty or the stroke does not fit', () => {
  const cases = [
    { shape: { type: 'ring', strokeWidth: 0.2 }, rest: { strokeStart: 0.6, strokeEnd: 0.6 } },
    { shape: { type: 'ring', strokeWidth: 0.2 }, rest: { strokeStart: 0.8, strokeEnd: 0.3 } },
    { shape: { type: 'ring', strokeWidth: 1 }, rest: {} },
    { shape: { type: 'ring', strokeWidth: 1.5 }, rest: {} },
    { shape: { type: 'ring', strokeWidth: 0 }, rest: {} },
    { shape: { type: 'ring', strokeWidth: -0.1 }, rest: {} },
  ] as const;
  for (const part of cases) {
    const { ctx } = draw(spec(part as unknown as Part));
    assert.equal(ctx.paints.length, 0, JSON.stringify(part));
  }
});

test('a ring trimmed to a full turn is one closed circle', () => {
  const { ctx } = draw(spec({ shape: { type: 'ring', strokeWidth: 0.1, segments: 4 }, rest: { strokeStart: -1, strokeEnd: 3 } }));
  assert.equal(ctx.paints.length, 1);
  const [arc] = ops(ctx, 'arc');
  close(arc!.args[4]! - arc!.args[3]!, 2 * Math.PI, 'full turn');
  assert.ok(ctx.paints[0]!.subpaths[0]!.closed);
});

test('an element without rotateX or rotateY is drawn with an affine transform, never projected', () => {
  for (const shape of [{ type: 'circle' }, { type: 'rect' }, { type: 'triangle' }] as const) {
    const { ctx } = draw(spec({ shape, rest: AFFINE_REST }));
    const transforms = new Set(ctx.commands.filter((c) => c.op !== 'beginPath').map((c) => c.transform.join()));
    assert.equal(transforms.size, 1);
    assert.notEqual([...transforms][0], '1,0,0,1,0,0');
  }
});

test('perspective: polygon corners are projected exactly like SPEC section 6', () => {
  for (const perspective of [undefined, 1.2]) {
    for (const [shape, local] of [
      [{ type: 'rect' }, [[-0.25, -0.15], [0.25, -0.15], [0.25, 0.15], [-0.25, 0.15]]],
      [{ type: 'triangle' }, [[0, -0.15], [0.25, 0.15], [-0.25, 0.15]]],
    ] as const) {
      const { ctx, states } = draw(spec({ shape, rest: PERSPECTIVE_REST }, perspective ? { perspective } : {}));
      assert.equal(ops(ctx, 'ellipse', 'arc', 'transform').length, 0);
      const points = ctx.paints[0]!.subpaths[0]!.points;
      for (const command of ctx.commands) assert.deepEqual(command.transform, [1, 0, 0, 1, 0, 0]);
      local.forEach(([x, y], i) =>
        closePoint(points[i]!, specPoint(states[0]!, x, y, BOX, perspective), `${shape.type} ${i} d=${perspective}`, 1e-9),
      );
    }
  }
});

test('perspective: curves are polygons on the projected ellipse, within the curve tolerance', () => {
  const { ctx, states } = draw(spec({ shape: { type: 'circle', startAngle: 0.3, sweep: 4 }, rest: PERSPECTIVE_REST }));
  const state = states[0]!;
  const at = (a: number) => specPoint(state, 0.25 * Math.cos(a), 0.15 * Math.sin(a), BOX);
  const [subpath] = ctx.paints[0]!.subpaths;
  const points = subpath!.points;
  assert.ok(points.length > 16, `${points.length} points`);
  closePoint(points[0]!, at(0.3), 'start', 1e-9);
  closePoint(points[points.length - 1]!, at(4.3), 'end', 1e-9);
  for (let i = 0; i < points.length; i++) {
    assert.ok(distanceToCurve(points[i]!, at, 0.3, 4.3) < 1e-6, `point ${i} is on the curve`);
    if (i === 0) continue;
    const mid: [number, number] = [(points[i - 1]![0] + points[i]![0]) / 2, (points[i - 1]![1] + points[i]![1]) / 2];
    assert.ok(distanceToCurve(mid, at, 0.3, 4.3) <= 0.2, `chord ${i} stays within 0.2px`);
  }
  assert.ok(subpath!.closed, 'closed by the chord');
});

test('perspective: a ring arc is filled between its projected outer and inner edges', () => {
  const ring = { type: 'ring', strokeWidth: 0.2, startAngle: 0, sweep: 1.2, segments: 2 } as const;
  const { ctx, states } = draw(spec({ shape: ring, rest: { ...PERSPECTIVE_REST, strokeStart: 0.1, strokeEnd: 0.9 } }));
  const state = states[0]!;
  assert.equal(ctx.paints.length, 2);
  ctx.paints.forEach((paint, k) => {
    assert.equal(paint.kind, 'fill');
    const from = k * Math.PI + 0.1 * 1.2;
    const to = k * Math.PI + 0.9 * 1.2;
    const edge = (r: number) => (a: number) => specPoint(state, r * Math.cos(a), r * Math.sin(a), BOX);
    const outer = edge(0.15);
    const inner = edge(0.15 - 0.06);
    const points = paint.subpaths[0]!.points;
    closePoint(points[0]!, outer(from), 'outer start');
    closePoint(points[points.length - 1]!, inner(from), 'inner end');
    for (const point of points) {
      const d = Math.min(distanceToCurve(point, outer, from, to), distanceToCurve(point, inner, from, to));
      assert.ok(d < 1e-6, `arc ${k} point on an edge (${d})`);
    }
  });
});

test('the box is the centered square of the frame, in the frame units', () => {
  const tall = { x: 0, y: 0, width: 60, height: 140, color: 'red' };
  const { ctx, states } = draw(spec({ shape: { type: 'triangle' }, rest: AFFINE_REST }), tall);
  const box = { left: 0, top: 40, side: 60 };
  closePoint(ctx.paints[0]!.subpaths[0]!.points[0]!, specPoint(states[0]!, 0, -0.15, box), 'top');
  for (const size of [{ width: 0, height: 10 }, { width: 10, height: -1 }, { width: Number.NaN, height: 10 }]) {
    const empty = draw(spec({ shape: { type: 'triangle' } }), { ...size, color: 'red' });
    assert.equal(empty.ctx.paints.length, 0);
  }
});

test('colors[i mod n] by global index across parts, opacity multiplies the context alpha', () => {
  const source = {
    schemaVersion: 1,
    name: 'Parts',
    duration: 1,
    parts: [
      { layout: { type: 'row', count: 3, gap: 0.1 }, shape: { type: 'circle' }, tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [0.5, 0.5] }] },
      { layout: { type: 'stack', count: 2, size: 0.4 }, shape: { type: 'rect' }, rest: { opacity: 0 }, tracks: [{ property: 'scale', keyTimes: [0, 1], values: [1, 1] }] },
      { layout: { type: 'single', size: 0.2 }, shape: { type: 'rect' }, tracks: [{ property: 'opacity', keyTimes: [0, 1], values: [2, 2] }] },
    ],
  } as IndicatorSpec;
  const prepared = prepare({ spec: source });
  const ctx = new RecordingContext();
  ctx.globalAlpha = 0.8;
  drawIndicator(ctx.context, prepared, 0, { ...FRAME, colors: ['#a00', '#0a0', 'rgb(0, 0, 170)', '#aa0'] });
  assert.deepEqual(
    ctx.paints.map((paint) => paint.style),
    ['#a00', '#0a0', 'rgb(0, 0, 170)', '#0a0'],
    'element 5 uses colors[1]; the hidden elements 3 and 4 are skipped',
  );
  ctx.paints.slice(0, 3).forEach((paint) => close(paint.alpha, 0.4, 'alpha'));
  close(ctx.paints[3]!.alpha, 0.8, 'opacity is clamped to 1');
  assert.equal(ctx.globalAlpha, 0.8, 'the caller alpha is restored');

  const single = new RecordingContext();
  drawIndicator(single.context, prepared, 0, { ...FRAME, colors: [] });
  assert.ok(single.paints.every((paint) => paint.style === FRAME.color), 'empty colors fall back to color');
});

test('the context transform is kept: the indicator is drawn in the current units', () => {
  const prepared = prepare({ spec: spec({ shape: { type: 'triangle' }, rest: AFFINE_REST }) });
  const ctx = new RecordingContext();
  ctx.scale(2, 2);
  drawIndicator(ctx.context, prepared, 0, FRAME);
  const [x, y] = specPoint(prepared.evaluate(0)[0]!, 0, -0.15, BOX);
  closePoint(ctx.paints[0]!.subpaths[0]!.points[0]!, [2 * x, 2 * y], 'scaled');
  assert.deepEqual(ctx.getTransform(), { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 });
});

test('elements with a non-finite matrix are skipped', () => {
  const source = spec({ params: { s: 1 }, shape: { type: 'rect' }, rest: { translateX: { $param: 's' } } });
  const prepared = prepare({ spec: source }, { s: 1e308 });
  const ctx = new RecordingContext();
  drawIndicator(ctx.context, prepared, 0, FRAME);
  assert.equal(ctx.paints.length, 0);
});
