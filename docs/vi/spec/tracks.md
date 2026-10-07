---
description: "Track trong spec LoaderKit: animate scale, opacity, rotation, translation và stroke trim bằng keyTimes, values và easing, kèm đường cong và timeline trực tiếp."
---

# Track

Track cho biết một thuộc tính của mọi phần tử trong group thay đổi thế nào trong một chu kỳ. Nó là một danh sách keyframe: `keyTimes` cho biết khi nào, `values` cho biết giá trị gì, còn `easing` cho biết giá trị di chuyển ra sao giữa hai keyframe.

```json
{ "property": "scale", "keyTimes": [0, 0.5, 1], "values": [1, 0.4, 1], "easing": "easeInOut" }
```

## Thuộc tính {#properties}

| Thuộc tính | Rest value | Đơn vị | Ý nghĩa |
| --- | --- | --- | --- |
| `scale` | 1 | hệ số | scale cả chiều rộng và chiều cao |
| `scaleX`, `scaleY` | 1 | hệ số | scale một trục. Được nhân với `scale` |
| `opacity` | 1 | 0 đến 1 | nhân vào kênh alpha của màu phần tử |
| `rotate` | 0 | radian | xoay phần tử theo chiều kim đồng hồ quanh tâm của nó |
| `rotateX`, `rotateY` | 0 | radian | lật 3D quanh trục ngang hoặc trục dọc (xem [Perspective](/vi/spec/timing#perspective)) |
| `translateX`, `translateY` | 0 | đơn vị box | dịch chuyển phần tử. 1 là trọn cạnh box. y âm là đi lên |
| `strokeStart`, `strokeEnd` | 0, 1 | 0 đến 1 | trim các cung của shape [`ring`](/vi/spec/shapes#trimming-with-strokestart-and-strokeend) |

Thuộc tính nào không có track thì giữ nguyên rest value. Mỗi thuộc tính chỉ xuất hiện tối đa một lần trong `tracks` và tối đa một lần trong `groupTracks`.

## keyTimes và values {#keytimes-and-values}

`keyTimes` là các điểm trong chu kỳ, từ 0 (đầu) đến 1 (cuối). `values` có một giá trị cho mỗi key time. Quy tắc:

- `keyTimes` và `values` dài bằng nhau, tối thiểu là 2.
- `keyTimes` nằm trong [0, 1] và không bao giờ giảm.
- Trước key time đầu tiên, giá trị là giá trị đầu tiên. Sau key time cuối cùng, giá trị là giá trị cuối cùng.

Muốn lặp mượt thì bắt đầu ở 0, kết thúc ở 1, và cho giá trị cuối bằng giá trị đầu.

### Giữ nguyên và nhảy cóc {#holding-and-jumping}

Hai giá trị bằng nhau liên tiếp sẽ giữ nguyên giá trị. Hai key time bằng nhau liên tiếp sẽ tạo một bước nhảy tức thì. Ở đây hình vuông thu nhỏ, đứng yên, phóng to, đứng yên, và opacity của nó nhảy từ 1 xuống 0.4 ở giữa chu kỳ:

<<< @/examples/track-steps.json

<SpecExample id="track-steps" />

## Easing {#easing}

Easing định hình chuyển động giữa hai keyframe. Mặc định là `linear`.

| Tên | Cubic bezier | Cảm giác |
| --- | --- | --- |
| `linear` | `[0, 0, 1, 1]` | tốc độ không đổi |
| `ease` | `[0.25, 0.1, 0.25, 1]` | mặc định của CSS và Core Animation |
| `easeIn` | `[0.42, 0, 1, 1]` | bắt đầu chậm |
| `easeOut` | `[0, 0, 0.58, 1]` | kết thúc chậm |
| `easeInOut` | `[0.42, 0, 0.58, 1]` | chậm ở cả đầu và cuối |

Bạn cũng có thể đưa vào một cubic bezier `[x1, y1, x2, y2]`, giống `cubic-bezier()` của CSS. `x1` và `x2` phải nằm trong [0, 1]. `y1` và `y2` có thể vượt ra ngoài, khi đó giá trị sẽ bị overshoot.

<EasingCurve />

Ba chấm dưới đây di chuyển với `linear`, `easeInOut` và bezier overshoot `[0.34, 1.56, 0.64, 1]`:

<<< @/examples/track-easing.json

<SpecExample id="track-easing" />

### Mỗi segment một easing {#one-easing-per-segment}

Một track có `n` key time thì có `n - 1` segment. `easing` có thể là một giá trị dùng chung cho mọi segment, hoặc một danh sách có đúng một easing cho mỗi segment. Ở đây mỗi chấm đi lên với `easeOut`, rơi xuống với `easeIn`, rồi nghỉ:

<<< @/examples/track-per-segment.json

<SpecExample id="track-per-segment" />

::: tip Danh sách được đọc thế nào
Nếu mục đầu tiên của `easing` là một con số, cả danh sách là một bezier. Ngược lại, nó là mỗi segment một easing. Vậy `[0.42, 0, 0.58, 1]` là một bezier, còn `[[0.42, 0, 0.58, 1], "linear"]` là hai segment.
:::

## Translation {#translation}

`translateX` và `translateY` dịch phần tử khỏi vị trí layout của nó, tính bằng đơn vị box. Hai track có cùng key time có thể vẽ ra một đường đi. Chấm này chạy vòng quanh một hình thoi:

<<< @/examples/track-translate.json

<SpecExample id="track-translate" />

## Đọc timeline {#reading-a-timeline}

`<TrackTimeline>` vẽ giá trị của từng phần tử trong một chu kỳ. Đây là indicator có sẵn `BallPulse`: một track scale đi từ 1 xuống `minScale` rồi quay lại, với stagger 0.12 giây.

<TrackTimeline indicator="BallPulse" />

## Quy tắc chính xác {#exact-rules}

[Bản đặc tả](/vi/spec/reference#_5-tracks-and-time) định nghĩa cách lấy mẫu một track và thuật toán easing chính xác mà mọi engine sử dụng.
