# Jarvis

个人桌面机器人。PRD 已于 **2026-10-23** 确认，三个月交付目标为 **2027-01-23**。当前阶段为 P1 可行性验证。

- **[当前工作清单：已完成、待办与协作节点](docs/work-checklist.md)**
- **[Mac 真人麦克风与眼神短测](docs/voice-face-short-test.md)** · [模拟 K151 问答、插话与回声测试记录](docs/k151-mac-preflight.md)
- **[眼神交互设计 v0.3 总索引](forUED/README.md)** · [离线交互预览](forUED/prototypes/eyes-design/index.html) · [开发交付包](forUED/output/jarvis-eyes-v0.3.zip)。设计资料归档在 `forUED/`，开发与验收进度看上方主清单。
- [PRD v1.1](prd/prd-v1.1.md)
- [完整计划](prd/project-plan-v1.md)
- [V2 迭代优化备忘录](prd/v2-iteration-memo.md)
- [日期、任务与实测状态](docs/project-status.md)
- [首轮技术验证方案](docs/p1-feasibility.md)
- **[A2 硬件选型交付书与分批采购清单](forProject/A2-硬件选型交付书.md)** · [主负责 AI 接手指南](forProject/00-主负责AI接手指南.md)
- [Stack-chan 成品与自建路线初评](prd/stackchan-review.md)
- [11-01 原四条硬件路线与预算](docs/hardware-route-review-2026-11-01.md)
- [B-L 历史台架与电源计划](docs/hardware-bench-plan.md)
- [B-L 开发、装配与验收工作量明细（选型估算）](forProject/docs/bl-work-breakdown-2026-11-02.md)
- [新增硬件路线：成品、开源终端与集成板比较（2026-11-05）](forProject/docs/hardware-alternatives-review-2026-11-05.md)
- [逐型号硬件与软件实施任务、个人投入和验收条件](forProject/docs/hardware-implementation-checklist-2026-11-08.md)
- [11-07 选型比较（阅读版）](forProject/docs/hardware-options-and-shopping-list-2026-11-07.html) · [Markdown](forProject/docs/hardware-options-and-shopping-list-2026-11-07.md)
- [11-05 原十条路线的零件级清单（阅读版）](forProject/docs/hardware-options-comparison-and-shopping-list-2026-11-05.html) · [Markdown源文档](forProject/docs/hardware-options-comparison-and-shopping-list-2026-11-05.md)
- [火山引擎开通与接入准备](docs/volcengine-setup.md)
- [固定语音评估与架构比较](docs/voice-evaluation-2026-10-24.md)
- [方舟文本对照实测结果（2026-10-25）](docs/voice-comparison-2026-10-25.md)
- [流式时序、新案例与当前工程选择](docs/voice-streaming-review-2026-10-25.md)
- [当前 v3 对话规则与验证证据](docs/voice-rules-update-2026-10-25.md)
- [记忆、模式与工具接入实测（2026-10-26）](docs/context-tools-review-2026-10-26.md)
- [正式历史与最小跨会话记忆](docs/memory-implementation-2026-10-27.md)
- [三分钟记忆短测（已完成）](docs/memory-short-test.md)
- [真人记忆反馈与原问题（2026-10-29）](docs/memory-feedback-2026-10-29.md)
- [记忆与自然结束修复](docs/memory-repair-2026-10-29.md)
- [定向短测（已完成）](docs/memory-repair-short-test.md)
- [最新真人反馈与口语前缀修复（2026-10-30）](docs/spoken-intent-feedback-2026-10-30.md)
- [记忆确认、并存偏好与测试证据（2026-10-30）](docs/memory-confirmation-2026-10-30.md)
- [独立记忆确认短测（已结束）](docs/memory-confirmation-short-test.md)
- [确认短测的原始失败与用户反馈](docs/memory-confirmation-feedback-2026-10-30.md)
- [最新更正、记忆范围与打断后回复修复](docs/memory-correction-2026-10-30.md)
- [四模式 Skill 与切换实现](docs/modes-implementation-2026-10-30.md)
- [四模式短体验](docs/modes-short-test.md)
- [英语收尾与学习记录实现](docs/learning-implementation-2026-11-01.md)
- [英语短体验（本轮已结束）](docs/learning-short-test.md)
- [英语真人反馈与英文入口修复](docs/learning-feedback-2026-11-01.md)
- [11-01 识别停滞反馈与恢复](docs/input-stall-feedback-2026-11-01.md)
- [11-01 确认回复与后续修复](docs/confirmation-followup-feedback-2026-11-01.md)
- [本地唤醒漏检诊断（已完成）](docs/local-wake-diagnosis.md)
- [本地唤醒漏检分析](docs/wake-review-2026-10-25.md)
- [本地唤醒与会话流程短测（暂停）](docs/local-wake-test.md)
- [本地唤醒实现与证据](docs/local-wake-implementation.md)
- [新规则 3 分钟短测（已完成）](docs/voice-v3-short-test.md)
- [文本模型对照：最小开通步骤](docs/ark-evaluation-setup.md)

## 运行第一个原型

当前 Mac 已有 Node.js 24。无需安装依赖，在仓库根目录运行：

```sh
npm start
```

打开 http://127.0.0.1:8765 。先点模拟实体按键，再模拟唤醒、问完问题、回答到达和插话。按 Ctrl+C 停止。

这是**眼睛与表达事件原型**：五个选项模拟唤醒成功事件，不能识别真实语音；说话、点头、开关机均为模拟，不访问麦克风、云端或真实电机。原型页面是开发验证工具，不是 V1 管理网页。

```sh
npm test
```

测试覆盖打断后拒绝旧回复、跨会话结果失效、模拟启动循环及五条唤醒事件入口。测试通过不代表声学识别率、打断延迟或实机验收通过。

## 目录

| 目录 | 用途 |
| --- | --- |
| `prd/` | 已确认需求与长期计划 |
| `docs/` | 技术决策、开通说明、进展与验证 |
| `prototypes/` | 可丢弃的 P1 原型，最终实现待验证后确定 |
| `tests/` | 原型逻辑验证 |
| `demo/ElectronBot-main/` | 用户下载的参考作品，优先本地阅读 |
| `runtime/` | 后续本地配置、日志与历史；不进入版本控制 |

原型使用 JavaScript 是为了复用现有 Node 环境并快速显示眼睛，不锁定最终机器人编程语言。Seeduplex 已接通真人麦克风，基本插话此前获得用户确认；v3 真人短测确认复述、英文跟随和能力边界符合，整体体验改善。深度语义可靠性、量化延迟与长期稳定性仍待验证，K151 实机音频和日用 Linux 主机仍待联调。

## Mac 真实语音验证

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run voice
```

凭证读取本地 `runtime/volcengine.env`，打开 http://127.0.0.1:8766 ，点击 **开始聊天**，等待“可以直接讲话”。每次会话只点一次，之后直接说话、插话；“结束聊天”释放麦克风与云连接，下次再次点击开始。按钮聊天不加载本地唤醒模型。离开页面前台会关闭交互。

2026-10-26 用户已确认：稳定本地唤醒和其余四条短句移入 [V2 备忘录](prd/v2-iteration-memo.md)。页面“实验与诊断”仅保留可选 **Hi Jarvis** 本地入口，默认关闭且仍可能漏检，不作为 V1 验收要求。若需启用实验，在本机先运行 `npm run voice:wake:setup` 安装模型；待机语音不上云。历史 [五短句测试](docs/local-wake-test.md)已暂停，无需重复。

已接入正式文字历史和最小跨会话记忆，后台提炼复用 `runtime/ark.env`（本机已配置）。历史与记忆存于 `runtime/data/`，不保存录音；维护方式见[实现记录](docs/memory-implementation-2026-10-27.md)。[10-29 真人短测](docs/memory-feedback-2026-10-29.md)确认跨会话读取有效、自然度改善；[10-30 反馈](docs/spoken-intent-feedback-2026-10-30.md)后的口语前缀已修复，用户反馈没有明显长等待，正式量化延迟仍待验收。

最新[记忆确认流程](docs/memory-confirmation-2026-10-30.md)支持并存爱好、受控保存播报和确认替换／拒绝／延期；89 项单元检查及定向真实合成通过，最新[真人反馈](docs/memory-confirmation-feedback-2026-10-30.md)已齐：等待与表达可以接受，乌龙茶是主动打断。[后续修复](docs/memory-correction-2026-10-30.md)已补更正、有限属性键／限定范围及否定追问，101 项检查与服务回放通过；云端分句／错字和最终真人验收仍待观察，本轮接入四模式。运行 `npm run voice:memory-test` 可在 **8767** 开启独立记忆测试页，虚构偏好不会写入个人数据；[本轮短测](docs/memory-confirmation-short-test.md)已结束，暂不重复。四模式及切换／回滚现已接入，113 项检查通过；[真实合成与已知缺口](docs/modes-implementation-2026-10-30.md)有记录。11-01 的四模式测试尚未完成，保留[原四模式步骤](docs/modes-short-test.md)待后续集中继续，暂不要求立即重测。英语学习总结现已接入，见下方最新记录；搜索、主动搭话与实体硬件仍未接入。

此前[11-01 21:52 卡顿记录](docs/input-stall-feedback-2026-11-01.md)显示最后一句只有 partial、没有识别完成。已补 6 秒提示、用户可选“我说完了”单次提交和 8 秒无 final 明确关闭，并修复有限红茶等义去重与完整肯定短句；127 项检查、服务及模拟页面回归通过。真实合成证明显式提交协议可用，原卡顿原因及修复后真人效果仍待确认，不要求重跑整套测试。

最新[22:19 确认反馈](docs/confirmation-followup-feedback-2026-11-01.md)：用户没有明显长等待、未点恢复按钮，但最终转写把“吧”变为“吗”，绿茶确认替换失败。已补一次澄清与明确后续回复衔接，135 项检查和本地服务回放通过；ASR 错字未修复，新澄清仍待真人验证。旧客户端标记不能推断后端版本；原数据保留，暂不要求立即重测。

```sh
npm run voice:probe -- --greeting
npm run voice:probe -- --loopback
```

上述 probe 会调用已开通的云服务并产生用量；loopback 仅将合成问题在内存中回送，不保存音频，不使用麦克风。

最新[英语收尾与学习记录](docs/learning-implementation-2026-11-01.md)：说“今天练到这里”可总结并回日常，直接退出只后台整理；保存来源可核对的词汇和表达建议，后续会话可读取。179 项单元检查、本地服务与模拟页面回归通过；真实合成回环及三条文字反例通过定向检查，首次过度纠错失败保留。完整英语体验仍待验证，准备[3–5 分钟短体验](docs/learning-short-test.md)，不用重跑记忆测试。

最新[英语真人反馈](docs/learning-feedback-2026-11-01.md)：用户感觉基本合适，确认 weekend、wine 和结束话转写错误；英文练习请求未切换本地模式，现补有限明确英文入口。187 项检查及真实转写的本地流程回放通过，识别错误本身未修复。本轮后半段后台归档完成，口头总结与跨会话读取仍待验证；暂不要求重复测试。

V1 采用 A2。K151 标准机身负责收音、播放、显示和运动，先与现有 Mac 联调，日用迁移到独立 Linux 主机。已完成本机配对协议模拟与固件回刷指南，复现命令为 `npm run device:preflight`。到货后优先测 20、50 厘米自然插话与墙充常插时的同键关机再开。[Mac 协议复现](docs/k151-mac-preflight.md) · [固件回刷准备](docs/k151-firmware-recovery.md)
