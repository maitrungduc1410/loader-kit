'use client';
import { createElement, forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ForwardedRef, HTMLAttributes } from 'react';
import { loaderKitAttributes, sizeLength, toJson } from './attributes.ts';
import type { LoaderKitProps } from './attributes.ts';
import type { LoaderKitElementApi } from './element.ts';
import { classAttribute } from './react-class.ts';
import './element.ts';

export interface LoaderKitReactProps extends LoaderKitProps, Omit<HTMLAttributes<HTMLElement>, 'color' | 'onError'> {}

/**
 * A LoaderKit indicator. Renders a `<loader-kit>` element, 40px by 40px unless `size` or CSS sizes
 * it, so it works with server-side rendering. The ref is the element.
 */
export const LoaderKit = forwardRef(function LoaderKit(
  props: LoaderKitReactProps,
  ref: ForwardedRef<LoaderKitElementApi>,
) {
  const {
    indicator,
    spec,
    params,
    color,
    colors,
    speed,
    animating,
    hidesWhenStopped,
    cycleProgress,
    respectsReduceMotion,
    size,
    onError,
    className,
    style,
    ...rest
  } = props;

  const specText = useMemo(() => toJson(spec), [spec]);
  const paramsText = useMemo(() => toJson(params), [params]);
  const length = sizeLength(size);

  const element = useRef<LoaderKitElementApi | null>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const reported = useRef<string | null>(null);
  useEffect(() => {
    const node = element.current;
    if (!node) return undefined;
    // Strict Mode runs this effect twice, so the same message is delivered only once.
    const deliver = (message: string | null) => {
      if (message === reported.current) return;
      reported.current = message;
      onErrorRef.current?.(message);
    };
    const listener = (event: Event) => deliver((event as CustomEvent<{ message: string | null }>).detail.message);
    node.addEventListener('loaderkit-error', listener);
    // The element reports a problem as soon as it connects, before this effect listens.
    if (typeof node.specError === 'string') deliver(node.specError);
    return () => node.removeEventListener('loaderkit-error', listener);
  }, []);

  const setRef = useCallback(
    (node: LoaderKitElementApi | null) => {
      element.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const attributes = loaderKitAttributes({
    indicator,
    spec: specText,
    params: paramsText,
    color,
    colors,
    speed,
    animating,
    hidesWhenStopped,
    cycleProgress,
    respectsReduceMotion,
  });

  const sized: CSSProperties | undefined = length === null ? style : { width: length, height: length, ...style };
  return createElement('loader-kit', {
    ...attributes,
    ...rest,
    ...(className === undefined ? {} : { [classAttribute]: className }),
    style: sized,
    ref: setRef,
  });
});

LoaderKit.displayName = 'LoaderKit';
