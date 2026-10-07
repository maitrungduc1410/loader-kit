---
description: "Giúp spec LoaderKit tùy chỉnh được: khai báo params kèm giá trị mặc định, tham chiếu bằng $param ở bất kỳ chỗ nào nhận số, và override cho từng view."
---

# Params

Params giúp một spec bao được nhiều biến thể. Param là một con số có tên và có giá trị mặc định. Người dùng override nó theo tên, ví dụ để hiện 5 chấm thay vì 3.

## Khai báo và dùng param {#declare-and-use-a-param}

1. Khai báo param và giá trị mặc định của nó trong `params`.
2. Viết `{ "$param": "name" }` ở chỗ nhận một con số.

<<< @/examples/params-typing.json

<SpecExample id="params-typing" />

Typing indicator này có ba params:

| Param | Mặc định | Dùng ở |
| --- | --- | --- |
| `count` | 3 | `layout.count` |
| `rise` | -0.15 | điểm cao nhất của `translateY` (âm là đi lên) |
| `dim` | 0.4 | opacity giữa các lần nảy |

## `$param` được dùng ở đâu {#where-param-is-allowed}

Bất kỳ con số nào trong layout, shape, `values` của track hay `rest` đều có thể là một `$param`. Bao gồm cả số lượng, kích thước, khoảng cách, góc, độ dày stroke và bán kính góc.

Các field sau phải là số thuần: `duration`, `duration` của part, `durations`, `stagger`, `keyTimes`, các điểm điều khiển của easing và `perspective`.

## Override params {#overriding-params}

Trên mọi nền tảng, người dùng truyền giá trị override theo tên:

::: code-group

```html [HTML]
<loader-kit params='{"count": 4, "rise": -0.25}'></loader-kit>
```

```ts [TypeScript]
view.params = { count: 4, rise: -0.25 };
```

```kotlin [Kotlin]
loader.params = mapOf("count" to 4.0, "rise" to -0.25)
```

```swift [Swift]
loader.params = ["count": 4, "rise": -0.25]
```

```csharp [C#]
indicator.Params = new Dictionary<string, double> { ["count"] = 4, ["rise"] = -0.25 };
```

:::

## Quy tắc {#rules}

- Override cho những tên mà spec không khai báo sẽ bị bỏ qua.
- Một `$param` trỏ tới param chưa khai báo là lỗi validate: `layout.count uses unknown param "cout"`.
- Giá trị mặc định của param phải là số hữu hạn.
- Các giá trị đếm được làm tròn tới số nguyên gần nhất (0.5 làm tròn lên) và tối thiểu là 1.
- Giá trị lấy từ params không bị `validate()` kiểm tra phạm vi. `sweep` được kẹp vào [0, 2π], và ring không đủ chỗ cho stroke thì không vẽ gì.
- Đổi params sẽ chạy lại animation từ đầu.

::: warning Params và số lượng phần tử
Mảng `stagger` hoặc `durations` phải có một mục cho mỗi phần tử. `validate()` không bao giờ so độ dài danh sách với số phần tử, và khi `count` lấy từ một param thì chỉ khi áp params của người dùng vào mới biết có bao nhiêu phần tử. Vì vậy danh sách quá ngắn sẽ được báo lỗi lúc spec được prepare, chứ không phải bởi `validate()`. Với count lấy từ param, nên dùng `stagger: { "each": ... }`.
:::

## Mẹo đặt tên {#naming-tips}

- Đặt tên theo hiệu ứng, không theo field: `minScale` và `minOpacity` thay vì `value1`.
- Chọn giá trị mặc định đẹp sẵn. Phần lớn người dùng không bao giờ override params.
- Giữ ít params thôi. Một param không ai đổi chỉ làm rối thêm.
