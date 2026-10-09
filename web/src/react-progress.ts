'use client';
import { createElement, forwardRef } from 'react';
import type { ForwardedRef, HTMLAttributes } from 'react';
import { progressAttributes } from './progress-attributes.ts';
import type { LoaderKitProgressProps } from './progress-attributes.ts';
import type { LoaderKitProgressElementApi } from './progress-element.ts';
import { classAttribute } from './react-class.ts';
import './progress-element.ts';

export interface LoaderKitProgressReactProps
  extends LoaderKitProgressProps,
    Omit<HTMLAttributes<HTMLElement>, 'color' | keyof LoaderKitProgressProps> {}

/**
 * A progress indicator. Renders a `<loader-kit-progress>` element, so it works with server-side
 * rendering; children are centered over circular, pie and gauge, and framed by border. The ref is
 * the element.
 */
export const LoaderKitProgress = forwardRef(function LoaderKitProgress(
  props: LoaderKitProgressReactProps,
  ref: ForwardedRef<LoaderKitProgressElementApi>,
) {
  const {
    value,
    buffer,
    smooth,
    type,
    variant,
    thickness,
    trackGap,
    segments,
    showLabel,
    stopIndicator,
    strokeCap,
    amplitude,
    wavelength,
    waveSpeed,
    sweepAngle,
    cornerRadius,
    speed,
    size,
    color,
    trackColor,
    labelColor,
    respectsReduceMotion,
    accessibilityLabel,
    className,
    children,
    ...rest
  } = props;
  const attributes = progressAttributes({
    value,
    buffer,
    smooth,
    type,
    variant,
    thickness,
    trackGap,
    segments,
    showLabel,
    stopIndicator,
    strokeCap,
    amplitude,
    wavelength,
    waveSpeed,
    sweepAngle,
    cornerRadius,
    speed,
    size,
    color,
    trackColor,
    labelColor,
    respectsReduceMotion,
    accessibilityLabel,
  });
  return createElement(
    'loader-kit-progress',
    {
      ...attributes,
      ...rest,
      ...(className === undefined ? {} : { [classAttribute]: className }),
      ref,
    },
    children,
  );
});

LoaderKitProgress.displayName = 'LoaderKitProgress';
