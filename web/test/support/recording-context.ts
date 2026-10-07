// A 2D context that records what is drawn, with every path point in device coordinates.
import type { Context2D } from '../../src/draw.ts';

export type Affine = [a: number, b: number, c: number, d: number, e: number, f: number];

export interface Subpath {
  points: [number, number][];
  closed: boolean;
}

export interface Paint {
  kind: 'fill' | 'stroke';
  style: string;
  alpha: number;
  lineWidth: number;
  lineCap: string;
  /** Transform when the paint happened; it scales the stroke width. */
  transform: Affine;
  subpaths: Subpath[];
}

export interface Command {
  op: string;
  args: number[];
  transform: Affine;
}

const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];
const FULL_TURN = 2 * Math.PI;

function multiply(m: Affine, n: Affine): Affine {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export class RecordingContext {
  readonly paints: Paint[] = [];
  readonly commands: Command[] = [];
  clears = 0;
  /** Points per full turn when arcs are flattened. */
  arcResolution = 720;

  globalAlpha = 1;
  fillStyle = '#000';
  strokeStyle = '#000';
  lineWidth = 1;
  lineCap = 'butt';

  private matrix: Affine = [...IDENTITY];
  private stack: { matrix: Affine; globalAlpha: number; fillStyle: string; strokeStyle: string; lineWidth: number; lineCap: string }[] = [];
  private subpaths: Subpath[] = [];

  get context(): Context2D {
    return this as unknown as Context2D;
  }

  save(): void {
    const { globalAlpha, fillStyle, strokeStyle, lineWidth, lineCap } = this;
    this.stack.push({ matrix: [...this.matrix], globalAlpha, fillStyle, strokeStyle, lineWidth, lineCap });
  }

  restore(): void {
    const state = this.stack.pop();
    if (!state) return;
    this.matrix = state.matrix;
    this.globalAlpha = state.globalAlpha;
    this.fillStyle = state.fillStyle;
    this.strokeStyle = state.strokeStyle;
    this.lineWidth = state.lineWidth;
    this.lineCap = state.lineCap;
  }

  get depth(): number {
    return this.stack.length;
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.matrix = [a, b, c, d, e, f];
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.matrix = multiply(this.matrix, [a, b, c, d, e, f]);
  }

  scale(x: number, y: number): void {
    this.transform(x, 0, 0, y, 0, 0);
  }

  getTransform(): { a: number; b: number; c: number; d: number; e: number; f: number } {
    const [a, b, c, d, e, f] = this.matrix;
    return { a, b, c, d, e, f };
  }

  clearRect(): void {
    this.clears++;
  }

  beginPath(): void {
    this.subpaths = [];
    this.record('beginPath', []);
  }

  moveTo(x: number, y: number): void {
    this.record('moveTo', [x, y]);
    this.subpaths.push({ points: [this.apply(x, y)], closed: false });
  }

  lineTo(x: number, y: number): void {
    this.record('lineTo', [x, y]);
    this.addPoint(x, y);
  }

  closePath(): void {
    this.record('closePath', []);
    const last = this.subpaths[this.subpaths.length - 1];
    if (!last) return;
    last.closed = true;
    this.subpaths.push({ points: [last.points[0]!], closed: false });
  }

  arc(x: number, y: number, r: number, start: number, end: number, anticlockwise = false): void {
    this.record('arc', [x, y, r, start, end, anticlockwise ? 1 : 0]);
    this.flatten(x, y, r, r, start, end, anticlockwise);
  }

  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
    anticlockwise = false,
  ): void {
    if (rx < 0 || ry < 0) throw new RangeError('negative radius');
    if (rotation !== 0) throw new Error('rotated ellipses are not recorded');
    this.record('ellipse', [x, y, rx, ry, start, end, anticlockwise ? 1 : 0]);
    this.flatten(x, y, rx, ry, start, end, anticlockwise);
  }

  fill(): void {
    this.paint('fill');
  }

  stroke(): void {
    this.paint('stroke');
  }

  /** Every recorded point of every paint. */
  allPoints(): [number, number][] {
    return this.paints.flatMap((paint) => paint.subpaths.flatMap((subpath) => subpath.points));
  }

  private paint(kind: 'fill' | 'stroke'): void {
    this.paints.push({
      kind,
      style: kind === 'fill' ? this.fillStyle : this.strokeStyle,
      alpha: this.globalAlpha,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      transform: [...this.matrix],
      subpaths: this.subpaths
        .filter((subpath) => subpath.points.length > 1 || subpath.closed)
        .map((subpath) => ({ points: [...subpath.points], closed: subpath.closed })),
    });
  }

  private record(op: string, args: number[]): void {
    this.commands.push({ op, args, transform: [...this.matrix] });
  }

  private apply(x: number, y: number): [number, number] {
    const [a, b, c, d, e, f] = this.matrix;
    return [a * x + c * y + e, b * x + d * y + f];
  }

  private addPoint(x: number, y: number): void {
    const last = this.subpaths[this.subpaths.length - 1];
    if (last) last.points.push(this.apply(x, y));
    else this.subpaths.push({ points: [this.apply(x, y)], closed: false });
  }

  /** The HTML canvas arc rules: a whole turn when the angles span 2π or more, else the short way round. */
  private flatten(x: number, y: number, rx: number, ry: number, start: number, end: number, anticlockwise: boolean): void {
    let sweep: number;
    if (!anticlockwise && end - start >= FULL_TURN) sweep = FULL_TURN;
    else if (anticlockwise && start - end >= FULL_TURN) sweep = -FULL_TURN;
    else if (!anticlockwise) sweep = (((end - start) % FULL_TURN) + FULL_TURN) % FULL_TURN;
    else sweep = -((((start - end) % FULL_TURN) + FULL_TURN) % FULL_TURN);
    const steps = Math.max(1, Math.ceil((Math.abs(sweep) / FULL_TURN) * this.arcResolution));
    for (let i = 0; i <= steps; i++) {
      const angle = start + (sweep * i) / steps;
      this.addPoint(x + rx * Math.cos(angle), y + ry * Math.sin(angle));
    }
  }
}
