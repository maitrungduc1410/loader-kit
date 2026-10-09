import type { ProgressState } from './types.ts';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Updates closer together than this, in seconds, count as one stream whose rhythm the glide follows. */
const RHYTHM_GAP = 1.5;
const BACKWARD_DURATION = 0.4;
const ISOLATED_DURATION = 0.5;
const WAVE_STIFFNESS = 120;

/**
 * Moves the displayed value to each new value along a cubic Hermite curve. Its duration follows the
 * rhythm of the updates, so a stream of small updates moves at a steady pace instead of stopping at
 * each one, and both end slopes stay within three times the average slope, which keeps the curve
 * monotone: the displayed value never passes the real one.
 */
class Glide {
  value: number;
  target: number;
  velocity = 0;
  lastAt: number | null = null;
  private interval = ISOLATED_DURATION;
  private from = 0;
  private to = 0;
  private duration = 0;
  private startVelocity = 0;
  private endVelocity = 0;
  private elapsed = 0;
  active = false;

  constructor(value: number) {
    this.value = value;
    this.target = value;
  }

  jump(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.active = false;
  }

  moveTo(target: number, now: number, smooth: boolean): void {
    const gap = this.lastAt === null ? Number.POSITIVE_INFINITY : now - this.lastAt;
    this.lastAt = now;
    if (!smooth) {
      this.jump(target);
      return;
    }
    const rhythmic = gap >= 0 && gap < RHYTHM_GAP;
    this.interval = rhythmic ? this.interval * 0.5 + Math.max(0.05, gap) * 0.5 : ISOLATED_DURATION;
    this.target = target;
    const distance = target - this.value;
    if (Math.abs(distance) < 1e-5) {
      this.jump(target);
      return;
    }
    if (distance < 0) {
      this.duration = BACKWARD_DURATION;
      this.startVelocity = 0;
      this.endVelocity = 0;
    } else {
      this.duration = rhythmic ? Math.min(1, Math.max(0.25, this.interval * 1.15)) : ISOLATED_DURATION;
      const slope = distance / this.duration;
      this.startVelocity = Math.min(2.5 * slope, Math.max(0, this.velocity));
      this.endVelocity = rhythmic && target < 1 ? 0.5 * slope : 0;
    }
    this.from = this.value;
    this.to = target;
    this.elapsed = 0;
    this.active = true;
  }

  step(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    const T = this.duration;
    // The tolerance absorbs the rounding of summed frame times, so 24 frames at 60 fps last 0.4 s.
    const u = this.elapsed >= T - 1e-9 ? 1 : this.elapsed / T;
    const u2 = u * u;
    const u3 = u2 * u;
    const { from, to } = this;
    const m0 = T * this.startVelocity;
    const m1 = T * this.endVelocity;
    this.value = (2 * u3 - 3 * u2 + 1) * from + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * to + (u3 - u2) * m1;
    this.velocity = ((6 * u2 - 6 * u) * from + (3 * u2 - 4 * u + 1) * m0 + (-6 * u2 + 6 * u) * to + (3 * u2 - 2 * u) * m1) / T;
    if (u >= 1) this.jump(to);
  }
}

/**
 * The animation state of one progress indicator: the displayed value and buffer, the wave amplitude
 * and the clocks. Platforms call `setValue` and `setBuffer` when the props change, `step` once per
 * frame, and draw `state`.
 */
export class ProgressAnimator {
  private readonly glide: Glide;
  private readonly bufferGlide: Glide;
  private indeterminateValue: boolean;
  private wave: number;
  private waveVelocity = 0;
  private time = 0;
  private indeterminateTime = 0;

  /** A null or NaN value is indeterminate. */
  constructor(value: number | null = null, buffer: number | null = null) {
    const determinate = isValue(value);
    this.indeterminateValue = !determinate;
    this.glide = new Glide(determinate ? clamp01(value) : 0);
    this.bufferGlide = new Glide(isValue(buffer) ? clamp01(buffer) : 0);
    this.wave = this.waveTarget;
  }

  /** The value the indicator is moving to; null while indeterminate. */
  get target(): number | null {
    return this.indeterminateValue ? null : this.glide.target;
  }

  get indeterminate(): boolean {
    return this.indeterminateValue;
  }

  /** True while the displayed value, the buffer or the wave amplitude are still moving. */
  get moving(): boolean {
    return this.glide.active || this.bufferGlide.active || this.wave !== this.waveTarget || this.waveVelocity !== 0;
  }

  /**
   * Sets the real value; null or NaN switches to indeterminate. `now` is a clock in seconds, used to
   * measure the rhythm of updates. Leaving the indeterminate state starts again from 0.
   */
  setValue(value: number | null, now: number, smooth: boolean): void {
    if (!isValue(value)) {
      if (!this.indeterminateValue) this.glide.jump(0);
      this.indeterminateValue = true;
      return;
    }
    const target = clamp01(value);
    if (this.indeterminateValue) {
      this.indeterminateValue = false;
      this.glide.jump(0);
      this.glide.lastAt = null;
    }
    if (target === this.glide.target && (this.glide.active || this.glide.value === target)) return;
    this.glide.moveTo(target, now, smooth);
  }

  /** Sets the buffer of linear `flat` and `wavy`; null or NaN removes it. */
  setBuffer(buffer: number | null, now: number, smooth: boolean): void {
    const target = isValue(buffer) ? clamp01(buffer) : 0;
    if (target === this.bufferGlide.target && (this.bufferGlide.active || this.bufferGlide.value === target)) return;
    this.bufferGlide.moveTo(target, now, smooth);
  }

  /**
   * Advances by `dt` seconds. A zero, negative or non-finite `speed` pauses the indeterminate
   * animation. With `reduceMotion` the value and the wave jump to their targets, ambient motion stops
   * and the indeterminate animation runs at half speed.
   */
  step(dt: number, speed: number, reduceMotion: boolean): void {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    if (reduceMotion) {
      this.glide.jump(this.glide.target);
      this.bufferGlide.jump(this.bufferGlide.target);
    } else {
      if (!this.indeterminateValue) this.glide.step(dt);
      this.bufferGlide.step(dt);
      this.time += dt;
    }
    if (Number.isFinite(speed) && speed > 0) this.indeterminateTime += dt * speed * (reduceMotion ? 0.5 : 1);
    const target = this.waveTarget;
    if (reduceMotion) {
      this.wave = target;
      this.waveVelocity = 0;
    } else {
      // The exact solution of a critically damped spring, so long frames cannot make it diverge.
      const omega = Math.sqrt(WAVE_STIFFNESS);
      const offset = this.wave - target;
      const decay = Math.exp(-omega * dt);
      const drift = (this.waveVelocity + omega * offset) * dt;
      this.waveVelocity = (this.waveVelocity - omega * drift) * decay;
      this.wave = Math.min(1.2, Math.max(0, target + (offset + drift) * decay));
      if (Math.abs(this.wave - target) < 1e-4 && Math.abs(this.waveVelocity) < 1e-3) {
        this.wave = target;
        this.waveVelocity = 0;
      }
    }
  }

  get state(): ProgressState {
    return {
      indeterminate: this.indeterminateValue,
      value: this.indeterminateValue ? 0 : this.glide.value,
      buffer: this.bufferGlide.value,
      wave: this.wave,
      time: this.time,
      indeterminateTime: this.indeterminateTime,
    };
  }

  /** The wave flattens near 0% and 100%, like Material 3 Expressive. */
  private get waveTarget(): number {
    const target = this.glide.target;
    return this.indeterminateValue || (target > 0.1 && target < 0.95) ? 1 : 0;
  }
}

function isValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}
