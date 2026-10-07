---
description: "Layout trong spec LoaderKit: đặt phần tử vào unit box bằng single, stack, row, grid và ring, và xem từng field làm thay đổi box của phần tử ra sao."
---

# Layout

Layout đặt các phần tử vào box. Nó cho mỗi phần tử một tâm, chiều rộng, chiều cao và, với ring có định hướng, một góc xoay. Mọi độ dài đều là tỉ lệ so với cạnh box, box chạy từ 0 đến 1 trên cả hai trục, trục y hướng xuống.

Chọn một loại layout và đổi các field của nó. Các ô được đánh số là các phần tử, theo thứ tự index.

<LayoutVisualizer />

| Layout | Field (mặc định) | Phần tử |
| --- | --- | --- |
| `single` | `size` (1), `width` (`size`), `height` (`size`), `x` (0.5), `y` (0.5) | một phần tử, tâm tại `(x, y)` |
| `stack` | `count`, và các field giống `single` | `count` phần tử tại cùng một chỗ |
| `row` | `count`, `gap`, `itemWidth`, `itemHeight` | một hàng ngang, căn giữa theo chiều dọc |
| `grid` | `columns`, `rows`, `gap` | một lưới lấp đầy box, lần lượt từng hàng |
| `ring` | `count`, `itemSize`, `itemWidth`, `itemHeight`, `startAngle` (0), `orient` (false) | các phần tử trên một vòng tròn, theo chiều kim đồng hồ |

Các giá trị đếm (`count`, `columns`, `rows`) được làm tròn tới số nguyên gần nhất và tối thiểu là 1. Bất kỳ con số nào cũng có thể là một [`$param`](/vi/spec/params).

## single {#single}

Một phần tử. Không có field nào thì nó lấp đầy box. Dùng `width` và `height` cho phần tử không vuông, và `x`, `y` để dời tâm của nó.

<<< @/examples/layout-single.json

<SpecExample id="layout-single" />

## stack {#stack}

`count` phần tử chồng lên nhau, tất cả cùng một chỗ. Stack hữu ích khi đi cùng stagger, để mỗi bản sao ở một điểm khác nhau trong chu kỳ. Hiệu ứng ripple này dùng offset stagger âm, nên ngay từ frame đầu tiên ba vòng tròn đã nằm rải đều trong chu kỳ, thay vì cùng bắt đầu một lúc (xem [Stagger](/vi/spec/timing#stagger)).

<<< @/examples/layout-stack.json

<SpecExample id="layout-stack" />

## row {#row}

`count` phần tử nằm cạnh nhau, giữa hai phần tử là `gap`. Tâm theo chiều dọc luôn là 0.5.

- Không có `itemWidth` thì các phần tử và khoảng cách lấp đầy chiều ngang của box: mỗi phần tử rộng `(1 - gap × (count - 1)) / count`.
- Có `itemWidth` thì hàng dùng đúng chiều rộng phần tử đó và được căn giữa.
- `itemHeight` mặc định bằng chiều rộng phần tử, nên phần tử là hình vuông. Đặt nó nếu bạn muốn các thanh cao.

<<< @/examples/layout-row.json

<SpecExample id="layout-row" />

## grid {#grid}

`columns × rows` phần tử lấp đầy box, đánh số lần lượt từng hàng từ góc trên bên trái. `gap` là khoảng cách giữa hai ô, cả theo chiều ngang lẫn chiều dọc.

Ví dụ này dùng một mảng stagger (mỗi phần tử một offset) để làn sóng bắt đầu từ góc dưới bên trái.

<<< @/examples/layout-grid.json

<SpecExample id="layout-grid" />

## ring {#ring}

`count` phần tử trên một vòng tròn, cách đều nhau. Phần tử 0 nằm ở `startAngle` (0 là bên phải tâm) và các phần tử còn lại nối tiếp theo chiều kim đồng hồ. Bán kính là `0.5 - itemSize / 2`, nên mép ngoài của các phần tử chạm vào box.

<<< @/examples/layout-ring.json

<SpecExample id="layout-ring" />

### Phần tử có định hướng {#oriented-elements}

`itemWidth` và `itemHeight` đổi kích thước phần tử nhưng không đổi bán kính, bán kính vẫn tính từ `itemSize`. Với `orient: true`, mỗi phần tử được xoay sao cho đỉnh của nó hướng ra xa tâm. Kết hợp với shape `line` là ra một spinner kinh điển.

<<< @/examples/layout-ring-orient.json

<SpecExample id="layout-ring-orient" />

::: tip Thứ tự phần tử và màu
Index của phần tử đi theo thứ tự của layout: trái sang phải với row, lần lượt từng hàng với grid, theo chiều kim đồng hồ từ `startAngle` với ring. Mảng stagger, `durations` và thiết lập `colors` đều dùng các index này.
:::

## Công thức chính xác {#exact-formulas}

[Bản đặc tả](/vi/spec/reference#_3-parts-and-layouts) đưa ra công thức chính xác cho từng layout.
