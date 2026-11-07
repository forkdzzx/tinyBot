# Jarvis · UED 交付与项目索引

归档于 2026-11-08。当前可交付版本为 **v0.3**。用户已认可 v0.2 的眼神造型，v0.3 在原画基础上加入渐进切换、连续改向和插话抢占。此目录可直接浏览。给其他 AI 会话时发送 [v0.3 离线交付包](output/jarvis-eyes-v0.3.zip) 即可。

| 想做什么 | 从这里开始 |
| --- | --- |
| 看动态效果 | 打开[交互预览](prototypes/eyes-design/index.html)，点击「演示渐进切换」。支持慢放和暂停 |
| 交给另一个开发者或 AI | 按[交付指南](docs/jarvis-eyes-handoff.md)读源码、运行样例和复验 |
| 查眼神或过渡规则 | 阅读[原画和情绪语义](docs/jarvis-eye-interaction-design.md)、[切换规范](docs/jarvis-eye-transitions.md)，对照[400 ms 五帧图](docs/eyes-mode-transition.png) |
| 给硬件屏准备素材 | [素材说明](design/eyes/README.md)、[96 组映射清单](design/eyes/manifest.json)、[本地帧导出工具](design/eyes/export-frame.html)和[RGB565 样本](design/eyes/examples/work-listening-320x240-still.be.rgb565) |
| 看项目进度和需求 | [当前工作清单](docs/work-checklist.md)、[PRD v1.1](prd/prd-v1.1.md)、[项目计划](prd/project-plan-v1.md)和[V2 迭代备忘录](prd/v2-iteration-memo.md) |

## 版本与证据

| 版本 | 可查看的内容 |
| --- | --- |
| v0.3 · 当前交付 | [运行与验证说明](docs/jarvis-eyes-handoff.md)、[验收用例](tests/eye-handoff.test.mjs)。可复用模块和硬件参考帧集中在 `design/eyes/` |
| v0.2 · 认可的造型 | [24 种状态一览](output/playwright/eyes-design-v02/catalogue-daily.png)、[四模式倾听对照](output/playwright/eyes-design-v02/modes-listening.png)、[庆祝演出](output/playwright/eyes-design-v02/excited-burst.png)及[验证记录](output/playwright/eyes-design-v02/verification.json) |
| v0.1 · 设计演进 | [首版桌面图](output/playwright/eyes-design/desktop.png)、[首版验证记录](output/playwright/eyes-design/verification.json)和[emotion-ball 源码审阅](docs/emotion-ball-review-2026-11-05.md) |

## 接回整机项目

Mac 语音原型已有试聊与插话反馈。下一项集成工作是用真实的录放音和轮次事件驱动眼神与字幕，再按选定硬件验证显示和两轴动作。语音与记忆的历史证据可从[项目进展](docs/project-status.md)按日期查阅。硬件分支的取舍见[路线与预算](docs/hardware-route-review-2026-11-01.md)、[台架计划](docs/hardware-bench-plan.md)、[Stack-chan 评估](prd/stackchan-review.md)和[ElectronBot 审阅](prd/electronbot-review.md)。

本目录保留本次整理时的资料快照。后续若调整设计，在 `design/eyes/` 修改原画或过渡规则，依照交付指南更新参考帧、验证并重建 ZIP。整体任务状态统一维护在项目工作清单；此处留有归档时的版本。项目背景资料中的少量源码链接指向上一级 tiny-robot 工程。独立使用视觉方案时，ZIP 已包含所需材料。
