# Jarvis 眼神画稿与屏幕帧

[manifest.json](manifest.json) 是跨语言入口。它收录已确认的 24 种眼神、四种模式和 96 个组合。每个组合有独立的 320 × 240 SVG，可直接在浏览器打开或交给 SVG 渲染器。用 `states.listening.variants.work.frame` 取到[工作模式倾听](frames/work/listening.svg)。交互业务事件、模式叠加和渐进切换由[交付指南](../../docs/jarvis-eyes-handoff.md)定义。

## 取一张能送到屏幕的帧

1. 解压后用本地浏览器打开 [export-frame.html](export-frame.html)，保留同目录的 JS 文件。
2. 选择模式、眼神和尺寸。时刻留空时导出静止姿态。输入非负毫秒数会对该表情动画采样，例如陪伴模式的“兴奋”在 1,300 ms 可看到彩带。
3. 按显示驱动的输入要求选择 PNG、RGB565 大端、RGB565 小端或 SVG，点击“保存当前帧”。图形导出在浏览器本地完成。
4. 可先使用已导出的[工作模式倾听 PNG](examples/work-listening-320x240-still.png) 和[同帧 RGB565 大端数据](examples/work-listening-320x240-still.be.rgb565)校准驱动。

RGB565 使用行优先扫描，从左上角开始。字段依次为 R5、G6、B5。文件从第一个像素开始，无头部、无透明通道、行尾无补齐。字节序描述同一个 16 位字在文件里的先后顺序，例如纯红色的大端字节为 `F8 00`，小端为 `00 F8`。320 × 240 占 153,600 字节，720 × 720 占 1,036,800 字节。驱动若配置为 BGR 或需要字节交换，应在显示适配层匹配该配置。

以下示例适用于没有整帧缓冲的 MCU，可逐行读取已随包提供的大端数据。接入时将 `lcd_set_window` 和 `lcd_write_bytes` 对应到具体屏幕库，本例约定窗口坐标右端和下端均包含在内。

```c
// fp 为已用二进制模式打开的 320 × 240 大端 RGB565 文件
bool draw_320x240_rgb565_be(FILE *fp) {
    uint8_t row[320 * 2];
    lcd_set_window(0, 0, 319, 239);
    for (unsigned y = 0; y < 240; ++y) {
        if (fread(row, 1, sizeof row, fp) != sizeof row) return false;
        if (!lcd_write_bytes(row, sizeof row)) return false;
    }
    return true;
}
```

## 命令行和资产更新

从仓库根目录或解压后的根目录运行。生成器只用 Node.js 22+ 的标准库。

```sh
node design/eyes/export.mjs check
node design/eyes/export.mjs frame listening work --size small --out work-listening.svg
node design/eyes/export.mjs frame excited companion --size square --time 1300 --out celebration.svg
node design/eyes/export.mjs frame happy daily --plain --out smile.svg
```

`--time` 是绘制时钟，单位毫秒。单张动画采样默认将同一数值用作本表情已播放时长。要分别控制两者，可加 `--age 500`。稳定静帧的眼睛完整睁开，彩带结束且符号保留。`--plain` 关闭装饰符号、模式图标和满屏特效，保留双眼内部的瞳孔、高光和造型细节。灰阶、亮度和实机观看距离留给实际屏测。

[artwork.js](artwork.js) 是网页与生成器共用的原画实现。改动它后运行以下命令更新清单和所有标准静帧。`check` 会按当前源代码重绘，并逐文件比较内容。示例 PNG 和 RGB565 可以从上面的导出页重新生成。

```sh
node design/eyes/export.mjs generate
node design/eyes/export.mjs check
```

## 清单的字段和坐标

| 字段 | 使用方式 |
| --- | --- |
| `format` | 本版为 `jarvis-eye-artwork/1`。具有其他值时先核对结构版本。 |
| `modes[id]` | `color` 是眼形主色，`accent` 是模式强调色。字段 `base`、`listen`、`talk` 给出三种核心活动的眼形。 |
| `states[id]` | `name`、`title`、`desc`、`note` 给出中文名称、用途、表达及机械配合说明。`group` 值 0、1、2 依次表示交互状态、情绪、安静／设备状态。`motion` 和 `dec` 对应原画的动作与符号。 |
| `states[id].variants[mode]` | `eyes` 是解析完模式后的左、右形状键。`frame` 是相对于清单位置的独立静帧路径。 |
| `paths[shape]` | 以眼中心为局部原点的 SVG 路径数据，填充规则为 `evenodd`。瞳孔、高光、眼角以及同一眼形在不同情绪下的相对大小和角度见对应 SVG。 |
| `face`、`sizes`、`overlay` | 逻辑坐标、物理输出尺寸以及字幕、状态标签的前景布局约束。 |

两种布局都用宽 720 的逻辑坐标。720 × 720 使用高度 720、眼中心基线 y=294。320 × 240 使用逻辑高度 540、基线 y=209，横纵坐标统一乘以 4/9，模式／装饰符号整体上移 42 个逻辑单位。两眼默认中心 x 分别是 227 和 493，个别情绪会移动中心或改变比例。黑屏目标是纯黑。全屏庆祝可覆盖底色，脸部叠加字幕时应把最多两行字幕画在特效前景，横向各留 6%，底部留 7%。上角状态标志距顶 5%、距右 6%。随包 SVG 和像素样例预留叠加空间，业务层提供实时字幕。

## 在程序中绘制某一时刻

浏览器依次载入 `artwork.js` 和 `frames.js`。Node 中以副作用导入同一组脚本。独立 SVG 中已嵌入路径和柔光滤镜。部分附属符号含 `Aa`、`Z`、问号等文本，字体由栅格化环境决定。像素导出会固化这些符号。

```js
import './artwork.js';
import './frames.js';
const svg = globalThis.JarvisEyeFrames.renderSVG('excited', 'companion', {
    size: 'small', time: 1300, age: 1300
});
```

`JarvisEyeArtwork.faceMarkup(state, mode, clockMs, ageMs, options)` 返回 SVG 图形层。使用已有 SVG 画布时，`options.height` 取**逻辑高度** 540 或 720。用于渐进切换时，`eyePose(state, mode, clockMs, ageMs, side, options)` 返回中心 `x,y`、角度 `rot`、缩放 `sx,sy`，`side` 为 0 左、1 右。`poses:[left,right]` 可将当前过渡采样姿态传回绘制。`entry:false` 交由过渡层控制入场，`burst:false` 交由合成器单独画庆祝背景。`burst(ageMs, viewHeight, modes[mode], still)` 可生成背景层。`still:true` 冻结内部动作，`effects:false` 可以关掉附属特效。直接调用底层原画函数时，请先用清单检查有效的模式和状态键。黑屏由宿主清除标签、字幕和背光等设备状态。

预览、导出与构建均可离线运行。实机显示仍需核对面板方向、驱动字节序、字幕字体与可用绘制频率。
