---
description: "Giải đáp về hiệu năng và accessibility của LoaderKit, so sánh với GIF, Lottie và spinner CSS, cùng cách xử lý khi indicator không hiện lên màn hình."
---

# Câu hỏi thường gặp

## Hiệu năng {#performance}

### Indicator có tiếp tục chạy khi main thread đang bận không? {#does-an-indicator-keep-animating-when-the-main-thread-is-busy}

Tùy vào engine của từng nền tảng:

- **iOS và macOS**: engine chuyển spec thành các layer và animation của Core Animation. Hệ thống tự chạy các animation này, nên chúng vẫn chuyển động khi main thread của bạn đang bận.
- **Windows**: control cập nhật các visual của `Microsoft.UI.Composition` ở mỗi frame trên UI thread (`CompositionTarget.Rendering`), nên UI thread bận thì animation cũng bị chậm theo.
- **Android**: view vẽ lên một `Canvas` ở mỗi frame, ngay trên main thread, nên main thread bận thì animation cũng bị chậm theo. Đồng hồ tạm dừng khi view bị detach hoặc bị ẩn.
- **Web**: engine vẽ vào một `<canvas>` ở mỗi animation frame, cũng trên main thread, nên các long task sẽ làm animation khựng lại.

### Một indicator nặng cỡ nào? {#how-heavy-is-an-indicator}

Một indicator có sẵn có từ 1 đến 9 phần tử, mỗi phần tử là một hình đơn giản. Không phải decode ảnh, cũng không có file nào phải tải về. Các spec có sẵn được compile thẳng vào từng engine.

Engine sẽ từ chối spec tùy chỉnh có hơn 10 nghìn phần tử hoặc hơn 10 nghìn cung ring, để một spec không thể đòi vẽ khối lượng không giới hạn. Xem [Giới hạn](/vi/spec/using#limits).

### Có nên dừng indicator khi nó nằm ngoài màn hình không? {#should-i-stop-indicators-that-are-off-screen}

Có. Hãy dừng indicator khi xong việc, hoặc gỡ nó khỏi view tree. Indicator đã dừng mà có `hidesWhenStopped` thì không vẽ gì cả. Trên web, gọi `destroy()` cho `LoaderKitView` nào bạn không cần nữa.

## Accessibility {#accessibility}

### Screen reader sẽ đọc gì? {#what-do-screen-readers-announce}

- **Web**: `<loader-kit>`, cũng là element mà các component React, Vue và Svelte render ra, có `role="progressbar"` không kèm giá trị (một progress bar không xác định) và `aria-label="Loading"`, trừ khi bạn tự đặt label. Khi bị ẩn, nó có `aria-hidden`.
- **Windows**: control tự khai báo với UI Automation là một progress bar.
- **Android và Apple**: view không thêm label nào. Hãy đặt `contentDescription` trên Android hoặc `accessibilityLabel` trên iOS và macOS, hoặc mô tả trạng thái đang tải ở phần UI xung quanh.

```html
<loader-kit indicator="BallPulse" aria-label="Loading messages"></loader-kit>
```

### Reduce motion có được tôn trọng không? {#is-reduced-motion-respected}

Có, mặc định trên mọi nền tảng. Xem [Reduce motion](/vi/guide/playback#reduced-motion).

## So sánh {#comparison}

### Sao không dùng GIF hay ảnh động? {#why-not-a-gif-or-an-animated-image}

GIF cố định kích thước, màu và frame rate, lại có thể bị mờ trên màn hình mật độ điểm ảnh cao. Indicator của LoaderKit được vẽ bằng hình vector theo đúng kích thước view, với màu bất kỳ, theo frame rate của màn hình. Bạn còn có thể đổi tốc độ hoặc freeze một frame ngay lúc runtime.

### Sao không dùng Lottie? {#why-not-lottie}

Lottie phát animation export từ các công cụ thiết kế, rất hợp cho minh họa và chuyển động phức tạp. LoaderKit hẹp hơn: các hình đơn giản trong một layout, được animate bằng track keyframe. Bù lại, spec nhỏ, dễ đọc, dễ viết tay hoặc nhờ [trợ lý AI](/vi/tools/ai) viết, và params giúp một spec bao được nhiều biến thể (ví dụ 3 chấm hay 5 chấm).

### Sao không dùng CSS animation hay spinner của nền tảng? {#why-not-css-animations-or-a-platform-spinner}

Spinner của nền tảng trông mỗi nơi một kiểu, còn CSS thì chỉ chạy trên web. LoaderKit cho bạn cùng một indicator trên Android, iOS, macOS, Windows và web, chỉ từ một cái tên hoặc một spec.

### Nó có giống react-native-loader-kit không? {#is-it-the-same-as-react-native-loader-kit}

[`react-native-loader-kit`](/vi/platforms/react-native) được xây trên LoaderKit. Nó dùng engine Android và iOS, nên có đúng các indicator đó.

## Xử lý sự cố {#troubleshooting}

### Không có gì được vẽ {#nothing-is-drawn}

Kiểm tra lần lượt:

1. **View có kích thước.** Mặc định là 40 x 40. Trên web, một phần tử cha có `display: none` hoặc kích thước bằng 0 sẽ làm nó bị ẩn.
2. **Màu có nhìn thấy được.** Màu mặc định có thể trùng với màu nền: trắng trên Windows, `systemGray` trên Apple, màu foreground của theme trên Android, `currentColor` trên web.
3. **Indicator đang chạy.** Với `hidesWhenStopped` (mặc định), indicator đã dừng sẽ không vẽ gì.
4. **Tên hoặc spec hợp lệ.** Tên không tồn tại hoặc spec không hợp lệ sẽ không vẽ gì và báo lỗi. Đọc `specError` (web, Apple), `onError` (Android View), Logcat (Compose), hoặc `SpecError` và `SpecFailed` (Windows). Tên phân biệt hoa thường: `BallPulse` chứ không phải `ballPulse`.
5. **Trên web, phần tử đã được đăng ký.** Các component React, Vue và Svelte tự đăng ký nó. Nếu bạn tự viết `<loader-kit>` thì nó chỉ hoạt động sau khi `import '@loader-kit/web/element'` đã chạy trong trình duyệt.

### Indicator không chuyển động {#the-indicator-does-not-move}

- `speed` bằng 0 hoặc nhỏ hơn.
- `cycleProgress` đang được đặt. Đặt nó về null để animation chạy.
- Hệ thống đang bật giảm chuyển động nên chỉ hiện frame tĩnh. Đây là hành vi đúng.

### Params của tôi không có tác dụng {#my-params-have-no-effect}

Indicator không khai báo các params đó. Trong số các indicator có sẵn, chỉ `BallPulse` và `BallSpinFadeLoader` nhận params. Tên param không tồn tại bị bỏ qua là có chủ đích. Xem [bảng params](/vi/guide/indicators#the-params).

### Spec tùy chỉnh của tôi bị từ chối {#my-custom-spec-is-rejected}

Chạy nó qua `validate()` hoặc dán vào [playground](/vi/tools/playground): cả hai đều liệt kê mọi lỗi kèm đường dẫn, ví dụ `tracks[0].values must have the same length as keyTimes`. Xem [Dùng spec](/vi/spec/using#errors).
