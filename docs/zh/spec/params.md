---
description: "让 LoaderKit spec 可配置：声明带默认值的参数，在任何允许数字的位置用 $param 引用，并按视图分别覆盖。"
---

# 参数

有了参数，一份 spec 就能覆盖多个变体。参数是带默认值的具名数字，用户可以按名称覆盖它，比如显示 5 个点而不是 3 个。

## 声明并使用参数 {#declare-and-use-a-param}

1. 在 `params` 中声明参数和默认值。
2. 在允许数字的地方写 `{ "$param": "name" }`。

<<< @/examples/params-typing.json

<SpecExample id="params-typing" />

这个“正在输入”加载动画有三个参数：

| 参数 | 默认值 | 用在哪里 |
| --- | --- | --- |
| `count` | 3 | `layout.count` |
| `rise` | -0.15 | `translateY` 的最高点（负值表示向上） |
| `dim` | 0.4 | 两次跳动之间的不透明度 |

## 哪些地方可以用 `$param` {#where-param-is-allowed}

布局、形状、track 的 `values` 或 `rest` 中的任何数字，都可以是 `$param`，包括数量、尺寸、间距、角度、描边宽度和圆角半径。

以下字段必须是普通数字：`duration`、部件的 `duration`、`durations`、`stagger`、`keyTimes`、缓动控制点和 `perspective`。

## 覆盖参数 {#overriding-params}

在每个平台上，用户都按名称传入覆盖值：

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

## 规则 {#rules}

- spec 没有声明的参数名，其覆盖值会被忽略。
- 如果 `$param` 引用了未声明的参数，就是校验错误：`layout.count uses unknown param "cout"`。
- 参数默认值必须是有限数字。
- 数量会四舍五入取整（0.5 向上取整），且最小为 1。
- 来自参数的值不会被 `validate()` 做范围检查。`sweep` 会被限制在 [0, 2π] 内，而没有空间容纳描边的圆环什么都不画。
- 修改参数会让动画重新开始。

::: warning 参数与元素个数
`stagger` 数组或 `durations` 必须每个元素一项。`validate()` 从不比较列表长度和元素个数；而且当 `count` 来自参数时，要等用户的参数代入后才知道元素有多少个。所以列表太短的问题会在准备 spec 时才报告，`validate()` 发现不了。数量由参数决定时，优先使用 `stagger: { "each": ... }`。
:::

## 命名建议 {#naming-tips}

- 名称要描述效果，而不是字段：用 `minScale`、`minOpacity`，别用 `value1`。
- 默认值本身就要好看。大多数用户从来不会覆盖参数。
- 参数要少而精。没人改的参数只是噪音。
