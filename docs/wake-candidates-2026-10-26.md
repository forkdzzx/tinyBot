# 本地唤醒候选评估（2026-10-26）

> 2026-10-26 范围变更：用户已同意将稳定本地唤醒及其余四条短句延期至 [V2](../prd/v2-iteration-memo.md)。V1 用按钮开始聊天，Hi Jarvis 仅可选实验；本文为历史测试／评估记录，不要求重复五短句测试，也不再执行其中的唤醒研发下一步。

结论：**未修复，不替换生产检测器，暂不要求用户重复测试。** 简单提高灵敏度、更换英语模型或让完整短句优先，都尚未得到稳定改善证据。候选代码仅用于离线评估。评估当时 `wake-worker.mjs` 使用原 `LocalSpotter` 默认词表和参数；随后经用户同意，运行入口已缩为仅 Hi Jarvis 的可选实验，五短句对照保留为历史证据。

## 真人反馈与输入证据

用户五条短句平均各尝试两次，没有刻意提高音量、靠近麦克风或改变发音。23:44:42 的 `Jarvis!` 标签命中无法回忆实际原句，不能计为确认正确，也不能据此计算真人成功率。

本地日志显示音轨活跃、未静音，多段明显有声音，推理帧流正常、无持续积压。这不支持“完全没有收音”或“推理处理不动”的解释，但不能仅凭能量统计排除音质、音频处理或发音覆盖问题。详见 [原诊断记录](wake-review-2026-10-25.md)。没有保存用户录音，没有把待机声音发往云端。

## 离线对照

使用 macOS 自带 Samantha、Daniel、Karen 三种合成声音，直接输入本地模型；不是扬声器到麦克风的声学回环，也不代表用户真实声音。完整命中要求返回预期整条短句；长句只命中 `Jarvis!` 单独记为错误短句，不算完整通过。

第一组：每种声音五条正例、五条负例，语速 170，不额外添加前导静音。

| 候选 | 完整命中 / 15 | 错误短句 | 负例误触发 / 15 |
| --- | ---: | ---: | ---: |
| 原词表、原参数 | 8 | 1 | 0 |
| CMUdict 发音变体、原参数 | 8 | 1 | 0 |
| CMUdict 变体、score 2 / threshold 0.20 | 10 | 0 | 0 |
| 再增加不发 r 的实验变体、score 2 / threshold 0.20 | 12 | 1 | 0 |
| 英语专用模型、原参数 | 10 | 5 | 0 |
| 英语模型、完整短句优先 | 14 | 1 | 0 |

CMUdict 中 JARVIS 和 ARE 的备选发音来自[官方词典](https://github.com/cmusphinx/cmudict/blob/master/cmudict.dict)；不发 r 的变体是工程假设，单独评估。英语模型来源为 [sherpa-onnx 官方预训练模型目录](https://k2-fsa.github.io/sherpa/onnx/kws/pretrained_models/index.html)列出的 GigaSpeech 3.3M 模型。模型文件固定版本与 SHA-256，见 `prototypes/voice/english-wake-model.json`。

完整短句优先候选使用两个本地检测器：一个负责四条长句，另一个负责单独的 Jarvis。短词命中先等待最多 1.2 秒输入音频，期间完整短句命中优先。代价是单独 Jarvis 的决策延后；这不是端到端延迟的实测值。将短词阈值从 0.25 提高到 0.35，在这两组样本中结果均未改变。

第二组扩展测试：每条前置一秒静音，三种声音 × 两种语速（170、220）× 五条短句，共 30 个正例；15 条非唤醒文本 × 三种声音，共 45 个负例。增加 Travis、Harvey、Java 等近音词及不完整短句。所有候选使用同一组输入，不能直接拿第一组 8/15 与第二组结果比较。

| 候选 | 完整命中 / 30 | 错误短句 | 未命中 | 负例误触发 / 45 |
| --- | ---: | ---: | ---: | ---: |
| 原方案基线 | 23 | 0 | 7 | 0 |
| 英语专用模型 | 19 | 6 | 5 | 0 |
| 英语模型、完整短句优先 | 20 | 3 | 7 | 0 |
| 同上，短词阈值 0.35 | 20 | 3 | 7 | 0 |

扩展测试未保持第一组的优势，所以不能将 14/15 当作可部署证据。加入静音与改变语速同时扩展了测试条件，当前不能单独归因于某一因素。45 个合成负例无误触发也不等于日常误唤醒率或长时间验收通过。

## 工程状态与复现

- `wake-core.mjs` 提取共用流式处理，保留生产默认参数；发音变体仅通过实验参数启用。
- `wake-english.mjs`、`wake-prefix.mjs`、`wake-choice.mjs` 是未接入页面的候选。
- 36 项单元测试通过，包括长短句优先、等待上限和重置隔离；不替代声学验收。
- 临时合成 WAV 运行后删除；保留文本、命中和计数报告，不保留用户声音。
- 原始对照报告已分别归档到 `runtime/wake-threshold-comparison.json`、`runtime/wake-pronunciation-comparison.json`、`runtime/wake-english-comparison.json`、`runtime/wake-prefix-comparison.json`、`runtime/wake-expanded-comparison.json`。`runtime/` 不纳入版本管理。

当前脚本复现第二组扩展测试，输出覆盖 `runtime/wake-multivoice.json`；第一组为历史实验快照，当前脚本不直接重现其参数组合。首次配置实验英语模型需网络，其后评估完全本地：

```sh
python3 -m venv runtime/wake-tools
runtime/wake-tools/bin/python -m pip install --only-binary=:all: sentencepiece==0.2.1
node prototypes/voice/setup-wake-english.mjs
node prototypes/voice/wake-multivoice.mjs
npm test
```

前提：已有原基线模型、项目 Node 依赖及 macOS 三种系统声音。SentencePiece 仅用于一次性编译英语关键词，不进入生产检测链路。

## 下一步

先分开验证前导静音、语速与连续待机条件的影响，再评估本地候选检测加二阶段短句确认是否可行；需同时衡量漏检、误触发、额外等待和资源开销。当前证据不足以确定新路线，也不足以推荐更换麦克风或采购机器人硬件。只有离线结果稳定改善并完成工程接入后，再安排一次有明确短句顺序的真人短测。云端对话、PRD 五条短句和硬件路线均保持原状态。
