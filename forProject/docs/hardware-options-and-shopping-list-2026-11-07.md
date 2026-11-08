# Jarvis 硬件选型与购买清单

2026-11-07 · 单台硬件上限 **¥5,000**，含电源、存储、音频、加工和到手费用。以下是选样机的依据。项目尚未采购，也没有任何一台机器人通过 Jarvis 整机验收。

**11 月 8 日外形反馈。** 用户接受方形机头和掌心大小。先用 M5StackChan K151 作外形与尺寸参照，官方整机为 54 × 70.5 × 61.5 毫米，内置 2 英寸屏和两个关节。小木与陆吾卡卡的造型不合偏好，本轮暂缓。 [官方产品图与规格](https://docs.m5stack.com/zh_CN/StackChan/) · [整机尺寸图](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/1205/Model_Size.pdf)

这里按你的要求，把**自己安装舵机、穿线、固定头屏或连接机内电源**视为淘汰条件。暂按可以插成品电源线、USB 线或接一台已装好的专用主机来评估，并单列声音从桌旁配件发出的体验差异。A2 的尺寸仅指机器人，专用主机另占空间。所有路线以当前 Mac 作开发机，最终日用不依赖它常开。

小木的机身标称约 15 × 9 × 5 厘米，另有直径约 10 厘米的底座。卡卡官方尺寸图给出的底部宽深各 16.8 厘米，图示姿态高 23.4 厘米。K151 的 2 英寸屏按 4:3 比例推算，显示区约 4.1 × 3.0 厘米。原先约 8 × 8 厘米的脸屏意向需要结合实际字幕效果取舍。 [小木官方规格](https://www.timuai.com/order) · [卡卡官方尺寸图](https://shop.xgorobot.com/cdn/shop/files/10-en.png?v=1786415991&width=1080)

**K151 下一步。** 用户确定 A2 为 V1 设计方向，先用 Mac 联调。50 厘米一行、两行试读均清楚；下一项实机验证是 K151 播音时的自然插话。[K151 技术方案与分批购买清单](k151-hardware-plan-2026-11-08.md) · [脸屏实际大小预览](k151-screen-preview.html)

## 全部方案一眼比较

| 路线 | 你收到、需要动手做什么 | 最大优势 | 最大代价或未解决的问题 | 价格依据及判断 |
| --- | --- | --- | --- | --- |
| **C6 森灵小木编程版** | 一台 Linux 机器人，接底座、配网、SSH | 有主控源码和单关节角度示例，最有机会保留 Node 记忆与模式 | 官方例程并行读麦、写扬声器。真实回声、随时停播和自绘字幕待验 | **US$380** 编程版官方索引价。**一体机技术对照，暂缓** |
| **陆吾 RIG-Arm 整机＋专用主机** | 一台已装好并烧录的机器人，配网、校准，主机放旁边 | 从动作、圆屏到语音固件都有对应板型源码，可以直接改 | 五轴机械臂造型、小圆脸，音频桥和双设备电源需开发 | **US$124** 为整机，另加主机。**运动固件对照，暂缓** |
| **A2 K151＋专用主机** | 插电、刷写成品机器人，主机跑 Jarvis | 传统桌面机器人轮廓，原装两轴和脸屏，业务代码留在 Linux | 已核 USB 桥收放互斥，其他固件需要接豆包并测试自然插话 | 本体 **¥818.72** 渠道单件含税价，加主机和配件。**掌心机身候选，待验证** |
| **C1 成品音频变体** | K151＋专用主机＋一台 USB 会议麦，桌面插线 | 会议麦内含喇叭、麦克风与回声处理，无需组装音频板 | 三件设备，声音从桌旁发出。小屏、同步开关机仍在 | 三项主件按下文情景约 **¥3,371**，配件税运另计。**有条件备选** |
| **A1 K151 单机** | 一台成品，插卡、刷写固件 | 器件少，桌面清爽，可直接联网 | MCU 上要重做大量会话、历史、记忆和运维功能 | 本体 **¥818.72**，旧方案总分配 ¥1,480–1,880。适合愿意移植业务时 |
| **或宇 WatcheRobot＋专用主机** | 京东预购整机，配网后用 SDK 控制 | 厂商文档清楚列出了水平、俯仰、表情和媒体接口 | 默认语音流程半双工。RTC 全双工是另一条链路，交期和 Linux 主机软件需核 | 大陆预购价、到手日期待核。保留在候选名单 |
| **Deskman 预装整机** | 到货后 SSH 开发，原生头部俯仰与左右转动 | Linux、本机屏幕、声音、机构都现成，公开脸和运动程序 | 7 英寸屏较大，美国发货，当前官方售价对预算不利 | Pi **US$849**，Jetson **US$1,249**。作为一体化开发对照 |
| **Hackerbot Head** | 完整头部型号列有 Pi、屏、声学与关节，交付前须确认装配状态 | Pi 5 8GB 和 LCD 眼睛可编程 | 官方目录标售罄，自定义双语字幕及供应待证 | **US$349** 缺货标价，等有货再评估 |
| **Ohbot Picoh／2.2 Assembled** | 原厂组装并测试的头部，USB 接专用主机 | 微型桌面机构确实能转头和点头，Python 接口现成 | Picoh 的矩阵眼和 2.2 的机械五官均缺可读字幕脸，音频也需处理 | **£125／224 未税**，另加主机、音频。适合作为动作参考 |
| **C1 原版** | K151＋Pi＋XVF3800 裸板，接喇叭并固定 | 绕开 K151 音频桥，可直接研究硬件回声消除 | 用户仍需安置音频电路与线材 | 历史试算 **¥4,050–4,450**。改看上面的成品音频变体 |
| **B-L 自建树莓派** | 从主控、屏幕和舵机开始装整机 | 屏幕、底座和关节可按 PRD 设计 | 两轴安装、排线和配电恰好是你要省掉的工作 | 历史预算 **¥4,565**。留作工作量基线 |
| **B-J 自建 Jetson** | 与 B-L 类似，另做 Jetson 供电与散热 | 本期即有 NVIDIA 计算资源 | 同样需要装配，现有预算也超限 | 历史预算 **¥6,739**。移出本轮验证 |
| **C2 OpenDeskBot 两种实现** | 取得板件、打印壳体、装两轴，再接 Linux | 已有可读的声学前端、停播代码和机身设计 | 两种实现都缺可核的预装整机交付，部分生产资料亦待补 | 整机总价未知。保留代码参考 |
| **C3 Whisplay HAT／HAT+** | Pi＋显示音频板，再装独立头部机构 | 一块板集成屏幕、声音和按键 | 两轴和承载头部仍需设计安装 | 仅板卡 **US$35.99／49.99**。不进入成品短名单 |
| **C4 VerdiBot** | 复用 CAD、电路，自行加工、组装及调试 | 有桌面机器人结构可参考 | 版本物料不完全一致，还需制板、改舵机和配线 | 整机总价未知。留作结构参考 |
| **C5 Reachy Mini Wireless／Lite** | 默认交付套件，约需 2.5 小时组装 | 原装动作机构和音频方案详实，Wireless 含 Linux | 需要动手装套件，两个版本都没有眼睛字幕屏 | **US$499／399**。即使有代装，仍有脸屏差异 |

11-01 的人民币金额均为项目旧预算，11-05 的板卡价只覆盖对应单品。新方案不能沿用旧总价。下文列出按一台 Jarvis 购买的数量、已含与待询项，原十条路线的零件级表格仍可逐项展开阅读。[11-05 零件级购买清单](hardware-options-comparison-and-shopping-list-2026-11-05.html)

## 首先比较的三种身体

### C6　森灵小木编程版，全套软件尽量放回机器人

**能少做哪些事。** 购买 Programming Edition 可以 SSH 登录机身，厂商提供 ROS 2／Python 主控和关节示例。示例以相对运动分别控制 `HEAD_PITCH`、`HEAD_YAW` 的角度及时间，可用于点头和左右转头。原机的显示控制、电机控制等底层模块开放范围有限。同系列使用手册写明在充电座上短按背键开机、长按 5 秒关机，需确认编程版批次能否用软件改到 PRD 要求。要复现“固定底板、身体随底座上方转动”，还应单测身体轴。小木的优势来自可以直接写应用和复用主控，底层还有明确边界。[编程版](https://www.timuai.com/order/code) · [关节源码](https://github.com/TimuTechnology/senling-xiaomu-ros2-api-examples/blob/main/src/example/example/xiaomu_move.py) · [主控开放范围](https://github.com/TimuTechnology/senling-xiaomu-firmware) · [厂商手册存档](https://device.report/m/c29d097d11ce3674b068eba20b26b9486b9fc2b928e43e85efbfdb0f89a02a6e)

| 购买项 | 数量、随附情况 | 金额或订货条件 |
| --- | --- | --- |
| 森灵小木 Programming Edition | 1 台，机内含 Linux 主控、系统存储、脸屏、关节、麦克风、扬声器及 Wi-Fi | US$380 为官方索引标价，普通版 US$330 不含相同开发承诺。人民币结算、可用存储和实际系统权限须核。[型号入口](https://www.timuai.com/order/code) |
| 磁吸底座、USB-C 充电线 | 各 1，原包装列出 | 随机，无需另购主板、屏、舵机或主机。[包装](https://www.timuai.com/order/code) |
| 国标 5V/2A 墙插 | 缺配时 1 个 | 按实际包装补齐。若配套供电不能支持全天插电，需取得厂商条件再定 |
| 聊天按键、有线扩展 | 先试原装输入。仅在外部接口确认后，才计成品 USB 按键或网络适配器各 0–1 个 | 型号和价格待定。外接按键可发聊天事件，能否在关机后开机仍取决于原机电源 |

官方底层示例要求先停止默认进程，用 `RawInputStream` 读取 16 kHz 单声道 PCM，另起线程用 PyAudio 把 WAV 音频分块送到扬声器。这比早期报告记录的证据更进一步。示例在文件播完后关闭流，没有演示人在播音中插话、回声消除或即时清空旧声。[原始音频示例](https://github.com/TimuTechnology/senling-xiaomu-ros2-api-examples/blob/main/src/example/example/hardware_raw_demo.py)

**第一项值得验证的功能**是让 Jarvis 自己播出一句豆包语音，同时持续读麦克风，再用一句插话停播并清空旧音频。随后让脸上同时出现眼睛和“我在听 / Listening”。验证时关闭原例程的摄像头线程，并确认停掉默认进程后运动和显示仍可接管。目前公开主控有预设表情消息，能否任意绘图、加载中文字库还待证明。[官方开发示例](https://github.com/TimuTechnology/senling-xiaomu-ros2-api-examples)

### 陆吾 RIG-Arm 卡卡，整机做身体，专用主机做记忆和对话

**订货名称很重要。** 官方区分 `Hand-built Full Unit` 和 `Electronics Kit`。前者预装并烧录，后者需要组装。固定底座上的五轴机械臂顶端是一张圆脸，外形和两关节伊娃有明显差异。固件中已有 `self.arm.yaw`、`self.arm.pitch` 等动作入口，可以限制姿态和幅度。到手仍需按手册检查初始姿态、配网，必要时执行原厂校准。[整机具体规格（变体 49162969514235）](https://shop.xgorobot.com/products/rig-arm-programmable-robotic-arm-steam-education-rig-series-universal-research-secondary-development-platform?variant=49162969514235) · [说明书](https://www.xgorobot.com/manual-arm.html) · [固定版本动作代码](https://github.com/LuwuDynamics/rig_omni/blob/c2b42cd73ef65f5cd2a158d6949f0273869454dc/main/boards/arm/arm_board.cc#L620)

| 购买项 | 数量、随附情况 | 金额或订货条件 |
| --- | --- | --- |
| RIG-Arm 卡卡 Hand-built Full Unit | 1 台，原装机身、5 轴、ESP32-S3、1.09 英寸 240×240 圆屏、麦克风和扬声器均在机内 | **US$124**。US$109 是电子套件价。国内同款人民币金额和实际发货日待核。[官方商城](https://shop.xgorobot.com/products/rig-arm-programmable-robotic-arm-steam-education-rig-series-universal-research-secondary-development-platform?variant=49162969514235) · [板型开发文档](https://wiki.xgorobot.com/kb/pet-arm/f7ae72301c174cbf915284b728655236) |
| 专用 Linux 整机，含系统存储、外壳、散热、电源 | 1 套。见下节统一主机规格，首轮可复用现有 Mac | 成套参考 US$200，独立日用时计入总价 |
| 机身配套充电／供电器及线、数据线 | 每种接口最多 1 套，按具体 SKU 装箱核实后补缺 | 向国内渠道核实边充边运行、插头及是否已含，保留正常静默关机要求 |
| 外部聊天按钮 | 0–1 个，仅在原机实体输入不能映射且主机能接收时购买 | 完整 USB 成品，无需改线。关机再开另验 |

官方物料列出 1.09 英寸屏和 2S 7.4V 电池。舵机由电池供电，能否按你的使用强度长期插电运行，须按原整机验证。固定版本代码根据 AEC 配置选择监听方式，关闭 AEC 时通常在播放阶段停止普通语音处理。因此原机的云端语音演示不能证明可以靠人声打断。[原厂 BOM](https://wiki.xgorobot.com/kb/pet-arm/d62767c63d18404182c870ba526bf879) · [音频状态逻辑](https://github.com/LuwuDynamics/rig_omni/blob/c2b42cd73ef65f5cd2a158d6949f0273869454dc/main/application.cc#L881) · [AEC 配置](https://github.com/LuwuDynamics/rig_omni/blob/c2b42cd73ef65f5cd2a158d6949f0273869454dc/main/Kconfig.projbuild#L182)

**主要工作**是让现有主机保管豆包凭证、会话和记忆，让 ESP32 处理声流、表情和动作。在原装固件能调用动作之后，仍要核录放并行、回声参考、立即清空播放缓冲、小圆屏双语字幕，以及主机断开时的复位行为。这条路线能明显节省机电制作，嵌入式工作量会高于能够开放原生音频的一体 Linux 机。[厂商二次开发教程](https://wiki.xgorobot.com/kb/pet-arm/f7ae72301c174cbf915284b728655236)

### K151 的三种用法，区别在于谁听、谁说、谁记

三条都买 **M5StackChan K151 标准整机**。机内有两轴、2 英寸屏、双麦克风和扬声器，附 USB-A → C 数据线。上电后用代码控制脸与动作。小屏能否让你在 50 厘米外看清眼睛下方的两行字幕，是共同取舍。DigiKey 中国单件标价 **¥818.72，含 13% 增值税**，运费按最终订单核对。[M5Stack 规格和按键](https://docs.m5stack.com/zh_CN/StackChan/) · [原厂整机与装箱单](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) · [国内 SKU 报价](https://www.digikey.cn/zh/products/detail/m5stack-technology-co-ltd/K151/29569466)

| 独立购买清单 | 已含及另购数量 | 你要开发的内容 |
| --- | --- | --- |
| **A1 单机** | K151 ×1、合规 USB 墙插 ×1、兼容 microSD ×1 用于历史与记忆。数据线随机。原装按钮和有线扩展先核，外接附件按接口核实后 0–1 套 | 自行适配豆包连接、内存与存储管理、记忆任务恢复、按钮、字幕、停播和 MCU 排障。最省桌面空间，软件移植最多。[旧 A1 分项](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-5) |
| **A2 成品身体＋专用主机** | K151 ×1、专用 Linux 整机套装 ×1、机器人 USB 墙插 ×1、维护数据线 ×1 已含。K151 资源卡 0–1 张，历史在主机。外置聊天按钮按需 0–1 个 | 业务留在 Linux，增加终端音频与控制协议、音画同步及双设备电源。Wi-Fi 桥可先用 Mac 验证，再配最终主机。[原 A2 分项](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-6) |
| **C1 成品会议麦变体** | K151 ×1、专用 Linux 整机套装 ×1、**Jabra Speak2 40 UC 有线 USB 会议麦 ×1**（2740-209，B&H 标 US$164.59）、机器人墙插 ×1。终端线随机，会议麦自带 USB 连接，资源卡／外部聊天按钮各 0–1 | 机器人负责图像与动作，声音全部经主机上的同一台会议麦。减少设备音频桥开发，增加声源位置、设备枚举和控制同步检查。[2740-209 报价](https://www.bhphotovideo.com/c/product/1759848-REG/jabra_2740_209_speak2_40_speakerphone_for.html/specs) · [厂商全双工及 AEC 规格](https://www.jabra.com/_/media/Jabra_VXi_Product-Documentation/Jabra-Speak2-40/Technical-specifications/RevB/CHS-Jabra-Speak2-40-Techsheet-A4-240423-Web.pdf) |

原厂板级接口已经有 `moveX`、`moveY` 和画文字的示例。CoreS3 的编解码驱动声明 `duplex_ = true`，固定版本固件中设备侧 AEC 默认关闭，候选板列表没有 StackChan。因此同时收放有实现基础，桌面实机的自然插话仍待验证。原装短按开、长按关与 Jarvis 要求的短按保存关机也有差异。[运动和绘字示例](https://docs.m5stack.com/en/arduino/stackchan/servo) · [CoreS3 音频驱动](https://github.com/78/xiaozhi-esp32/blob/v2.5.2/main/boards/m5stack/core-s3/cores3_audio_codec.cc#L7-L14) · [固件 AEC 选项](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/main/Kconfig.projbuild#L735-L760)

此前 A2 的录放互斥问题来自核过的社区 USB 桥。另一名作者已经替换过 K151 固件，用两只原装舵机、动态眼睛和自托管语音服务跑通自己的应用。该项目给 A2 提供了可读的网络与运动实现。要换成我们的豆包、边播边听、关机与字幕，仍需编写适配并实测。C1 成品会议麦用一条独立声学路径绕开该桥，但它改变了声音来自机器人本体的体验，是否接受由你决定。[原 USB 桥评估](../../docs/hardware-route-review-2026-11-01.md) · [作者固件与服务端](https://github.com/7H3-CH053N/StackChan-CustomFW) · [作者社区复现说明](https://www.reddit.com/r/StackChan/comments/1x1i7bk/i_gave_my_m5stack_stackchan_a_calm_moving_head/)

## 专用主机和预算怎样算

为避免把装散热、装电源盒的工作转给你，以上外接主机路线统一按**已装好机壳、存储和散热的电脑**列单。一种有公开价格且能直接开发的基准是 Raspberry Pi 500 Desktop Kit，官网列 US$200，含键盘一体主机、预置系统存储、USB-C 电源等，支持有线网络。它是一台键盘大小的电脑，V1 可放桌后，若占地无法接受，可改为已装 RAM、SSD、含电源的 Linux 兼容迷你整机并重新报价。首次短测用现有 Mac 时，当次不买主机，最终独立使用的成本仍计入。[Pi 500 规格、套装与价格](https://www.raspberrypi.com/products/raspberry-pi-500/)

以下统一用 **¥7.00／US$1 作预算情景**，方便判断余量。它是算术假设。剩余额要再扣墙插、其他配件、国内税运和备件。欧元、英镑及国内预购未知价保留原口径。

| 路线 | 已知主要商品小计 | ¥5,000 中可留给其余项目的金额 |
| --- | --- | --- |
| 小木编程版 | 380 × 7 = **¥2,660** | **¥2,340**，先核内置音频、显示和电源是否可接管 |
| 陆吾整机＋专用主机 | (124 + 200) × 7 = **¥2,268** | **¥2,732**，再核配套供电、装箱与交期 |
| K151 A1 | **¥818.72** | **¥4,181.28**，另计墙插、卡、到手费和已确认配件 |
| K151 A2 | 818.72 + 200 × 7 = **¥2,218.72** | **¥2,781.28**，另扣墙插、随单运费和必要配件 |
| K151 C1 成品会议麦变体 | 818.72 + (200 + 164.59) × 7 = **¥3,370.85** | **¥1,629.15**，三个主件均已计入。另扣墙插、配件和实际税运差额 |
| Deskman Pi／Jetson | 849 × 7 = **¥5,943**／1,249 × 7 = **¥8,743** | 仅机身即分别超 **¥943／¥3,743**，运费尚未计入 |

所有路线的 ¥5,000 都指最终独立运行的一套。USB 音频配件、第二台主机或补做电源控制都应计入各自路线。V1 不另购未来的 Jetson 节点，月度云服务费用单列。

## 其他整机与可购买的动作平台

| 方案 | 独立购买清单（每台） | 能直接复用的部分 | 决定是否继续的条件 |
| --- | --- | --- | --- |
| **或宇 WatcheRobot** | 京东预购整机 ×1、专用 Linux 整机套装 ×1、设备匹配电源／线各 1（装箱待核后补缺）。可用现有 Mac 先验证。原机含头部、屏、音频，无需另买云台。价和交期待核 | `Python SDK` 可分别控制头部水平和俯仰并改变眼睛。厂商提供部分 C SDK，部分设备与服务实现未公开 | 普通接口 16 kHz 收音与 24 kHz 整段播放互斥，官方语音模板无法抢话。RTC 需设备声明 `rtc.audio.full_duplex.v1` 并连通媒体。要实测 RTC 回声、停播、字幕，及无需 Mac 常开的部署路径。原机滚轮长按约 3 秒的电源交互也有差异。[官方总览](https://wiki.orulink.ai/) · [京东整机](https://item.jd.com/100326823811.html) · [原子能力](https://wiki.orulink.ai/products/watcherobot/capabilities) · [语音模板](https://wiki.orulink.ai/products/watcherobot/voice) · [设备指南](https://wiki.orulink.ai/products/watcherobot/device-guide) |
| **Deskman Pi 或 Jetson** | Pi 5 4GB／32GB SD **或** Jetson Orin Nano 8GB／256GB SSD 整机 ×1，均含 7 英寸触屏、音频、摄像头、电池、舵机和机身。原配充电器的国标插头按需补 0–1 个。美国发货，中国地址配送、运税及交期须核实 | 出厂已组装。两轴用于头部，第三轴控制帽子，Linux 上的脸与舵机程序可修改。直售页 Pi US$849、Jetson US$1,249 | 上轮把它仅列为自建参考，现更正。当前主要障碍是整机预算和交付。默认启动露脸、跟踪和原厂语音需改成 Jarvis 静默启动。自然插话未验。[直售与装箱](https://teleportconnect.com/buy/) · [现行规格](https://teleportconnect.com/) · [原厂源码](https://github.com/tjacobs/deskman) |
| **Hackerbot Head** | Head 独立型号 ×1，列含 Pi 5 8GB、两自由度头部、LCD 眼睛、麦克风、喇叭、控制板和墙插。核系统存储介质是否随附，缺时 1 张。插头适配器按需 0–1。无需购买行走底盘 | Python SDK 能独立调用 `bot.head.look()`，厂家给出了头部型号和组件清单 | 目录标 US$349、售罄。等有货且能确认出厂已接好内部线、LCD 可原位显示双语字幕，再谈采购。[Head 规格](https://www.hackerbot.co/products/hackerbot-head) · [库存目录](https://www.hackerbot.co/collections/all) · [SDK](https://github.com/hackerbotindustries/hackerbot-python-package) |
| **Ohbot Picoh／Ohbot 2.2 Assembled** | 两者择一 ×1，Picoh £125 未税、2.2 Assembled £224 未税。专用 Linux 整机套装 ×1，成品 USB 全双工音频设备 ×1，主机连接线 ×1（2.2 装箱含线，Picoh 按包装核）。保留脸部字幕还缺额外显示及安装方案 | 原厂已组装并测试，Python SDK 能调用点头和左右转头。Picoh 眼睛为点阵，2.2 用机械五官 | 新增屏幕会重新引入结构装配。Picoh 指南对声音从哪里输出的描述不一致，预算按独立音频核算。只为做动作验证时，Mac 可直接当宿主。[Picoh 商品](https://learn.ohbot.co.uk/store/p31/picoh_white.html) · [指南](https://learn.ohbot.co.uk/picohgetstarted.html) · [SDK](https://github.com/ohbot/picoh-python) · [2.2 预装型号](https://www.ohbot.co.uk/product/ohbot-2-2-assembled) |

## 其余原路线的购买清单和保留理由

这些路线继续列出，以便判断今后委托整机交付或调整设计时是否值得重启。数量按一台计算。下面每行的“完整物料”都能直接跳到对应零件、型号、数量、费用与依据。

| 路线 | 需要购买或加工 | 优势 | 此轮无法满足的要求 |
| --- | --- | --- | --- |
| **B-L** | Pi 5 4GB ×1、27W 电源 ×1、散热器 ×1、128GB 卡 ×1、4 英寸方屏与线 ×1、XVF3800 与 4Ω/5W 喇叭各 1、ESP32 舵机板 ×1、12V ST3215 ×2，电机电源、配电保护、双按键、轴架与底板、线束和加工各 1 套。[完整物料](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-8) | 屏幕与姿态可为 Jarvis 定做，未来加独立 Jetson 节点方便。旧方案估计仅硬件落地一项就需用户投入 43.5–77 小时。[工时拆分](bl-work-breakdown-2026-11-02.md) | 两个关节、屏幕、配电与走线须自行集成 |
| **B-J** | Jetson Orin Nano 8GB 开发套装 ×1（核 SSD、无线、电源和散热）、4 英寸屏及 DP 转 HDMI 各 1、XVF3800 与喇叭各 1、ESP32 舵机板 ×1、ST3215 ×2、电机供电、配电、双键、机械加工与线束各 1 套。[完整物料](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-10) | 本期即可测试本地 GPU | 有 B-L 的装配负担，且旧整机组合已超预算 |
| **C1 原版** | K151 ×1、Pi 主机及电源／散热／存储一套、K151 自有供电 ×1、XVF3800 USB 裸板 ×1、匹配喇叭 ×1、数据线、音频固定件及双系统按键／供电方案一套。[完整物料](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-11) | 关节已安装，声卡可提供回声参考 | 仍要连接、安放和固定音频裸板。前述成品会议麦变体才满足仅插外部成品线的口径 |
| **C2-a brufik OpenDeskBot** | 专用主机及配件一套，Base 与 LCM PCBA 各 1、1.83 英寸屏 ×1、9g 与 3.7g 舵机各 1、8Ω/1W 喇叭 ×1、天线 ×1、逻辑及舵机供电、FPC／线束、打印结构与紧固件各一套。[完整物料](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-14) | 可参考播放参考信号、声学前端与取消播放实现 | 尚缺预装整机 SKU，固定版本的生产文件还存在缺口 |
| **C2-b tudoom OpenDeskBotV2** | 专用主机一套、匹配的 V2 终端板与显示模组各 1、底座及俯仰执行器各 1、麦克风／功放／喇叭一套、打印壳与紧固件一套、兼容 USB 数据、供电及按键配件一套。板载音频按同版 BOM 去重。[独立物料及待定型号](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-16) | USB 终端协议与取消机制可参考 | 不能混用 brufik 的 PCB、固件和采购表，未核到完成总装的商品 |
| **C3 Whisplay HAT／HAT+** | Pi 及电源／散热／存储一套。普通 HAT 1.69 英寸 **或** HAT+ 2.8 英寸 ×1，按型号配扬声器及显示连线。另需驱动板 ×1、ST3215 ×2、电机电源 ×1、固定底板与双轴支架一套、电源键及线材一套。[两型号完整物料](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-17) | 减少零散板卡和音频显示接线 | 两个关节仍需自行集成，普通版的软件 AEC 经验证据也不能直接套用到 HAT+ |
| **C4 VerdiBot** | Pi 5 及电源／散热／存储一套、同版显示和专用音频／控制板各一套、匹配音频器件一套、保留的俯仰和水平执行器各 1、舵机供电、定制 PCB、打印件、轴承紧固件及线束按最终 CAD 各一套。[完整物料](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-19) | 能参考机身与电路怎样排布 | 需重新统一版本、确定 BOM 和动手制作 |
| **C5 Reachy Mini Wireless／Lite** | 两版择一套。Wireless US$499，含机内 Linux。Lite US$399，另购专用主机一套及数据线。两者均用原配电源，含运动机构与音频。两版保留脸屏需求都还缺屏幕、驱动和安装件。[两型号完整物料](hardware-options-comparison-and-shopping-list-2026-11-05.html#section-20) | 值得研究原厂音频、默认硬件 AEC 和动作 SDK | 官方两版均要求用户组装约 2.5 小时，无字幕脸。官方预装说明对应另售 Hoverboard 配件。[版本与交付方式](https://pollen-robotics.com/reachy-mini/) · [音频文档](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/media_advanced_controls) |

**对照过但没有进入采购表的项目。** ElectronBot 的颈部、腰部与伊娃式外形仍最贴近你的灵感，但当前核到的复刻站采购入口列的是套件。原作者发布的是制作资料。D-BOT 作者确有量产成品入口，公开运动硬件围绕双轮，未证明有符合要求的固定底座和独立点头、转头轴。Eilik 社区 SDK 的点头动作是组合姿态模拟。它们分别可供表情或结构参考，现有证据不足以列为本轮预装两轴采购路线。[ElectronBot 原仓库](https://github.com/peng-zhihui/ElectronBot) · [复刻站](https://electronbot.tech/) · [D-BOT 作者说明](https://github.com/SmallPond/D-BOT/blob/master/README.md) · [Eilik 的实现说明](https://github.com/strognoff/eilik-sdk)

## 样机怎样做决定

| 验证问题 | 最小验证 | 对选型的影响 |
| --- | --- | --- |
| 能否真正只写代码控制身体？ | 用交付版固件或 SDK，分别命令小幅点头、左右转，再回中。记录底板、身体和头部各自怎么动。随后断开控制连接，确认动作停止、聊天可继续 | 如需开壳或重新穿线才有一根轴，排除该交付型号。只有头部转、身体不转时，把实际动作差异交给你判断 |
| 能否使用现有豆包、方舟和本地记忆？ | 人为停用原助手，保留驱动。发送自定义中文语音并收 PCM。原地画双语字幕。结束后重启，取回上一轮明确保存的偏好 | 能做到才进入应用开发。若只开放预设台词、预设表情或厂商云，整机接管仍不成立 |
| 人说话时，它真的听得到并能停下吗？ | 20–50 厘米处让它长答，在播放中自然插入新问题。记录输入、输出队列和用户听到的停止时刻，检查只回答新问题、旧音频不会续播。随后让它独自播一段，检查是否把自己的声音当作用户。关节运动时再测一次 | 同时录放、回声消除、语音识别和立即停播是四个不同环节。先测原机，随后再决定接受外置会议麦或换型号 |
| 按钮和电源能否符合日常使用？ | 冷启动交互关闭。短按启用。独立聊天按钮开会话。短按电源键停止、保存并关机。同键再次开机。含电池机种核持续插电和恢复，两台设备核重启后各自状态 | 黑屏和系统关机分别验证。普通 USB 按键可以发起聊天，不能凭它推断能从彻底关机开机。必须开壳改电源的型号暂缓 |
| 购买后能否读清字幕，并接未来的设备？ | 用实际字体在 20 和 50 厘米各读一轮中英文字幕。查摄像头可禁用、主机有线网络可用、留给未来独立 Jetson 的连接可达。记录国内含税运金额、缺件和交期 | 1.09 英寸圆屏优先测可读性。带摄像头不自动开启视觉服务。费用以单机全套落地为准 |

**验证顺序。** 先按 K151 的 2 英寸屏实际大小，在 20 和 50 厘米处试读保留双眼的一行中文字幕。可读性合适后，再评估 K151 A2 的机身收音、播音中插话和清空旧音频。A2 日用需另配主机，初期测试可用现有 Mac。样机和采购仍待决定。

资料来自厂商商店、型号手册、开源仓库、作者社区说明及大陆购买入口。交期、价格、固件版本和现货可能变化。厂商能力、源码存在和本项目实测分开记录。产品日期与旧报价口径可分别回查。[零件级附表](hardware-options-comparison-and-shopping-list-2026-11-05.html) · [先前广搜与筛选](hardware-alternatives-review-2026-11-05.md) · [整机验收基线](../../docs/hardware-bench-plan.md)
