---
description: "Timing trong spec LoaderKit: stagger các phần tử, mỗi phần tử một duration riêng, đặt rest value, ghép nhiều part, di chuyển cả group và thêm perspective 3D."
---

# Timing và cách ghép

Trang này nói về cách các phần tử được canh thời gian so với nhau, và cách dựng một indicator từ nhiều group.

## Thời gian của phần tử {#element-time}

Mỗi phần tử có một offset bắt đầu (từ `stagger`) và một độ dài chu kỳ (từ `durations`, `duration` của part hoặc `duration` của spec). Tại thời điểm `t`:

1. `local = t - offset`.
2. Nếu `local` âm, phần tử chưa bắt đầu và hiển thị [rest value](#rest-values) của nó.
3. Ngược lại, tiến độ chu kỳ là `(local mod cycle) / cycle`, từ 0 đến 1, và mọi track được lấy mẫu tại điểm đó.

## Stagger {#stagger}

`stagger` làm trễ các phần tử để chúng chuyển động lần lượt. Nó có hai dạng.

`{ "each": 0.1, "start": 0 }` cho phần tử `i` offset `start + each × i` giây. `start` là tùy chọn.

<<< @/examples/timing-wave.json

<SpecExample id="timing-wave" />

<TrackTimeline example="timing-wave" />

Dạng mảng cho mỗi phần tử một offset riêng, theo index. Mảng phải có ít nhất một mục cho mỗi phần tử. [Ví dụ grid](/vi/spec/layouts#grid) dùng một mảng để làn sóng bắt đầu từ một góc.

### Offset âm {#negative-offsets}

Offset có thể âm. Phần tử có offset âm thì tại `t = 0` đã chạy được một đoạn trong chu kỳ. Dùng cách này khi bạn muốn mọi phần tử hiện ra ngay từ frame đầu, như trong [stack ripple](/vi/spec/layouts#stack): `[0, -0.5, -1]` với chu kỳ 1.5 giây sẽ trải đều ba vòng tròn.

::: tip Chọn offset
Muốn trải đều thì dùng offset bằng `cycle / count`. Với một ring 8 phần tử và chu kỳ 1 giây, `each: 0.125` tạo ra đúng một làn sóng trọn vẹn mỗi chu kỳ.
:::

## Rest value {#rest-values}

Trước khi phần tử bắt đầu, và với mọi thuộc tính không có track, phần tử hiển thị rest value của nó: `scale`, `scaleX`, `scaleY`, `opacity` và `strokeEnd` là 1, mọi thuộc tính khác là 0.

`rest` thay đổi các giá trị này cho một group. Ở đây `rest: { "scale": 0 }` ẩn từng chấm cho đến khi hết thời gian trễ stagger, nên lúc đầu các chấm lần lượt hiện ra:

<<< @/examples/timing-rest.json

<SpecExample id="timing-rest" />

`rest` còn dùng để đặt vị trí phần tử: thuộc tính không có track thì giữ rest value mãi mãi. [Ví dụ part](#parts) dùng `rest.translateY` để đặt một chấm phía trên tâm.

::: info Frame bị freeze sẽ bỏ qua thời gian chờ
Khi view freeze một frame bằng [`cycleProgress`](/vi/guide/playback#cycle-progress), engine bỏ qua các chu kỳ trọn vẹn cho đến khi mọi phần tử đều đã bắt đầu. Vì vậy frame bị freeze không bao giờ hiện phần tử ở rest value lúc khởi động.
:::

## Durations {#durations}

`durations` cho mỗi phần tử một độ dài chu kỳ riêng, theo index. Nó ghi đè `duration` của part và của spec, và phải có ít nhất một mục cho mỗi phần tử. Các phần tử có chu kỳ khác nhau sẽ lúc khớp pha, lúc lệch pha:

<<< @/examples/timing-durations.json

<SpecExample id="timing-durations" />

## Part {#parts}

Một spec là một group phần tử, viết inline. Muốn ghép các group có layout, shape hoặc track khác nhau thì liệt kê chúng trong `parts`. Mỗi part nhận `layout`, `shape`, `tracks`, `stagger`, `duration`, `durations`, `rest` và `groupTracks`.

- Các part được vẽ theo thứ tự, nên part sau nằm đè lên trên.
- Index phần tử nối tiếp qua các part: phần tử đầu tiên của part 1 đứng ngay sau phần tử cuối cùng của part 0. Thiết lập `colors` dùng các index này.
- `duration` của một part đặt độ dài chu kỳ riêng cho part đó. Mặc định là `duration` của spec.
- Spec có `parts` thì không được đặt các field của group ở cấp cao nhất.

Ở đây part 0 là một hình tròn lớn đang pulse. Part 1 là một chấm nhỏ được đặt phía trên bằng `rest`, nhấp nháy với chu kỳ nhanh gấp đôi:

<<< @/examples/timing-parts.json

<SpecExample id="timing-parts" />

## Group track {#group-tracks}

`groupTracks` animate cả một group quanh tâm của box. Chúng hỗ trợ `scale`, `scaleX`, `scaleY`, `opacity`, `rotate`, `translateX` và `translateY`. Chúng chạy theo chu kỳ của group, bắt đầu tại `t = 0` và bỏ qua stagger. `rest` của group không áp dụng cho chúng.

Thay hiệu ứng nhấp nháy của chấm nhỏ bằng một group rotation, và nó sẽ quay quanh tâm:

<<< @/examples/timing-group-tracks.json

<SpecExample id="timing-group-tracks" />

Group track được áp dụng sau transform của phần tử. Nghĩa là track của phần tử di chuyển phần tử bên trong group, còn group track di chuyển cả group.

## Perspective {#perspective}

`rotateX` và `rotateY` lật phần tử trong không gian 3D. `perspective` là khoảng cách từ người xem đến box, tính bằng đơn vị box (mặc định 2.5). Giá trị càng nhỏ thì hiệu ứng 3D càng mạnh. Nó được đặt một lần cho cả spec.

<<< @/examples/timing-perspective.json

<SpecExample id="timing-perspective" />

Indicator có sẵn `SquareSpin` dùng cùng ý tưởng này với perspective là 2.5.

## Thứ tự transform {#transform-order}

Với mỗi điểm của một shape, engine áp dụng lần lượt: scale, `rotateX`, `rotateY`, `rotate`, perspective, dịch tới vị trí của phần tử, rồi đến transform của group. [Bản đặc tả](/vi/spec/reference#_6-rendering-an-element) đưa ra các ma trận cụ thể.
