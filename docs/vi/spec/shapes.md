---
description: "Shape trong spec LoaderKit: circle, cung tròn, rect, ring có segment và stroke trim, triangle và line, mỗi loại có ví dụ trực tiếp để bạn tua từng frame."
---

# Shape

Mọi phần tử trong một group vẽ cùng một shape, đặt giữa phần tử và lấp đầy chiều rộng, chiều cao của nó. Mỗi part có đúng một shape. Muốn trộn nhiều shape thì dùng [part](/vi/spec/timing#parts).

| Shape | Field (mặc định) | Vẽ ra |
| --- | --- | --- |
| `circle` | `startAngle` (-π/2), `sweep` (2π) | một hình elip đặc, hoặc một lát của nó |
| `rect` | `cornerRadius` (0) | một hình chữ nhật đặc |
| `ring` | `strokeWidth`, `startAngle` (-π/2), `sweep` (2π), `segments` (1) | một đường tròn có stroke, hoặc các cung của nó |
| `triangle` | không có | một tam giác đặc, đỉnh hướng lên |
| `line` | không có | một thanh có hai đầu bo tròn hoàn toàn |

Góc tính bằng radian. -π/2 (khoảng -1.5708) là phía trên, 0 là bên phải, và cung đi theo chiều kim đồng hồ.

## circle {#circle}

Một hình elip đặc nội tiếp trong phần tử. Nếu phần tử vuông thì đó là hình tròn.

Với `sweep` nhỏ hơn 2π, chỉ một phần của hình tròn được vẽ: vùng nằm giữa cung tròn (từ `startAngle` đến `startAngle + sweep`) và đoạn thẳng nối hai đầu cung. `sweep` = π cho ra nửa hình tròn. Với 3π/2 là hình tròn bị dây cung cắt mất một bên.

<<< @/examples/shape-circle-arc.json

<SpecExample id="shape-circle-arc" />

## rect {#rect}

Một hình chữ nhật đặc. `cornerRadius` là tỉ lệ so với cạnh ngắn hơn của phần tử, từ 0 (góc vuông) đến 0.5 (hai đầu bo tròn hoàn toàn).

<<< @/examples/shape-rect.json

<SpecExample id="shape-rect" />

## ring {#ring}

Một đường tròn có stroke. `strokeWidth` là tỉ lệ so với cạnh ngắn hơn của phần tử. Mép ngoài của stroke chạm vào phần tử, nên ring không bao giờ tràn ra ngoài. Hai đầu stroke là đầu bằng.

`sweep` chỉ vẽ một cung của đường tròn:

<<< @/examples/shape-ring.json

<SpecExample id="shape-ring" />

### Segment {#segments}

`segments` chia ring thành từng ấy cung, cách đều nhau. Mỗi cung bắt đầu tại `startAngle + k × 2π / segments` và dài `sweep`.

<<< @/examples/shape-ring-segments.json

<SpecExample id="shape-ring-segments" />

### Trim bằng strokeStart và strokeEnd {#trimming-with-strokestart-and-strokeend}

Ring có thêm hai thuộc tính mà track có thể animate: `strokeStart` (rest value 0) và `strokeEnd` (rest value 1). Chúng trim mọi cung, tính theo tỉ lệ của cung, giống `strokeStart` và `strokeEnd` trong Core Animation. Khi `strokeEnd` nhỏ hơn hoặc bằng `strokeStart` thì không có gì được vẽ.

Ở đây đầu cuối dài ra từ 0 đến 1 trong nửa đầu chu kỳ, rồi đầu bắt đầu đuổi theo trong nửa sau:

<<< @/examples/shape-ring-trim.json

<SpecExample id="shape-ring-trim" />

::: warning Chỉ dành cho ring
Track và rest value của `strokeStart`, `strokeEnd` cần shape `ring`. Dùng với shape khác thì `validate()` sẽ báo lỗi.
:::

::: tip Hình tròn há ra như cái miệng
Một ring có `strokeWidth` bằng 0.5 chính là một hình tròn đặc. Trim nó sẽ mở ra một lát cắt. Indicator có sẵn `Pacman` hoạt động theo cách này.
:::

## triangle {#triangle}

Một tam giác cân đặc: đỉnh ở giữa phía trên, hai góc ở dưới bên phải và dưới bên trái.

<<< @/examples/shape-triangle.json

<SpecExample id="shape-triangle" />

## line {#line}

Một hình chữ nhật đặc có bán kính góc bằng một nửa cạnh ngắn hơn: một thanh có hai đầu tròn. Dùng nó trong row để làm các thanh equalizer, hoặc trong ring có định hướng để làm spinner.

<<< @/examples/shape-line.json

<SpecExample id="shape-line" />

## Quy tắc chính xác {#exact-rules}

[Bản đặc tả](/vi/spec/reference#_4-shapes) định nghĩa chính xác từng shape, kể cả cách đo các cung trên hình elip.
