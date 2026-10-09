---
description: "react-native-loader-kit brings the LoaderKit indicators to React Native apps on Android and iOS. Install it from npm and read its own documentation."
---

# React Native

[`react-native-loader-kit`](https://github.com/maitrungduc1410/react-native-loader-kit) is a React Native library built on LoaderKit. It uses the native Android and iOS engines described on this site, so you get the same built-in indicators, with the same names, params and motion.

## Install

::: code-group

```sh [npm]
npm install react-native-loader-kit
```

```sh [yarn]
yarn add react-native-loader-kit
```

:::

The library contains native code. Run `npx pod-install` for iOS, then rebuild the app.

## Usage

```tsx
import { LoaderKitView } from 'react-native-loader-kit';

<LoaderKitView name="BallPulse" params={{ count: 5 }} color="#7c3aed" style={{ width: 50, height: 50 }} />

// A custom indicator: pass a spec instead of a name.
<LoaderKitView spec={mySpec} color="white" style={{ width: 60, height: 60 }} />
```

Define specs outside of components (or memoize them): a new spec object restarts the animation.

## Documentation

The library has its own documentation, with its components, props and examples. See the [react-native-loader-kit repository](https://github.com/maitrungduc1410/react-native-loader-kit).

The concepts on this site apply as they are:

- [Built-in indicators](/guide/indicators): names and params.
- [Customizing](/guide/customizing): params, colors and size.
- [Playback](/guide/playback): speed, stopping, freezing a frame and reduced motion.
- [Custom indicators](/spec/): the spec format that the engines read.
