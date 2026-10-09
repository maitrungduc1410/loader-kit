---
description: "Dùng LoaderKit trong React Native: cài react-native-loader-kit, vẽ 50 indicator có sẵn bằng LoaderKitView, hiển thị tiến độ bằng LoaderKitProgress, tự viết spec và nâng cấp từ version 4."
---

# React Native

[`react-native-loader-kit`](https://github.com/maitrungduc1410/react-native-loader-kit) đưa LoaderKit vào app React Native trên Android và iOS. Thư viện chạy chính các engine native được mô tả trên site này, nên bạn có đủ các indicator có sẵn với cùng tên, cùng params, cùng chuyển động, và cùng các mẫu progress.

Thư viện mẫu ở [Indicator có sẵn](/vi/guide/indicators) và [Progress indicator](/vi/guide/progress) có tab React Native: chọn một mẫu, chỉnh rồi copy code.

## Yêu cầu {#requirements}

| Version | React Native | Kiến trúc | Duy trì trên |
| --- | --- | --- | --- |
| 5.x | 0.76 trở lên | Chỉ New Architecture | `master`, npm `latest` |
| 4.x | xem [README v4](https://github.com/maitrungduc1410/react-native-loader-kit/tree/v4#readme) | Cả kiến trúc mới và cũ | branch `v4`, npm `v4-lts` |

Version 5 cần New Architecture, mặc định từ React Native 0.76. App build với `newArchEnabled=false` (Android) hoặc `RCT_NEW_ARCH_ENABLED=0` (iOS) sẽ báo lỗi lúc build, kèm hướng dẫn chuyển sang version 4: `npm install react-native-loader-kit@v4-lts`.

## Cài đặt {#install}

::: code-group

```sh [npm]
npm install react-native-loader-kit
```

```sh [yarn]
yarn add react-native-loader-kit
```

:::

Thư viện có chứa code native. Với iOS, chạy `cd ios && pod install`, rồi build lại app.

**Expo**: chạy `npx expo prebuild`, rồi khởi động lại project. Expo Go không được hỗ trợ.

## Cách dùng {#usage}

```tsx
import { LoaderKitView } from 'react-native-loader-kit';

<LoaderKitView name="BallPulse" color="#7c3aed" style={{ width: 50, height: 50 }} />
```

Params thay đổi một indicator mà không cần viết indicator mới. Mỗi indicator liệt kê params của nó ở [Indicator có sẵn](/vi/guide/indicators); `BallPulse` có `count` và `minScale`:

```tsx
<LoaderKitView name="BallPulse" params={{ count: 5, minScale: 0.5 }} color="#4fc1e9" />
```

Indicator được vẽ trong một hình vuông lấp đầy cạnh ngắn hơn của view.

### Props {#props}

| Prop | Kiểu | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `name` | tên indicator có sẵn | `'BallPulse'` | Indicator có sẵn cần vẽ. Dùng `name` hoặc `spec` |
| `spec` | `IndicatorSpec` | | Indicator tự viết, xem [Spec tùy chỉnh](#custom-specs) |
| `params` | `Record<string, number>` | | Ghi đè params. Tên không tồn tại bị bỏ qua |
| `color` | màu | `'white'` | Màu của mọi phần tử |
| `colors` | mảng màu | | Mỗi phần tử một màu, lặp lại khi có nhiều phần tử hơn. Được ưu tiên hơn `color` |
| `speed` | number | `1` | Tốc độ phát. Đổi giá trị không làm animation bị giật |
| `animating` | boolean | `true` | `false` giữ nguyên frame hiện tại |
| `hidesWhenStopped` | boolean | `false` | Không vẽ gì khi `animating` là `false` |
| `cycleProgress` | number trong [0, 1] | | Freeze tại một điểm trong chu kỳ animation. Đây không phải tiến độ của tác vụ |
| `reduceMotion` | `'system' \| 'never' \| 'always'` | `'system'` | `system` hiện một frame tĩnh khi hệ thống yêu cầu reduce motion |

Mọi prop của `View` đều dùng được. `BUILTIN_INDICATOR_NAMES` liệt kê tên các indicator có sẵn lúc runtime, và `BuiltinIndicatorName` là kiểu của chúng.

## Progress indicator {#progress}

`LoaderKitProgress` cho biết một tác vụ đã chạy được bao nhiêu: 50 mẫu thuộc 10 type. Đặt `value` là một số trong [0, 1], hoặc để `null` cho animation vô định. Value mới chạy mượt theo một đường cong bám theo nhịp cập nhật của bạn và không bao giờ vượt quá value thật; `smooth={false}` thì nhảy thẳng tới value.

```tsx
import { LoaderKitProgress } from 'react-native-loader-kit';

<LoaderKitProgress value={progress} />
<LoaderKitProgress type="linear" variant="wavy" value={progress} />
<LoaderKitProgress type="gauge" value={progress} showLabel size={64} />
<LoaderKitProgress value={null} /> {/* vô định */}

<LoaderKitProgress value={progress} accessibilityLabel="Uploading video">
  <StopButton onPress={cancel} />
</LoaderKitProgress>
```

Xem [Type và variant](/vi/guide/progress#types-and-variants) để biết mọi type và kích thước khung của từng type.

| Prop | Kiểu | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `value` | number trong [0, 1] hoặc `null` | `null` | `null` hiện animation vô định |
| `smooth` | boolean | `true` | Chạy mượt tới value mới |
| `type` | `ProgressType` | `'circular'` | |
| `variant` | `ProgressVariant` | variant đầu tiên của type | |
| `buffer` | number trong [0, 1] | | Phần đã buffer của linear `flat` và `wavy` |
| `size` | number | `48` | Chiều rộng của mọi type trừ linear và border |
| `color` | màu | màu accent | |
| `trackColor` | màu | `color` với độ mờ 24% | |
| `labelColor` | màu | màu chữ | |
| `showLabel` | boolean | `false` | Phần trăm, bên trong hoặc cạnh indicator |
| `thickness` | number | tùy type | |
| `trackGap` | number | `4` | Khoảng cách giữa phần tiến độ và track, hoặc giữa các segment |
| `segments` | number | tùy variant | Số segment, chấm, vạch, bước, cột hoặc cột lưới |
| `stopIndicator` | boolean | `true` | Chấm ở cuối track của linear `flat` và `wavy` |
| `strokeCap` | `'round' \| 'butt'` | `'round'` | |
| `amplitude`, `wavelength`, `waveSpeed` | number | `3`, `40`, `1` cho linear; `2`, `15`, `1` cho circular | Sóng của `wavy` |
| `sweepAngle` | number | `270` | Cung của `gauge`, tính bằng độ |
| `cornerRadius` | number | `12` | Góc bo của `border` |
| `speed` | number | `1` | Tốc độ phát của animation vô định. 0 hoặc nhỏ hơn thì tạm dừng |
| `reduceMotion` | `'system' \| 'never'` | `'system'` | Khi hệ thống yêu cầu reduce motion, `system` nhảy thẳng tới value mới, dừng sóng, sọc và vệt sáng, và làm chậm animation vô định |

`LoaderKitProgress` là một `View` chứa phần vẽ (lấp đầy view) và các children (vẽ phía trên), nên mọi prop của `View` đều dùng được (`pointerEvents`, `borderRadius`, `onLayout`...). Style bạn truyền vào được ưu tiên hơn khung mặc định của type, và phần vẽ co giãn theo khung nhận được: với các type hình vuông, đặt `width` và `height` là 120 trong `style` cho cùng khung với `size={120}`. Các type có `size` căn giữa children, hợp để đặt nút dừng lên circular, pie và gauge; `border` thì bao quanh children.

Trình đọc màn hình đọc nó như một progress bar kèm phần trăm. `accessibilityLabel` đặt tên cho nó (mặc định là "Loading" trên iOS); các children vẫn truy cập được riêng.

## Spec tùy chỉnh {#custom-specs}

::: warning Thử nghiệm
Tự viết spec vẫn đang ở giai đoạn thử nghiệm: cho đến khi schema được công bố là ổn định, một bản minor release vẫn có thể thay đổi nó. Indicator có sẵn không bị ảnh hưởng.
:::

`defineIndicator` kiểm tra spec và throw `InvalidIndicatorError` liệt kê mọi lỗi. `param` tham chiếu tới một param của spec.

```tsx
import { LoaderKitView, defineIndicator, param } from 'react-native-loader-kit';

const Blink = defineIndicator({
  name: 'Blink',
  duration: 0.9, // số giây mỗi chu kỳ
  params: { count: 4, low: 0.15 },
  layout: { type: 'row', count: param('count'), gap: 0.08 },
  shape: { type: 'rect', cornerRadius: 0.25 },
  stagger: { each: 0.15 }, // phần tử i bắt đầu chậm hơn 0.15 * i giây
  tracks: [
    { property: 'opacity', keyTimes: [0, 0.5, 1], values: [1, param('low'), 1], easing: 'easeInOut' },
    { property: 'scaleY', keyTimes: [0, 0.5, 1], values: [1, 0.5, 1], easing: 'easeInOut' },
  ],
});

<LoaderKitView spec={Blink} params={{ count: 6 }} color="white" style={{ width: 60, height: 60 }} />
```

Hãy khai báo spec bên ngoài component, hoặc memo lại: mỗi object spec mới sẽ làm animation chạy lại từ đầu. `validate(spec)` trả về cùng danh sách lỗi mà không throw. Xem [Indicator tùy chỉnh](/vi/spec/) để biết định dạng; cùng một spec chạy được trong app native Android, iOS, macOS, Windows và trên web.

## Nâng cấp từ version 4 {#migrating-from-v4}

- Bắt buộc dùng New Architecture, xem [Yêu cầu](#requirements).
- `animationSpeedMultiplier` giờ là `speed`.
- `IndicatorName` giờ là `BuiltinIndicatorName`, và `ALL_INDICATORS` là `BUILTIN_INDICATOR_NAMES`.
- `CommonIndicatorName`, `IOSOnlyIndicatorName`, `COMMON_INDICATORS`, `IOS_ONLY_INDICATORS`, `isIndicatorAvailableOnPlatform` và `getAvailableIndicators` đã bị bỏ: mọi indicator đều chạy trên cả hai nền tảng. `BallRotateChase` và `CircleStrokeSpin`, trước đây chỉ có trên iOS, giờ chạy được cả trên Android.
- Tên các indicator không đổi.
- Trên Android, các indicator không còn lấy từ AVLoadingIndicatorView, nên timing giờ giống iOS: easing curve, keyframe time, độ trễ khi bắt đầu và kích thước không phụ thuộc mật độ màn hình.

## Xử lý sự cố {#troubleshooting}

### uses-sdk:minSdkVersion XX cannot be smaller than version YY {#uses-sdk-minsdkversion}

LoaderKit cần `minSdkVersion` 24. Thư viện đọc `minSdkVersion`, `compileSdkVersion`, `targetSdkVersion` và `kotlinVersion` từ khối `ext` trong `android/build.gradle` của bạn, đúng như template React Native khai báo, nên hãy nâng `minSdkVersion` ở đó:

```groovy
buildscript {
    ext {
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 35
        kotlinVersion = "2.0.21"
    }
}
```

## Xem thêm {#see-also}

- [Tùy chỉnh](/vi/guide/customizing) và [Điều khiển animation](/vi/guide/playback): params, màu, kích thước, tốc độ, dừng và reduce motion.
- [Dùng spec](/vi/spec/using): validate và các giới hạn.
- [App ví dụ](https://github.com/maitrungduc1410/react-native-loader-kit/tree/master/example) của thư viện.
