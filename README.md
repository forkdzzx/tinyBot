# Jarvis

个人桌面机器人。PRD 已于 **2026-10-23** 确认，三个月交付目标为 **2027-01-23**。当前阶段为 P1 可行性验证。

- **[当前工作清单：已完成、待办与协作节点](docs/work-checklist.md)**
- [PRD v1.1](prd/prd-v1.1.md)
- [完整计划](prd/project-plan-v1.md)
- [V2 迭代优化备忘录](prd/v2-iteration-memo.md)
- [日期、任务与实测状态](docs/project-status.md)
- [首轮技术验证方案](docs/p1-feasibility.md)
- [Stack-chan 成品与自建路线评估](prd/stackchan-review.md)
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
- [独立记忆确认短测（待试听）](docs/memory-confirmation-short-test.md)
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

原型使用 JavaScript 是为了复用现有 Node 环境并快速显示眼睛，不锁定最终机器人编程语言。Seeduplex 已接通真人麦克风，基本插话此前获得用户确认；v3 真人短测确认复述、英文跟随和能力边界符合，整体体验改善。深度语义可靠性、量化延迟与长期稳定性仍待验证，机器人音频驱动和主控尚未定型。

## Mac 真实语音验证

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run voice
```

凭证读取本地 `runtime/volcengine.env`，打开 http://127.0.0.1:8766 ，点击 **开始聊天**，等待“可以直接讲话”。每次会话只点一次，之后直接说话、插话；“结束聊天”释放麦克风与云连接，下次再次点击开始。按钮聊天不加载本地唤醒模型。离开页面前台会关闭交互。

2026-10-26 用户已确认：稳定本地唤醒和其余四条短句移入 [V2 备忘录](prd/v2-iteration-memo.md)。页面“实验与诊断”仅保留可选 **Hi Jarvis** 本地入口，默认关闭且仍可能漏检，不作为 V1 验收要求。若需启用实验，在本机先运行 `npm run voice:wake:setup` 安装模型；待机语音不上云。历史 [五短句测试](docs/local-wake-test.md)已暂停，无需重复。

已接入正式文字历史和最小跨会话记忆，后台提炼复用 `runtime/ark.env`（本机已配置）。历史与记忆存于 `runtime/data/`，不保存录音；维护方式见[实现记录](docs/memory-implementation-2026-10-27.md)。[10-29 真人短测](docs/memory-feedback-2026-10-29.md)确认跨会话读取有效、自然度改善；[10-30 反馈](docs/spoken-intent-feedback-2026-10-30.md)后的口语前缀已修复，用户反馈没有明显长等待，正式量化延迟仍待验收。

最新[记忆确认流程](docs/memory-confirmation-2026-10-30.md)支持并存爱好、受控保存播报和确认替换／拒绝／延期；89 项单元检查及定向真实合成通过，复杂语义冲突和真人新流程体验尚未完成。运行 `npm run voice:memory-test` 可在 **8767** 开启独立记忆测试页，按[三分钟步骤](docs/memory-confirmation-short-test.md)试听，虚构偏好不会写入个人数据。四模式、搜索、主动搭话与实体硬件仍未接入。

```sh
npm run voice:probe -- --greeting
npm run voice:probe -- --loopback
```

上述 probe 会调用已开通的云服务并产生用量；loopback 仅将合成问题在内存中回送，不保存音频，不使用麦克风。
