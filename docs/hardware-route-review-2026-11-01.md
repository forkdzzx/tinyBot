# Jarvis 硬件路线、完整预算与验证顺序

> 11-07 当前选型见[整机交付与全部方案购买清单](../forProject/docs/hardware-options-and-shopping-list-2026-11-07.html)。下文预算与优先级为此前各日期的记录。

核查日期：**2026-11-01（Asia/Shanghai）**。对应 T-42～T-46，并补充 T-48 布局准备。本文是候选方案和采购前依据，**尚未选择最终路线、购买器件、编译成品固件或完成实机验证**。PRD 的 5000 元整机预算、直接插话、双关节、单按钮电源循环和未来 NVIDIA 扩展要求不变。

2026-11-02 补充：[B-L 工作量明细](../forProject/docs/bl-work-breakdown-2026-11-02.md)区分本体集成、共用软件收尾与验收，列出开发内容、投入和用户配合；仍为选型讨论，未确定采用 B-L。A2 的半双工结论限定于已核查的社区桥接版本，不代表 K151 硬件无法实现同时收放；B-L 也没有实机通过证据。

**2026-11-05 后续调查：** [新增候选比较](../forProject/docs/hardware-alternatives-review-2026-11-05.md)已扩展到K151独立音频组合、OpenDeskBot、Whisplay、VerdiBot、Reachy Mini与小木编程版。下文“B-L优先”是11-01在原四条路线内的建议；当时建议先补C1/C2的接口与可复制性证据，再与B-L比较。Reachy在接受无脸屏时值得重点评估。新候选尚无我们的硬件验收，不与B-L视作同等成熟，也未替换PRD需求。

## 1. 建议与选择

阅读全部候选及各自购买项，请使用[11-05统一比较与清单](../forProject/docs/hardware-options-comparison-and-shopping-list-2026-11-05.md)（[排版阅读版](../forProject/docs/hardware-options-comparison-and-shopping-list-2026-11-05.html)）。本页保留11-01价格快照；后续核到XVF3800单件挂牌US$60.99，原US$54.90不能作为当前报价。

**建议优先验证 B-L：Raspberry Pi 5 4GB＋USB 回声处理音频前端＋现成两轴器件，未来通过有线网络增加独立 Jetson 节点。** 可以沿用现有会话、记忆和 Skill 程序，把新增工作集中到 Linux 音频、显示、电源和动作适配。它仍需要机械装配，但不需要从零设计主板、声卡和舵机。

此前“优先评估 A2”的建议在本轮更新：社区确有可复用 USB 音频桥，不过**当前代码限制录放互斥**，不能直接满足边播边听的插话需求；新版 K151 屏幕与该社区固件的兼容证据也未补齐。因此 A2 作为备选，先验证这些关键条件，不能因为成品便宜就推定总体工作更少。

| 路线 | 本轮完整预算草案 | 主要收益 | 当前判断 |
| --- | ---: | --- | --- |
| A1：K151 单机 | 1480–1880 元 | 现成外形、屏幕、音频、两轴 | 不优先：现有 Node 业务需移植到 MCU，Linux 本地维护要求会改变，插话／电源／扩展仍待验证 |
| A2：K151＋专用 Pi 主机 | 3390–3790 元 | 减少机械工作，主机保留现有业务 | 保留：需解决半双工音频桥、新屏适配、两个系统同键开关机；2 英寸字幕要实看 |
| **B-L：Pi 主控自建** | **4565 元** | 软件延续、接口可控、约 4 英寸方屏、后续独立 Jetson | **优先验证建议**；电源、音频和机械仍有下述放行条件 |
| B-J：本期直接 Jetson | 6739 元 | 本期拥有 NVIDIA GPU | 当前可核方案超预算；保留用户偏好，待有更低完整报价或未来追加预算 |

表内是**预算分配，不是到手报价**。工程投入未折算成人民币；外币价格未按假定汇率兑换。B-L 已含 500 元返工／运费余量，距硬上限另留 435 元；未锁定的配件或加工超过分配时，必须重新算总账。选择“优先验证”也不等于批准一次买齐或放宽 PRD。

## 2. 本次核实的价格与具体型号

| 商品／配置 | 页面所示 | 价格性质与缺件 |
| --- | ---: | --- |
| [M5StackChan K151](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) | US$99，页面显示 10+ 库存 | 运费结算计算；含 USB-A→C 数据线等，清单未列电源适配器／microSD；国内渠道和到货日期未确认 |
| [Raspberry Pi 5-4GB](https://www.waveshare.net/left_column/Raspberry-Pi.htm) | ¥1299 | 微雪目录展示价；不是含散热、存储与电源的完整主机 |
| [4inch HDMI LCD (C)，SKU21433](https://www.waveshare.net/left_column/LCD-OLED.htm) | ¥230.28 | 微雪目录展示价；长柔性 HDMI 走线及独立供电另计 |
| [reSpeaker XVF3800，SKU101991441](https://www.seeedstudio.com/ReSpeaker-XVF3800-USB-Mic-Array-p-6488.html) | US$54.90 | 裸 USB 音频前端；扬声器另配，国内到手价未确认 |
| [Servo Driver with ESP32，SKU21593](https://www.waveshare.net/left_column/AI-Expansion.htm) | ¥80.80 | 驱动板，不能当成包含舵机与供电的套件 |
| [ST3215 标准 12V，SKU22414](https://www.waveshare.net/left_column/Accessories.htm) | ¥109／只 | 不是 7.4V 版、HS 版或整套双轴机构 |
| [JETSON-ORIN-NANO-8G-DEV-KIT，SKU24451](https://www.waveshare.net/left_column/AI-Board-Kit.htm) | ¥3819 | 选 DEV 作比较基线，包含 SSD、无线与主机电源；见下文 |

人民币目录可读取，但部分商品详情的价格动态加载；本次未核实最终结算、国内库存、税运费、发货时效或套餐替换。采购前逐行确认 SKU 和配件，不能只抄目录价格。

## 3. B-L 候选 BOM：每一类费用都有位置

以下“分配”是拟定金额，不是商家承诺；未冻结项不能直接下单。

| 编号 | 器件与数量 | 预算分配／元 | 已明确／放行前还差什么 |
| --- | --- | ---: | --- |
| BL01 | Raspberry Pi 5 **4GB** ×1 | 1350 | 已核目录；4GB 是本次候选，需验证目标镜像资源占用；不为本地大模型购买大内存 |
| BL02 | 官方 27W USB-C 电源 ×1 | 120 | 采购确认中国插头、5.1V/5A；供主机，不拿它给舵机供电 |
| BL03 | Pi 5 Active Cooler ×1 | 60 | 官方主动散热方向；装配间隙和噪声实测 |
| BL04 | 128GB microSD＋必要读卡器 | 150 | 兼容／耐写卡候选，具体品牌料号及真实容量待询价；暂不叠加 NVMe/HAT |
| BL05 | 4inch HDMI LCD (C) ×1 | 260 | 720×720；实际外形、头部重量、Pi5显示和关背光方式必须验证 |
| BL06 | Micro-HDMI→HDMI 柔性线及固定 | 45 | 主控放底座，不采用把主控叠到屏背的演示装配方式 |
| BL07 | reSpeaker XVF3800 **USB 裸板版** ×1 | 600 | 国内到手占位；避免误买默认 I2S 的 ESP32 套装；固定 USB 固件与处理后声道 |
| BL08 | 匹配的外部扬声器及连接线 | 60 | 根据音频板功放的阻抗／功率／插头选型；不能把音频板当作自带扬声器 |
| BL09 | Servo Driver with ESP32 ×1 | 100 | 有现成驱动／反馈路径；主机串行通信和按键输入固件需开发验证 |
| BL10 | ST3215 标准 12V ×2 | 240 | 先验证一只；最后按头部负载复核，保留换型空间 |
| BL11 | 成品 12V 电源，≥6A 候选 | 150 | 独立电机供电；不能借更大电源绕过驱动板的 5A 上限 |
| BL12 | 屏幕／音频外设辅助供电、必要有源 USB 分配 | 200 | 具体器件未冻结；需验证峰值电流、数据枚举、关机后无回供电 |
| BL13 | 电源／聊天两按钮、背光门控、低压分配保护和接头 | 200 | 电源键用 Pi5 J2 的可行路径；显示门控与两轴独立配电仍待电气图和台架验证 |
| BL14 | 固定底板、两轴支架／轴承、简单打印加工和小五金 | 450 | 无精美外壳；先按重量和安装孔做支架，不预购成套精加工外壳 |
| BL15 | USB／网线、备用线材及应力释放 | 80 | 不重复计 BL06、成品已附线；为未来有线 Jetson 留接口通路 |
| BL16 | 运费、试错和备件余量 | 500 | 单列，不挪去隐藏漏项 |
| | **合计** | **4565** | **尚余 435 元到预算硬上限** |

两个明确的未放行点：

- **音频电源不是接上 USB 就算完成。** Pi5 在合适 5A 电源下，USB 设备与风扇共享的供电额度仍有限；不能把屏、功放、控制板全部接上后只看“能开机”。详细供电和验证见[台架计划](hardware-bench-plan.md)。
- **两只舵机不能简单全经 5A 驱动板供电。** 厂商列标准 ST3215 每只堵转 2.7A，两只合计 5.4A；驱动板说明最大 5A。必须核验独立分配／保护，或改用匹配负载的低电流方案。第一阶段只接一轴，不以堵转额定扭矩证明持续承重能力。[舵机参数](https://docs.waveshare.com/ST3215_Servo)、[驱动板电流上限](https://docs.waveshare.com/ST3215_Servo/Web-Use)

## 4. A1／A2／B-J 的预算如何得到

| A 路线项目 | A1／元 | A2／元 |
| --- | ---: | ---: |
| K151 国内到手占位 | 800–1200 | 800–1200 |
| Pi5 4GB＋电源＋散热＋主机存储 | — | 1680 |
| K151 microSD | 80 | 80 |
| K151 所需电源 | 70 | 70 |
| 电源／按钮适配 | 120 | 200 |
| 固定、线材／小配件 | 160 | 160 |
| 运费与试错余量 | 250 | 400 |
| **合计** | **1480–1880** | **3390–3790** |

A2 不额外购买 B-L 的屏幕、音频板和舵机，也不隐藏日常 Mac 常开的依赖；若后来增加外置声卡或大屏，必须重算并重新比较 B。A1 的低价不包含将现有软件移植到 MCU 的时间成本。

B-J 统一沿用 B-L 的外围分配，将 BL01～BL04 的 **1680 元**换成 **3819 元 DEV 套件**，将 BL06 的 45 元线材换成 **80 元 DP→HDMI 连接**：`4565 − 1680 − 45 + 3819 + 80 = 6739 元`。相同外围条件下，完整主机套件需要降至 **2080 元以内**才能满足 5000 元；本次没有找到这样的可核报价。

不要误用 3549 元的 BASE 套件替代完整主机：BASE 缺 SSD、无线与电源；DEV 才列出这些配件。官方 Super 国内目录为 3999 元，系统存储还需另配，不能仅用早年海外 MSRP 判断总成本。[厂商 BASE／DEV 配置](https://www.waveshare.com/product/jetson-orin-nano-dev-kit.htm)、[官方套件缺件说明](https://developer.nvidia.com/embedded/learn/get-started-jetson-orin-nano-devkit)

## 5. K151 新核查：自主开发可行，直接复用有边界

官方手册列明 ESP32-S3、16MB Flash／8MB PSRAM、2英寸320×240屏、双麦、I2S扬声器、SD、两轴、摄像头与电池。现有 Node/浏览器程序不能直接烧进去；官方 ESP-IDF、社区 Moddable 与 Arduino BSP 是不同开发路径。[产品手册](https://docs.m5stack.com/en/StackChan)、[官方构建](https://github.com/m5stack/StackChan/tree/main/firmware)、[社区构建](https://github.com/stack-chan/stack-chan/blob/develop/firmware/README.md)

固定核查版本，避免只按变化中的分支名作结论：

- 官方 `m5stack/StackChan`：`f901cc2969189f3f0e96af1442c0f96e77e1e2c1`。
- 社区 `stack-chan/stack-chan`：`e7e27e2f8b89b53d535717b186e88b10911fa746`。

社区 [USB Dock 协议](https://github.com/stack-chan/stack-chan/blob/e7e27e2f8b89b53d535717b186e88b10911fa746/firmware/docs/android-usb-audio.md)已有 PCM 双向传输、流标识、流控和断线处理，能借鉴；但[传输层源码](https://github.com/stack-chan/stack-chan/blob/e7e27e2f8b89b53d535717b186e88b10911fa746/firmware/host/modules/usb-audio/bridge.ts#L537)和[物理层](https://github.com/stack-chan/stack-chan/blob/e7e27e2f8b89b53d535717b186e88b10911fa746/firmware/host/modules/usb-audio/worker-bridge.ts#L428)均有录放互斥。默认还有 500ms 播放预缓冲；取消会清队列，但不能把现有 abort 当作已经验证的物理停播确认。它是自定义 CDC 协议，不是标准 USB 声卡即插即用。

官方音频驱动有同步收放和回声参考路径，不过固定版 [AEC 配置](https://github.com/m5stack/StackChan/blob/f901cc2969189f3f0e96af1442c0f96e77e1e2c1/firmware/main/Kconfig.projbuild#L765)默认关闭设备端 AEC，板型条件未包含 K151；不能据此承诺出厂全双工效果。[音频配置](https://github.com/m5stack/StackChan/blob/f901cc2969189f3f0e96af1442c0f96e77e1e2c1/firmware/main/hal/board/config.h)

**屏幕批次新增风险**：手册记录 2026-08-07 ILI9342C→ILI9342E，M5GFX 至少0.2.27；官方代码已有适配，但社区 Moddable 路径不能自动继承。当前固定社区版本未找到新屏验证证据。采购若考虑 A，须确认屏幕批次、匹配固件及恢复方法。[官方新屏适配](https://github.com/m5stack/StackChan/blob/f901cc2969189f3f0e96af1442c0f96e77e1e2c1/firmware/main/hal/board/stackchan.cc#L607)、[社区屏幕类](https://github.com/stack-chan/stack-chan/blob/e7e27e2f8b89b53d535717b186e88b10911fa746/firmware/host/platforms/m5stackchan_cores3/host/screen.js)

本次未在 PATH 检出 `idf.py`／`mcconfig`，未执行完整固件构建，也未安装大体积依赖。A2 若继续，仅先评估一台样机；直接插话、字幕可读性、新屏与同键双机电源任一无法满足，就不以成品外观代替需求验收。

## 6. B-L 兼容性与扩展安排

- **软件**：现有 JavaScript 会话、记忆和 Skill 可作为移植基础；选择64位 Raspberry Pi OS 候选，固定 Node 版本。仍须在设备实测浏览器／原生音频驱动、启动服务及资源占用，Mac 的187项测试不能替代目标平台验证。当前语音输入16k、输出24k；USB设备固件的采样率与处理声道需转换适配。实验唤醒默认关闭，不把 Darwin 原生依赖已安装当成 Linux 已可运行。
- **音频**：XVF3800 有 USB、AEC 与音频输出路径，需外接扬声器。采用 USB 模式，把播放送回同一声卡以提供回声参考，验证浏览器与硬件双重处理的效果。官方也说明外部扬声器延迟会影响 AEC；板上有算法不等于本机器人已达标，更不能保证修好 weekend/wine 的转写。[音频接入说明](https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/)、[厂家调参边界](https://github.com/respeaker/reSpeaker_XVF3800_USB_4MIC_ARRAY/blob/master/host_control/README.md)
- **显示**：4英寸方屏的名义可视宽高约7.2cm（由对角线换算，非外壳尺寸），接近8×8cm意向。选 HDMI 便于换主控；720×720模式、供电与背光需验证，不能照搬旧 Pi3／Pi4 的叠装演示。[屏幕资料](https://docs.waveshare.net/4inch_HDMI_LCD_C_/)
- **NVIDIA 扩展**：Pi 使用 Wi-Fi 上网，保留 RJ45 及线缆出口给未来独立 Jetson；保留至少一个可用 USB 主机口与摄像头安装位置，HDMI 显示不占 CSI。电源／空间也要复核，不承诺 Jetson 当普通 PCIe 显卡插入 Pi。[Pi5 接口](https://www.raspberrypi.com/products/raspberry-pi-5/)
- **B-J**：标准 Orin Nano 开发载板使用 DP，USB-C 不能默认出视频。厂商载板镜像与 NVIDIA 最新镜像要分别核对，不能仅因同为 Orin 就互换；例如本次微雪资料仍列 JetPack6.2 路径，而 NVIDIA 最新指南已不同。若未来选 B-J，再冻结载板、镜像、Wi-Fi和音频驱动。[NVIDIA接口](https://docs.nvidia.com/jetson/orin-nano-devkit/user-guide/latest/hardware_layout.html)、[厂商刷写路径](https://www.waveshare.com/wiki/JETSON-ORIN-NX-16G-DEV-KIT)

## 7. 给 V2 外壳留余地的 V1 布局

| 区域 | 建议放置 | 验证／记录 |
| --- | --- | --- |
| 固定底板／低处 | Pi、散热、低压配电、连接口；电源砖可在桌下 | 主板尺寸、孔位、散热出口、重心、插拔维护空间 |
| 可左右旋转的上身 | 轻量支架和必要器件 | 有旋转的身体／头部；固定底板不转；线束不过度扭转 |
| 颈部俯仰与头部 | 屏幕和轻支架 | 称头部含线材总重、重心距、俯仰余量，不把主控和散热器全挂头上 |
| 麦克风／扬声器 | 优先固定位置、避开风扇直吹，留机械隔振 | 相对位置确定后重测回声；声音从机器人本体外放 |

这是布局原则，尚无已验证 CAD 或整机尺寸。示例计算：若头部250g、重心距5cm，静态扭矩约1.25kg·cm；实际器件到货后重算并留动态余量，同时核查线材拉扯、轴承和掉电支撑。现成支架／打印件先用，外壳最后设计；不能承诺任意升级都塞回同一壳体。

## 8. 接下来如何推进

1. **先选验证方向**：建议 B-L；A2 只有在愿意处理半双工桥和成品差异时优先。不购买两套完整系统做对照。
2. **确认渠道和首批器件**：替换上述占位为含缺件的到手报价，优先可退换的音频／主控验证件；采购与付款仍由用户执行。
3. **按[台架验证计划](hardware-bench-plan.md)分批放行**：先音频，再主控电源与屏幕，再单轴，最后两轴。音频可先连现有 Mac 验证，不等全部装好才发现插话问题。
4. **保留软件主线**：这轮已确认的 ASR 误词、英语总结／跨会话、主动搭话与搜索仍按工作清单推进，不以买硬件代替软件问题排查。

11月5日仍是 P1 决策检查点；现已补上资料、预算和台架步骤，但到货时间尚未确认，不能承诺此前完成全部实机门槛。交付目标仍为2027年1月23日。
