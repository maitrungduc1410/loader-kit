---
description: "react-native-loader-kit 把 LoaderKit 带到 React Native。从 npm 安装，详细用法见它自己的文档。"
---

# React Native

[`react-native-loader-kit`](https://github.com/maitrungduc1410/react-native-loader-kit) 是一个基于 LoaderKit 构建的 React Native 库。它使用本站介绍的 Android 和 iOS 原生引擎，所以同样提供 33 个内置加载动画，名称、参数和动效都完全一致。

## 安装 {#install}

::: code-group

```sh [npm]
npm install react-native-loader-kit
```

```sh [yarn]
yarn add react-native-loader-kit
```

:::

这个库包含原生代码。iOS 需要先运行 `npx pod-install`，然后重新构建 App。

## 用法 {#usage}

```tsx
import { LoaderKitView } from 'react-native-loader-kit';

<LoaderKitView name="BallPulse" params={{ count: 5 }} color="#7c3aed" style={{ width: 50, height: 50 }} />

// 自定义加载动画：用 spec 代替 name。
<LoaderKitView spec={mySpec} color="white" style={{ width: 60, height: 60 }} />
```

spec 请定义在组件外部（或用 useMemo 缓存）：每次传入新的 spec 对象，动画都会从头开始。

## 文档 {#documentation}

这个库有自己的文档，介绍了它的组件、props 和示例。见 [react-native-loader-kit 仓库](https://github.com/maitrungduc1410/react-native-loader-kit)。

本站的概念可以直接套用：

- [内置加载动画](/zh/guide/indicators)：名称和参数。
- [自定义](/zh/guide/customizing)：参数、颜色和尺寸。
- [播放控制](/zh/guide/playback)：速度、停止、定格一帧以及减弱动态效果。
- [自定义加载动画](/zh/spec/)：引擎读取的 spec 格式。
