import { version } from 'react';

/** React 18 and older write `className` on a custom element as a `classname` attribute. */
export const classAttribute = Number.parseInt(version, 10) >= 19 ? 'className' : 'class';
