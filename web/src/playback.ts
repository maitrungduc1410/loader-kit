import type { PreparedIndicator } from '@loader-kit/spec';

/** The playback rules of SPEC section 8: a clock driven by frame deltas, and the spec time to draw. */
export class Playback {
  /** Spec time of the clock in seconds. */
  time = 0;
  /** Clock rate. Zero, negative or non-finite values pause; changing it never moves `time`. */
  speed = 1;
  /** Stopping freezes `time`; starting again continues from it. */
  animating = true;
  hidesWhenStopped = true;
  /** A frozen point of the cycle in [0, 1]. While set, the clock is ignored and does not advance. */
  cycleProgress: number | null = null;
  /** The system asks for reduced motion and the view respects it: draw a still frame. */
  reduceMotion = false;

  /** Whether anything is drawn. */
  get visible(): boolean {
    return this.animating || !this.hidesWhenStopped;
  }

  /** Whether the clock advances, so the view needs frames. */
  get running(): boolean {
    return (
      this.animating &&
      Number.isFinite(this.speed) &&
      this.speed > 0 &&
      this.cycleProgress === null &&
      !this.reduceMotion
    );
  }

  /** Restarts the clock at 0, as when the spec or the params change. */
  restart(): void {
    this.time = 0;
  }

  /** Advances the clock by a frame delta in seconds, multiplied by `speed`, while running. */
  advance(seconds: number): void {
    if (this.running && seconds > 0) this.time += seconds * this.speed;
  }

  /** The spec time to draw for `prepared`. */
  displayTime(prepared: PreparedIndicator | null): number {
    if (prepared === null) return this.time;
    if (this.cycleProgress !== null) return prepared.timeForCycleProgress(this.cycleProgress);
    if (this.reduceMotion) return prepared.timeForCycleProgress(0);
    return this.time;
  }
}
