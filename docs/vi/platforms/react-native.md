---
description: "react-native-loader-kit đưa các indicator của LoaderKit vào app React Native trên Android và iOS. Cài từ npm và xem tài liệu riêng của thư viện này."
---

# React Native

[`react-native-loader-kit`](https://github.com/maitrungduc1410/react-native-loader-kit) là thư viện React Native được xây trên LoaderKit. Nó dùng chính các engine native Android và iOS được mô tả trên site này, nên bạn có đủ 33 indicator có sẵn với cùng tên, cùng params và cùng chuyển động.

## Cài đặt {#install}

::: code-group

```sh [npm]
npm install react-native-loader-kit
```

```sh [yarn]
yarn add react-native-loader-kit
```

:::

Thư viện có chứa code native. Chạy `npx pod-install` cho iOS, rồi build lại app.

## Cách dùng {#usage}

```tsx
import { LoaderKitView } from 'react-native-loader-kit';

<LoaderKitView name="BallPulse" params={{ count: 5 }} color="#7c3aed" style={{ width: 50, height: 50 }} />

// Indicator tự viết: truyền spec thay cho name.
<LoaderKitView spec={mySpec} color="white" style={{ width: 60, height: 60 }} />
```

Hãy khai báo spec bên ngoài component (hoặc memo lại): mỗi object spec mới sẽ làm animation chạy lại từ đầu.

## Tài liệu {#documentation}

Thư viện có tài liệu riêng, gồm các component, props và ví dụ. Xem [repo react-native-loader-kit](https://github.com/maitrungduc1410/react-native-loader-kit).

Các khái niệm trên site này áp dụng nguyên vẹn:

- [Indicator có sẵn](/vi/guide/indicators): tên và params.
- [Tùy chỉnh](/vi/guide/customizing): params, màu và kích thước.
- [Điều khiển animation](/vi/guide/playback): tốc độ, dừng, freeze một frame và reduce motion.
- [Indicator tùy chỉnh](/vi/spec/): định dạng spec mà các engine đọc.
