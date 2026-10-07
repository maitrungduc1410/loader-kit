---
description: "Viết spec LoaderKit cùng trợ lý AI: vòng lặp mô tả, sinh, validate và preview, các prompt mẫu để copy, cùng checklist những lỗi AI hay mắc."
---

# Viết spec với AI

Spec của LoaderKit là một file JSON nhỏ, có schema công khai và bản đặc tả chặt chẽ. Vì vậy đây là việc rất hợp để giao cho trợ lý AI: bạn mô tả chuyển động, AI viết JSON, và công cụ cho bạn biết ngay spec có hợp lệ hay không.

::: warning Thử nghiệm
Spec tùy chỉnh vẫn đang ở giai đoạn thử nghiệm. Cho đến khi schema được công bố là ổn định, một bản minor release vẫn có thể thay đổi nó. Hãy đưa cho AI schema và SPEC hiện tại, đừng để nó dựa vào trí nhớ.
:::

## Vì sao cách này hiệu quả {#why-this-works-well}

- **Schema đọc được bằng máy.** [JSON Schema](/vi/tools/json-schema) liệt kê mọi field, kiểu và enum. AI đọc được nó thì không phải đoán tên field.
- **Quy tắc được viết rõ ràng.** [Bản đặc tả](/vi/spec/reference) định nghĩa chính xác đơn vị, góc, cách lấy mẫu và easing. Gần như không có chỗ để hiểu sai.
- **Lỗi được báo cụ thể.** `validate()` trả về thông báo kèm đường dẫn, như `tracks[0].values must have the same length as keyTimes`. Bạn có thể dán nguyên văn lại cho AI.
- **Phản hồi tức thì.** [Playground](/vi/tools/playground) hiện kết quả trực tiếp, và share link giúp bạn gửi qua gửi lại đúng spec đó.

## Đưa tài liệu cho AI {#give-the-assistant-the-docs}

Site có publish hai file text thuần dành cho các language model:

| File | Nội dung |
| --- | --- |
| [`/llms.txt`](https://maitrungduc1410.github.io/loader-kit/llms.txt) | Mục lục ngắn của tài liệu, kèm link |
| [`/llms-full.txt`](https://maitrungduc1410.github.io/loader-kit/llms-full.txt) | Toàn bộ tài liệu trong một file |

Và schema: `https://maitrungduc1410.github.io/loader-kit/schema/v1.json`.

Nếu AI của bạn duyệt web được, hãy đưa nó các URL này. Nếu không, dán schema và những phần SPEC bạn cần vào cuộc trò chuyện.

## Vòng lặp {#the-loop}

1. **Mô tả** indicator: phần tử, layout, chuyển động, timing và cảm giác. Nếu có indicator có sẵn nào gần giống thì nhắc tới nó.
2. **Sinh** spec bằng AI.
3. **Validate** spec. Dán nó vào [playground](/vi/tools/playground), hoặc chạy `validate()` từ `@loader-kit/spec`.
4. **Preview** trong playground ở cả kích thước nhỏ và lớn, trên nền sáng và nền tối. Tua `cycleProgress` để kiểm tra từng frame.
5. **Tinh chỉnh.** Dán lỗi lại cho AI, hoặc mô tả chỗ thấy chưa ổn ("nhanh quá", "các chấm chồng lên nhau"). Lặp lại từ bước 3.

Khi đã ưng ý, thêm dòng `$schema`, lưu thành file và [load nó trong app](/vi/spec/using).

## Prompt mẫu {#sample-prompts}

Copy một prompt và thay các phần nằm trong ngoặc nhọn. Các prompt được giữ bằng tiếng Anh để khớp với tên field và thông báo lỗi; phần mô tả indicator thì bạn viết bằng tiếng Việt cũng được.

### System prompt {#system-prompt}

Dùng một lần ở đầu cuộc trò chuyện, hoặc đặt làm custom instructions.

```text
You write LoaderKit indicator specs (JSON, schema version 1).
Schema: https://maitrungduc1410.github.io/loader-kit/schema/v1.json
Specification: https://maitrungduc1410.github.io/loader-kit/spec/reference
Docs for models: https://maitrungduc1410.github.io/loader-kit/llms-full.txt

Rules:
- Output one JSON object only, no comments. Start with
  "$schema": "https://maitrungduc1410.github.io/loader-kit/schema/v1.json" and "schemaVersion": 1.
- All lengths are fractions of a square box of side 1. Origin top-left, y points down.
- Angles are radians. Positive is clockwise. 0 points right, -1.570796327 is the top.
  A full turn is 6.283185307. A sweep must not exceed 6.283185307.
- Times are seconds. "duration" is one cycle.
- A track has keyTimes (non-decreasing, within 0 to 1, start at 0 and end at 1 for a loop)
  and values of the same length. easing is a name (linear, ease, easeIn, easeOut,
  easeInOut), a cubic bezier [x1, y1, x2, y2] with x1 and x2 in [0, 1], or a list with
  exactly one easing per segment.
- At most one track per property in a list. strokeStart and strokeEnd need a ring shape.
- Use stagger { "each": seconds } to offset elements. Negative offsets start mid-cycle.
- Declare params with defaults and reference them as { "$param": "name" }.
- Colors are not part of the spec.
After the JSON, explain the design in three short bullet points.
```

### Indicator mới từ một đoạn mô tả {#a-new-indicator-from-a-description}

```text
Make a three-dot typing indicator, like a chat app shows while someone is typing.
The dots sit in a row in the middle of the box. Each dot rises a little and becomes
fully opaque, then falls back and dims, one after another from left to right.
One cycle should last about 1.2 seconds, with a short pause where all dots rest.
Expose params for the number of dots and the rise height.
```

### Chuyển một spinner CSS {#convert-a-css-spinner}

```text
Turn this CSS keyframes spinner into a LoaderKit spec. Keep the timing and easing.
Convert degrees to radians and pixel sizes to fractions of the box
(the CSS container is <40>px). Map animation-delay to stagger.

<paste the HTML and CSS here>
```

### Đổi cảm giác chuyển động {#change-the-feel}

```text
Here is a LoaderKit spec. Make it feel calmer: a longer cycle, softer easing,
a smaller scale change and less contrast in opacity. Keep the same layout and
the same number of elements. Explain each change in one line.

<paste the spec here>
```

### Sửa lỗi validate {#fix-validation-errors}

```text
validate() from @loader-kit/spec returned these errors for the spec below.
Explain each error in one sentence, then return the fixed spec.
Change only what is needed to fix the errors.

Errors:
<paste the errors here>

Spec:
<paste the spec here>
```

### Bắt đầu từ một indicator có sẵn {#start-from-a-built-in}

```text
Start from the LoaderKit built-in "BallSpinFadeLoader" (a ring of dots that fade
and shrink one after another). Write a variant with 12 thin lines instead of dots,
each pointing away from the center (ring layout with orient: true and the line
shape). Keep the fade.
```

### Giải thích một spec {#explain-a-spec}

```text
Explain what this LoaderKit spec draws, frame by frame, for one cycle.
Describe where each element is at keyTimes 0, 0.25, 0.5 and 0.75.

<paste the spec here>
```

## Checklist những lỗi AI hay mắc {#checklist-of-common-ai-mistakes}

Kiểm tra các điểm này trước khi dán spec vào app. `validate()` bắt được nhóm đầu. Nhóm thứ hai là JSON hợp lệ nhưng nhìn sai.

**`validate()` bắt được**

- `keyTimes` và `values` dài khác nhau.
- `keyTimes` có chỗ bị giảm, hoặc vượt ra ngoài [0, 1].
- Danh sách easing có số mục sai. Nó cần đúng `keyTimes.length - 1` mục.
- Một `$param` trỏ tới param chưa được khai báo trong `params`.
- Hai track cùng animate một thuộc tính.
- `strokeStart` hoặc `strokeEnd` được dùng trên shape không phải `ring`.
- Một `sweep` hơi lớn hơn 2π, ví dụ `6.2832`. Hãy dùng `6.283185307`.
- Thiếu `schemaVersion`, hoặc spec không có track nào.

**Hợp lệ nhưng nhìn sai**

- **Dùng độ thay vì radian.** `"values": [0, 360]` quay 57 vòng mỗi chu kỳ. Một vòng là `6.283185307`.
- **Dùng pixel thay vì đơn vị box.** `"translateY": -10` đẩy phần tử đi xa mười lần kích thước box. Độ dài là tỉ lệ của box: `-0.1` là một phần mười box.
- **keyTimes không bắt đầu từ 0 hoặc không kết thúc ở 1.** Giá trị đứng yên trước key time đầu và sau key time cuối, nhìn có thể giống bị khựng.
- **Vòng lặp bị giật.** Giá trị cuối khác giá trị đầu, nên phần tử bật về chỗ cũ ở cuối mỗi chu kỳ. Với rotation từ 0 đến một vòng trọn vẹn thì không sao, nhưng với scale thì không ổn.
- **Quên stagger.** Mọi phần tử chuyển động cùng lúc trong khi mô tả nói "lần lượt từng cái".
- **Stagger dài hơn chu kỳ.** Khi `each` × `count` lớn hơn `duration` nhiều, các làn sóng chồng lên nhau và nhìn lộn xộn.
- **Phần tử tràn ra ngoài box.** Translation hoặc scale quá lớn đẩy shape ra ngoài mép, nơi view có thể cắt mất.
- **Trục y bị ngược.** `translateY` âm là đi lên.
- **Đưa màu vào spec.** Màu được đặt trên view, không nằm trong spec. Field `color` sẽ bị engine bỏ qua và bị schema đánh dấu.

## Xem thêm {#see-also}

- [Indicator tùy chỉnh](/vi/spec/): học định dạng bằng cách tự dựng một spec.
- [JSON Schema](/vi/tools/json-schema): thiết lập editor và kiểm tra trong CI.
- [Dùng spec](/vi/spec/using): các API validate và thông báo lỗi.
