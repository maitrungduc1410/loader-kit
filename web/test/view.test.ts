import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { LoaderKitView, prepare, type LoaderKitOptions } from '../src/index.ts';
import { createEnvironment, type Environment } from './support/dom.ts';

let env: Environment;

afterEach(async () => {
  await env?.close();
});

function setup(options: LoaderKitOptions = {}) {
  env = createEnvironment();
  const host = env.document.createElement('div');
  env.document.body.appendChild(host);
  const view = new LoaderKitView(host as unknown as HTMLElement, options);
  env.resize(view.canvas, 40, 40);
  const ctx = env.contextOf(view.canvas);
  /** Paints of the next frame. */
  const frame = (ms = 16) => {
    ctx.paints.length = 0;
    env.tick(ms);
    return ctx.paints;
  };
  return { host, view, ctx, frame };
}

const close = (actual: number, expected: number, message = '') =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message} ${actual} != ${expected}`);

/** Advances the clock to 0.048 s: the first frame only sets the clock anchor. */
function run(frame: (ms?: number) => unknown, frames = 4) {
  for (let i = 0; i < frames; i++) frame();
}

test('the clock advances by frameDelta times speed from rAF timestamps; the first frame does not advance', () => {
  const { view, frame } = setup();
  assert.equal(view.canvas.parentNode !== null, true);
  assert.equal(view.canvas.width, 40);
  assert.equal(frame().length, 3, 'BallPulse draws 3 elements');
  assert.equal(view.time, 0);
  run(frame, 3);
  close(view.time, 0.048);
});

test('changing the speed never makes the time jump', () => {
  const { view, frame } = setup();
  run(frame);
  view.speed = 2;
  close(view.time, 0.048);
  frame();
  close(view.time, 0.08);
  view.speed = 0.5;
  close(view.time, 0.08);
  frame(20);
  close(view.time, 0.09);
});

test('speed <= 0 or not finite pauses without scheduling frames; resuming does not jump', () => {
  const { view, frame } = setup();
  run(frame);
  for (const speed of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    view.speed = speed;
    frame();
    assert.equal(env.pendingFrames(), 0, `idle at speed ${speed}`);
    close(view.time, 0.048);
  }
  env.wait(5000);
  view.speed = 1;
  frame();
  close(view.time, 0.048, 'no jump after the pause');
  frame();
  close(view.time, 0.064);
});

test('stop freezes the time and hides; start continues from the frozen time', () => {
  const { view, ctx, frame } = setup();
  run(frame);
  view.stop();
  assert.equal(view.animating, false);
  const clears = ctx.clears;
  assert.equal(frame().length, 0, 'hidesWhenStopped draws nothing');
  assert.equal(ctx.clears, clears + 1, 'the last frame is cleared');
  assert.equal(env.pendingFrames(), 0);
  env.wait(3000);
  view.start();
  frame();
  close(view.time, 0.048);
  frame();
  close(view.time, 0.064);
});

test('with hidesWhenStopped false, a stopped view keeps drawing its frozen frame', () => {
  const { view, frame } = setup({ hidesWhenStopped: false });
  run(frame);
  view.animating = false;
  assert.equal(frame().length, 3);
  close(view.time, 0.048);
  view.hidesWhenStopped = true;
  assert.equal(frame().length, 0);
});

test('changing the spec, the indicator or the params restarts at 0; colors, speed and size do not', () => {
  const { view, frame } = setup();
  const advance = () => {
    run(frame, 3);
    assert.ok(view.time > 0);
  };
  advance();
  view.color = 'red';
  view.colors = ['red', 'blue'];
  view.speed = 1.5;
  env.resize(view.canvas, 80, 60);
  assert.ok(view.time > 0, 'unchanged');

  view.params = { count: 4 };
  assert.equal(view.time, 0, 'params');
  advance();
  view.params = { count: 4 };
  assert.ok(view.time > 0, 'equal params do not restart');
  view.indicator = 'BallBeat';
  assert.equal(view.time, 0, 'indicator');
  advance();
  const spec = prepare({ indicator: 'BallScale' }).spec;
  view.spec = spec;
  assert.equal(view.time, 0, 'spec');
  advance();
  view.spec = spec;
  view.indicator = 'BallPulse';
  assert.ok(view.time > 0, 'the same spec, or the indicator while a spec is set, do not restart');
  view.spec = JSON.stringify(spec);
  assert.equal(view.time, 0, 'JSON spec');
});

test('cycleProgress freezes timeForCycleProgress; clearing it resumes the clock where it was', () => {
  const { view, frame } = setup();
  run(frame);
  const prepared = prepare({ indicator: 'BallPulse' });
  view.cycleProgress = 0.25;
  assert.equal(view.time, prepared.timeForCycleProgress(0.25));
  frame();
  frame();
  assert.equal(view.time, prepared.timeForCycleProgress(0.25));
  assert.equal(env.pendingFrames(), 0, 'no frame loop while frozen');
  assert.equal(frame().length, 0, 'nothing to draw until a change');
  view.cycleProgress = 1.5;
  assert.equal(view.time, prepared.timeForCycleProgress(1));
  view.cycleProgress = null;
  close(view.time, 0.048);
  frame();
  close(view.time, 0.048);
  frame();
  close(view.time, 0.064);
  view.cycleProgress = Number.NaN;
  assert.equal(view.cycleProgress, null, 'NaN counts as unset');
});

test('a frozen cycleProgress is drawn even while the spec has staggered elements', () => {
  const { view, frame } = setup({ indicator: 'BallSpinFadeLoader', cycleProgress: 0 });
  const paints = frame();
  assert.equal(paints.length, 8);
  assert.equal(view.time, prepare({ indicator: 'BallSpinFadeLoader' }).timeForCycleProgress(0));
});

test('reduced motion draws a still frame at timeForCycleProgress(0) unless respectsReduceMotion is false', () => {
  const { view, frame } = setup();
  const still = prepare({ indicator: 'BallPulse' }).timeForCycleProgress(0);
  run(frame);
  env.setReduceMotion(true);
  assert.equal(view.time, still);
  assert.equal(frame().length, 3);
  assert.equal(env.pendingFrames(), 0);
  view.respectsReduceMotion = false;
  close(view.time, 0.048);
  frame();
  frame();
  close(view.time, 0.064);
  view.respectsReduceMotion = true;
  assert.equal(view.time, still);
  env.setReduceMotion(false);
  close(view.time, 0.064);
});

test('reduced motion is read when the view is created', () => {
  env = createEnvironment();
  env.setReduceMotion(true);
  const host = env.document.createElement('div');
  const view = new LoaderKitView(host as unknown as HTMLElement);
  assert.equal(view.time, prepare({}).timeForCycleProgress(0));
});

test('a long frame advances by its whole delta times speed', () => {
  const { view, frame } = setup({ speed: 2 });
  run(frame);
  frame(5000);
  close(view.time, 0.096 + 10);
});

test('a hidden document or an offscreen view pauses the clock and resumes without a jump', () => {
  const { view, frame } = setup();
  run(frame);
  env.setDocumentHidden(true);
  frame();
  assert.equal(env.pendingFrames(), 0);
  env.wait(10_000);
  env.setDocumentHidden(false);
  frame();
  frame();
  close(view.time, 0.064);

  env.setIntersecting(view.canvas, false);
  frame();
  assert.equal(env.pendingFrames(), 0);
  env.wait(10_000);
  env.setIntersecting(view.canvas, true);
  frame();
  frame();
  close(view.time, 0.08);
});

test('errors: specError, onError with the message, nothing drawn; onError(null) on recovery', () => {
  const messages: (string | null)[] = [];
  const { view, frame } = setup({ indicator: 'Nope', onError: (message) => messages.push(message) });
  assert.match(view.specError!, /unknown indicator "Nope"/);
  assert.deepEqual(messages, [view.specError]);
  assert.equal(frame().length, 0);
  assert.equal(env.pendingFrames(), 0);

  view.spec = '{"schemaVersion": 1';
  assert.match(view.specError!, /spec is not valid JSON/);
  view.spec = { schemaVersion: 2 } as never;
  view.spec = { schemaVersion: 2 } as never;
  assert.equal(messages.length, 3, 'the same message is reported once');

  view.spec = null;
  view.indicator = 'BallBeat';
  assert.equal(view.specError, null);
  assert.equal(messages[messages.length - 1], null);
  assert.equal(frame().length, 3);

  view.params = '{"count": 3';
  assert.match(view.specError!, /params is not valid JSON/);
  view.params = '{"count": 4}';
  assert.equal(view.specError, null);
});

test('without onError, problems are logged', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const { view } = setup({ indicator: 'Nope' });
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0]!.arguments[0]), /^LoaderKit: Invalid indicator spec/);
  assert.ok(view.specError);
});

test('color: the CSS color of the host is read on every drawn frame', () => {
  const { host, view, frame } = setup();
  const style = (host as unknown as HTMLElement).style;
  style.color = 'rgb(1, 2, 3)';
  assert.equal(frame()[0]!.style, 'rgb(1, 2, 3)');
  style.color = 'rgb(4, 5, 6)';
  assert.equal(frame()[0]!.style, 'rgb(4, 5, 6)', 'a running view follows without any call');
  view.color = '#7c3aed';
  assert.equal(frame()[0]!.style, '#7c3aed');
  style.color = 'rgb(7, 8, 9)';
  view.color = null;
  assert.equal(frame()[0]!.style, 'rgb(7, 8, 9)');
  view.colors = ['red', 'green'];
  assert.deepEqual(frame().map((paint) => paint.style), ['red', 'green', 'red']);
  view.colors = [];
  assert.equal(frame()[0]!.style, 'rgb(7, 8, 9)');
});

test('an idle view redraws in the new CSS color on a theme switch', async () => {
  const { host, view, frame } = setup({ hidesWhenStopped: false });
  view.stop();
  assert.equal(frame()[0]!.style, '#000');
  assert.equal(env.pendingFrames(), 0);

  env.document.body.setAttribute('style', 'color: rgb(10, 20, 30)');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(env.pendingFrames(), 1, 'an attribute of <body> changed');
  assert.equal(frame()[0]!.style, 'rgb(10, 20, 30)');

  env.document.documentElement.setAttribute('class', 'dark');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(env.pendingFrames(), 0, 'no redraw when the color did not change');

  (host as unknown as HTMLElement).style.color = 'rgb(40, 50, 60)';
  env.setMedia('(prefers-color-scheme: dark)', true);
  assert.equal(env.pendingFrames(), 1, 'the system color scheme changed');
  assert.equal(frame()[0]!.style, 'rgb(40, 50, 60)');

  view.color = 'red';
  assert.equal(frame()[0]!.style, 'red');
  (host as unknown as HTMLElement).style.color = 'rgb(1, 1, 1)';
  env.setMedia('(prefers-color-scheme: dark)', false);
  assert.equal(env.pendingFrames(), 0, 'an explicit color does not follow the CSS');
});

test('the backing store follows the device pixel size', () => {
  const { view } = setup();
  env.setPixelRatio(2);
  env.resize(view.canvas, 40, 30);
  assert.deepEqual([view.canvas.width, view.canvas.height], [80, 60]);
  env.resize(view.canvas, 40.4, 30, { width: 81, height: 60 });
  assert.deepEqual([view.canvas.width, view.canvas.height], [81, 60]);
  env.setPixelRatio(3);
  assert.equal(env.observed(), 5, 'the resolution query is replaced, not added to');
});

test('the indicator is drawn in device pixels, in the centered square', () => {
  const { view, ctx, frame } = setup({ indicator: 'SquareSpin', cycleProgress: 0.5, respectsReduceMotion: false });
  env.resize(view.canvas, 100, 50, { width: 200, height: 100 });
  const [paint] = frame();
  assert.ok(paint);
  const xs = paint.subpaths[0]!.points.map(([x]) => x);
  assert.ok(Math.min(...xs) >= 50 && Math.max(...xs) <= 150, `inside the box: ${xs}`);
  assert.equal(ctx.commands[0]?.op, 'beginPath');
});

test('destroy stops the loop, removes the observers, the listeners and the canvas it created', () => {
  const { host, view, frame } = setup();
  run(frame);
  view.destroy();
  assert.equal(env.pendingFrames(), 0);
  assert.equal(env.observed(), 0);
  assert.equal((host as unknown as HTMLElement).children.length, 0);
  view.speed = 2;
  view.spec = null;
  view.indicator = 'BallBeat';
  assert.equal(env.pendingFrames(), 0, 'no work after destroy');
  view.destroy();
});

function canvasHost(rect = { width: 0, height: 0 }) {
  env = createEnvironment();
  const canvas = env.document.createElement('canvas') as unknown as HTMLCanvasElement;
  canvas.getBoundingClientRect = () => ({ ...rect, x: 0, y: 0, top: 0, left: 0, right: rect.width, bottom: rect.height }) as DOMRect;
  env.document.body.appendChild(canvas as never);
  return canvas;
}

/** What a browser reports for a canvas without a CSS size: its inline size, else its attributes. */
function autoSize(canvas: HTMLCanvasElement) {
  const width = canvas.style.width ? Number.parseFloat(canvas.style.width) : canvas.width;
  const height = canvas.style.height ? Number.parseFloat(canvas.style.height) : canvas.height;
  env.resize(canvas, width, height);
}

test('a canvas host is drawn into and kept on destroy', () => {
  const canvas = canvasHost();
  const view = new LoaderKitView(canvas);
  assert.equal(view.canvas, canvas);
  env.resize(canvas, 40, 40);
  env.tick();
  assert.equal(env.contextOf(canvas).paints.length, 3);
  view.destroy();
  assert.equal(canvas.parentNode, env.document.body as unknown);
});

test('a canvas without a CSS size converges instead of growing, even when first shown later', () => {
  const canvas = canvasHost();
  env.setPixelRatio(2);
  new LoaderKitView(canvas);
  env.resize(canvas, 0, 0);
  assert.deepEqual([canvas.width, canvas.height], [300, 150], 'a hidden canvas keeps its backing store');
  for (let i = 0; i < 6; i++) autoSize(canvas);
  assert.deepEqual([canvas.width, canvas.height], [600, 300]);
  assert.deepEqual([canvas.style.width, canvas.style.height], ['300px', '150px']);
});

test('a canvas sized by CSS is never pinned', () => {
  const canvas = canvasHost({ width: 300, height: 150 });
  new LoaderKitView(canvas);
  assert.deepEqual([canvas.width, canvas.height], [300, 150]);
  env.setPixelRatio(2);
  for (const [width, height] of [[100, 50], [120, 60], [120, 60], [80, 80]] as const) env.resize(canvas, width, height);
  assert.deepEqual([canvas.width, canvas.height], [160, 160]);
  assert.deepEqual([canvas.style.width, canvas.style.height], ['', '']);
});

test('options set every property', () => {
  const onError = () => {};
  const { view } = setup({
    indicator: 'BallBeat',
    params: { count: 3 },
    color: 'red',
    colors: ['blue'],
    speed: 2,
    animating: false,
    hidesWhenStopped: false,
    cycleProgress: 0.5,
    respectsReduceMotion: false,
    onError,
  });
  assert.deepEqual(
    [view.indicator, view.params, view.color, view.colors, view.speed, view.animating, view.hidesWhenStopped, view.cycleProgress, view.respectsReduceMotion, view.onError, view.spec],
    ['BallBeat', { count: 3 }, 'red', ['blue'], 2, false, false, 0.5, false, onError, null],
  );
});
