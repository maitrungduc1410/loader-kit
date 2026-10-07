import type { Playback } from './playback.ts';

/** Canvases owned by a `<loader-kit>` element: their size always comes from the element's CSS. */
export const elementSurfaces = new WeakSet<object>();

/** The clock of each view, so an element can keep its time across a disconnect. */
export const viewClocks = new WeakMap<object, Playback>();
