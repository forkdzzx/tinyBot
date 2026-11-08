# 掌心版 Jarvis｜K151 硬件技术方案
2026-11-08。你已确认方形、掌心大小合适，目前没有 K151 实机。**已确定 V1 硬件技术方案 A2：桌面摆 K151 标准整机，机身收音和发声，Linux 小主机放在显示器后方。Mac 等比例样张已通过 50 厘米的一行和两行字幕试读。** [打开脸屏实物尺寸预览](k151-screen-preview.html) · [整机实物与规格](https://docs.m5stack.com/zh_CN/StackChan/)

| 决定 | 设备及支出 |
| --- | --- |
| **Mac 已完成** | 50 厘米一行、两行均清楚。已用合成双轨验证主机消回声和 16 kHz 分帧，新增硬件 **0 元** |
| **下一阶段** | 优先借 K151。按新购估算，K151 标准版、独立聊天键和电源约 **899 元**，首批运费另核 |
| **日用组合** | **K151 ＋ U027 聊天键 ＋ 华硕 NUC 14 Essential N150（8 GB／256 GB 完整机）**。全部物料及预留合计 **3,808 元**，建议按 **4,040 元**控制。此前约 2,219 元为 K151 与另一款主机两项小计 |
| **有条件的后备** | 机身音频失败且接受桌旁发声时，再借测亿联 CP900；采用它的整套估算 **4,597 元**，预算上限 **4,940 元** |
| **开发和现场投入** | A2 设备接入沿用工作拆解 **70–150 工程小时，其中你现场 10–22 小时**，不含各路线共用的软件收尾与正式验收。机身回声和双机电源若有硬件限制，需在继续投入前更新估算。[实施清单](hardware-implementation-checklist-2026-11-08.md#a2) |

## 为什么选择这套组合

K151 自带 2 英寸 320 × 240 脸屏、两只麦克风、扬声器、两轴舵机和电池，外形约 54 × 70.5 × 61.5 毫米。原厂已经完成关节装配和机内接线。让 K151 保持这副机身和自己的声音，让主机接入豆包、保存历史和记忆、运行模式及搜索。主机体积和电源线另算，这是获得小机身的代价。家用 Wi-Fi 连机器人，有线以太网连主机，两者经家用路由互通。摄像头保留接口并默认停用。未来的 Jetson 可作为有线局域网计算节点，预算及接入测试留到扩展时。[K151 规格与整机尺寸图](https://docs.m5stack.com/en/StackChan/) · [PRD 的硬件与扩展要求](../../prd/prd-v1.1.md)

| 配置 | 适用条件 | 对项目的影响 |
| --- | --- | --- |
| **A2 机身收放音** | 已定为 V1 设计，机身插话待实测 | 保留桌面物体小、声音从脸旁发出、沿用现有 Linux 业务三项特征 |
| **C1 独立 USB 会议麦** | 机身声学未通过，而你试听后愿意接受从桌旁发声 | K151 继续管脸、关节与操作。会议麦兼任扬声器，多一件桌面设备，只在需要且整套仍在 5,000 元内时考虑 |
| **A1 仅 K151** | 未来把桌面系统收缩为一台设备的优先级高于工时 | 对话、记忆、Skill 和恢复机制需在 MCU 上重做。三个月交付优先复用现有主机软件 |

## 屏幕试读记录与复测方法

**本人反馈。** 2026-11-08，Mac 等比例样张在 50 厘米处，一行和两行字幕都清楚。设计继续采用 K151 原装 2 英寸屏，允许短句一行、较长内容两行。首次拿到机器时仍要复核真实亮度、反光和字库。

1. 打开[离线脸屏样张](k151-screen-preview.html)，用实体直尺或银行卡校准页面尺寸。在你平时坐的位置，把屏幕摆在将来想放机器人的地方。
2. 在 20 和 50 厘米各看一行和两行字幕。优先判断三件事：眼睛还有没有表情，中文是否一眼读清，以及混合英文时是否要前倾。记录最远舒适距离和你偏好的一行／两行。
3. 如果 50 厘米偏小，先试只保留一行关键词和更大的字体；如果仍不舒服，停止这款原屏的采购评估。显示比例可在 Mac 上判断，屏幕亮度、反光、观看角度与设备渲染还需要实物验证。

## 机身怎样接入当前 Jarvis

| 连接 | 具体设计与验证 |
| --- | --- |
| 机器人到主机 | K151 连接 2.4 GHz 家庭 Wi-Fi，由终端主动发起到主机的局域网双向连接。首版考虑二进制 PCM 与小型控制消息。USB-C 从固定底座接线，负责供电、刷写和诊断。原厂底座接口支持数据，机头活动时优先用底座接口。[官方使用说明](https://docs.m5stack.com/zh_CN/StackChan/) |
| 主机到豆包 | 主机保存凭证和个人资料。接入层接收处理过的麦克风音频，上行对齐现有 **16 kHz、单声道、有符号 16 位 PCM，每 20 ms 一帧（640 字节）**；下行是 **24 kHz PCM**。原厂配置两路硬件都跑 24 kHz，应让声卡保持同一时钟，把上行重采样到 16 kHz。上下行音频格式和终端时钟分开处理。[现有配置](../../prototypes/voice/config.mjs) · [采集分帧](../../prototypes/voice/capture.mjs) |
| 主机软件改动 | 当前网页服务只监听回环地址，同时校验 Host 和 Origin。需要增加独立的已配对设备入口，复用本地会话、记忆、取消和回执逻辑。保留浏览器现有权限边界，设备不持有云端 Key。终端按会话及回答编号收包，断开重连后丢弃上一轮残留。[现有服务](../../prototypes/voice/server.mjs) · [取消与迟到帧过滤](../../prototypes/voice/guard.mjs) |
| 表情与动作 | 字幕与眼睛都在 K151 本机绘制，主机只发状态、短文本和有限动作。两轴独立标定，先验证小角度点头和摇头。原厂对 Y 轴建议 5–85°，实测采用更保守的动作范围。用固定桌面底板作参照录像，确认实际转动的结构符合 PRD。订货前核屏幕批次 ILI9342C／E 及匹配的出厂恢复固件。[舵机接口](https://docs.m5stack.com/en/arduino/stackchan/servo) · [规格与安全角度](https://docs.m5stack.com/zh_CN/StackChan/) · [已核新屏适配](../../docs/hardware-route-review-2026-11-01.md) |

本轮在 Mac 上运行了 23 项现有软件检查，覆盖取消后的迟到音频、旧会话表情、播放队列与超时等。测试使用软件事件。用户真实说话、机身回声和设备停声延迟需分开记录。[语音检查](../../tests/voice.test.mjs) · [播放检查](../../tests/playback.test.mjs)

## Mac 上验证了哪一段音频

首选样机固件持续送出同步的两路数据：麦克风与功放电气参考，各 24 kHz、PCM16。未经压缩的采集方向约 96,000 字节/秒（不含网络开销）。主机先消回声，再降至豆包要求的 16 kHz 单声道。这个设计需要能在播报中继续采集的 K151 固件。生产桥还需处理采样序号、丢包和重连。原厂默认应用在 speaking 阶段停普通语音上行，设备侧 AEC 的板型白名单也未包含 K151。[原厂配置](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/main/Kconfig.projbuild#L758-L785) · [应用状态机](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/application.cc#L1046-L1055)

2026-11-08 在当前 arm64 Mac 用 Clang 编译 SpeexDSP 1.2.1 的回声消除器和重采样器。测试用 12 秒合成信号，不开启麦克风、不调用豆包。前 8 秒只有模拟扬声器，之后叠加独立近端信号。每帧采集 480 对样本，滤波后连续重采样，两次运行均得到 600 帧、每帧 640 字节，与现有服务的输入要求相符。[SpeexDSP 固定版本](https://github.com/xiph/speexdsp/tree/SpeexDSP-1.2.1) · [同步参考接口](https://www.speex.org/docs/manual/speex-manual/node7.html) · [Jarvis 收帧代码](../../prototypes/voice/server.mjs)

| 同一模拟输入，两种参考条件 | 只有扬声器时的能量衰减 | 双方同时出声时，输出与已知近端信号的相关系数 |
| --- | ---: | ---: |
| 送入正确的同步参考 | 59.54 dB | 0.964 |
| 把参考置零作为对照 | 0.13 dB | 0.841 |

该实验确认主机上的两路处理与分帧能够工作。数据采用固定线性回声模型，尚未覆盖 K151 的实际声场、失真、丢包、人声识别或停声时间。样机需从真实机身取参考，分别测机器自讲、人与机器同时说话、插话后旧声是否停止。测试口径：20 毫秒帧、100 毫秒回声滤波器。模拟回声为远端信号延迟 3、14、30.5 毫秒后分别乘 0.52、0.18、−0.09 再求和，6–8 秒统计能量，9–12 秒统计相关。

### 已确认 A2 后的首轮 Mac 联调

把上述 24 kHz 合成双轨经 SpeexDSP 处理得到的音频，按 20 毫秒节拍送入项目真实的本机 WebSocket `/voice` 入口。云侧识别与播报由本地测试服务模拟，播放节点使用虚拟时钟。整套测试在隔离目录进行，未调用豆包或写入个人历史。[语音服务与端点](../../prototypes/voice/server.mjs) · [回答取消保护](../../prototypes/voice/guard.mjs) · [播放器与回执](../../prototypes/voice/playback.mjs)

| 用例 | 观察结果 |
| --- | --- |
| 上行帧 | 600 帧、每帧 640 字节，共 384,000 字节。经服务转发到模拟上游后 SHA-256 与输入一致，额外的 638 字节无效帧未被转发 |
| 插话控制 | 模拟上游发出开始说话事件后，服务发送一次取消。取消确认前后注入的三包旧回答音频与旧文本均被拦下，新回答进入播放器 |
| 回执与保存 | 临时会话中旧回答记为已中断，新回答记为播放完成。实机仍需验证 K151 自然收音能否产生正确的插话事件、机内扬声器何时真正停止 |

## K151 机内收放、回声参考与停播证据（11 月 8 日）

**K151 的机身音频值得借样验证。** 电路已经把实际扬声器输出接回采集芯片。M5 的机器人专用固件公开了共享音频时钟、采集麦克风和参考信号、写扬声器的实现，有条件先做整机单样测试。当前证据没有给出 Jarvis 播报中听清另一人、拒绝自声触发、按时停声的实测成绩。[K151 官方规格与原理图入口](https://docs.m5stack.com/en/StackChan/) · [K151 专用固件的板型配置](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/main/hal/board/config.h#L8-L21)

| 要核的问题 | 源码与图纸给出的结果 |
| --- | --- |
| 播放参考从哪来 | 主机 CoreS3 V1.0 原理图 PDF 第 4 页显示，两颗机身麦分别进 ES7210 的 MIC1、MIC2。AW88298 的 SPK_VOP、SPK_VON 经 R40、R42 及耦合网络形成 AEC_P/N，接入 ES7210 的 MIC3P/N（31、32 脚），MIC4 接地。这是一条功放输出端的电气回采，保留机内音频有实际的硬件依据。它不能单独消除经空气、桌面传振和房间反射返回麦克风的声音。[原厂电路图，第 4 页](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/490/Sch_M5_CoreS3_v1.0.pdf#page=4) |
| 实际怎样同时收发 | M5 的 StackChan 固件选择 `BOARD_TYPE_M5STACK_STACK_CHAN`，板级 `AUDIO_INPUT_REFERENCE=true`，收发均为 24 kHz。BCLK 34、WS 33 为共用 GPIO，MCLK 0，麦数据输入 14，喇叭数据输出 13。构建脚本编入小智的 CoreS3 codec，先在同一个 I²S0 主控制器一次申请 TX/RX 两个句柄。专用补丁对齐每采样帧的 64 个位时钟，接收为四个 16 位时隙，输出为两个 32 位时隙，保留上层单声道 PCM16，再扩展到 32 位交给功放。应复用完整板型与补丁。若主机协议需要 16 kHz 上行，可在统一采样之后重采样。[构建锁与补丁](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/repos.json#L17-L23) · [编译入口](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/main/CMakeLists.txt#L146-L153) · [I²S0 成对分配](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/boards/m5stack/core-s3/cores3_audio_codec.cc#L93-L108) · [K151 音频补丁](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/patches/xiaozhi-esp32.patch#L478-L523) |
| 哪一路是参考 | codec 使能 MIC1/2/3。ES7210 采用 TDM I²S 模式，四槽发送顺序为 1、3、2、4。原厂补丁把 RX 物理时隙数设为 4，沿用上游的槽 0、1 掩码，故按设计输出的两路依次是 MIC1 与功放回采 MIC3，物理第二只麦没有进入这两路。锁定的 esp_codec_dev v1.6.2 把 slot mask、总槽数与半帧 WS 宽度实际写入 TDM 配置。不同样机仍应播放已知波形，确认实得槽序、增益、削波和延迟。[ES7210 原厂数据表图 2e](https://files.waveshare.com/wiki/common/ES7210_DS.pdf) · [输入掩码](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/boards/m5stack/core-s3/cores3_audio_codec.cc#L190-L206) · [乐鑫驱动的 TDM 配置](https://github.com/espressif/esp-adf/blob/af7b72fb2b73d4f513d3cede01c13518ab216735/components/esp_codec_dev/platform/audio_codec_data_i2s.c#L362-L392) |
| 启动原厂应用是否就能插话 | 普通小智 `m5stack/core-s3` 的参考输入默认为 false，而 K151 专用配置为 true。小智 AFE 能根据通道组成 MR，将唤醒词检测与实时语音 AEC 分开控制。K151 固件的 `USE_DEVICE_AEC` 默认 n，且允许列表未包含 StackChan，`USE_SERVER_AEC` 也默认 n。默认路径在 speaking 状态关闭普通语音处理，仍可能监听唤醒词。验证自然插话需要显式选择并验证设备端 AEC＋实时上行，或把同步 MR 交给受控主机处理。原厂 Mic Test 先收音，再关闭输入并回放，不能验收双讲。[普通 CoreS3 默认值](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/boards/m5stack/core-s3/config.h#L8) · [K151 Kconfig](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/main/Kconfig.projbuild#L758-L785) · [AFE 开关](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/audio/engines/afe_audio_engine.cc#L384-L390) · [speaking 分支](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/application.cc#L1046-L1055) · [原厂麦克风测试](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/main/hal/audio.cpp#L70-L103) |
| 收到取消后何时真的停声 | 上游 `AbortSpeaking` 置标志并向服务器发 abort。另一路 `ResetDecoder` 递增播放代次、清解码和播放队列，过期的在途解码结果也会丢弃。播放线程已取出的 PCM 会在锁外送入 codec，K151 补丁按约 10 ms 分块循环写入，循环内没有代次检查。现有软件队列状态和协议 abort 都无法给出扬声器实际停声时刻。Jarvis 要在设备侧同时丢弃晚到旧轮次包，处理已经取出及 DMA 中的音频，保持 RX 连续，用独立录音测从用户起声到旧声停止的时间，并验证取消后旧声不会回来。[协议 abort](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/application.cc#L1175-L1181) · [清队列与代次](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/audio/audio_service.cc#L798-L816) · [已取出音频的输出](https://github.com/78/xiaozhi-esp32/blob/49b4380b3faa0ceadd28a3e78aaf0f311c46c57e/main/audio/audio_service.cc#L335-L351) |

M5Unified 是另一条驱动路径。它把 StackChan 两端配置在 I²S1，Mic 与 Speaker 各自申请单向句柄。其 CoreS3 麦克风初始化关闭 MIC3/4 电源，普通录音示例不提供所需的功放参考。保留 M5Unified 画屏或驱动其他外设时应让带补丁的音频驱动独占音频引脚。即使两个软件控制器编号不同，仍使用同一组板级 BCLK/WS。[麦克风的默认寄存器](https://github.com/m5stack/M5Unified/blob/96576a14247ddc935149145aa6b51943464120f1/src/M5Unified.inl#L1017-L1066) · [机内麦配置](https://github.com/m5stack/M5Unified/blob/96576a14247ddc935149145aa6b51943464120f1/src/M5Unified.inl#L2136-L2150) · [机内扬声器配置](https://github.com/m5stack/M5Unified/blob/96576a14247ddc935149145aa6b51943464120f1/src/M5Unified.inl#L2357-L2367) · [Mic 分配 RX](https://github.com/m5stack/M5Unified/blob/96576a14247ddc935149145aa6b51943464120f1/src/utility/Mic_Class.inl#L324-L327) · [Speaker 分配 TX](https://github.com/m5stack/M5Unified/blob/96576a14247ddc935149145aa6b51943464120f1/src/utility/Speaker_Class.inl#L202)

锁定版本包括 M5Stack StackChan `28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400`、其依赖小智 v2.5.2 `49b4380b3faa0ceadd28a3e78aaf0f311c46c57e`、esp_codec_dev 1.6.2 对应 esp-adf `af7b72fb2b73d4f513d3cede01c13518ab216735`，以及独立比对的 M5Unified `96576a14247ddc935149145aa6b51943464120f1`。本次核查覆盖原理图、固定版本源代码、组件和原厂构建补丁。没有刷写或测试实体 K151。

## 专用主机、第二颗实体键与购置费用（2026-11-08）

推荐询价对象为 **ASUS NUC 14 Essential，N150／8GB DDR5／256GB SSD**。中国渠道有经销商组装的整机套餐，向店家核对铭牌 `NUC14MNK`／`NUC14MNK-B`、内存、SSD、AX211 无线卡、65W 原配电源及国标线全部装齐再买。只需插外部标准线。135 × 115 × 36 mm，可藏显示器后方并留出散热和 RJ45 弯折空间。华硕同系列资料列有 RTL8125D 2.5GbE、Wi-Fi 6E、多个 USB-A/C，Kit 规格页明确支持 Ubuntu 24.04 LTS 64 位；官方预装 Mini PC 的系统栏列 Windows，经销商预装内容须单独核对。8GB 依据是当前角色仅承担云语音接入、调度、文件存储与状态服务，本地大模型或 GPU 推理另算。已有 Mac 只作首轮台架、烧录和维护。11 月 3 日的京东比价记录为 2599 元，非今日结算报价。后续 Jetson 可独立供电接同一有线局域网，本机仅一只 RJ45，需要家中路由器或交换机有空口。[华硕技术规格，第 9–13 页](https://dlcdnets.asus.com/pub/ASUS/NUC/NUC_14_Essential/E25722_NUC14MNB_NUC14MNK_TPS_EM_V2_WEB.pdf?model=NUC14MNB) · [国内在售配置](https://www.jd.com/jiage/67093649c7ea35dfe15.html?electedExtAttrSet=149%2C&extAttrValue=expand_name%2C%4069706%3A%3A149&sort_type=sort_default) · [11 月 3 日促销索引](https://faxian.smzdm.com/h0s183t0f291c0p22/)

| 项目（各 1 件） | 基准 / 预算封顶（元） | 下单规格及接法 |
|---|---:|---|
| M5Stack StackChan K151 | 819 / 900 | DigiKey 中国单件含税 818.72。选带 CoreS3 的 K151 整机，有 USB-C 数据线；A180 仅机身，K151-R 多遥控器。[中国渠道](https://www.digikey.cn/zh/products/detail/m5stack-technology-co-ltd/K151/29569466) · [厂家装箱及接口](https://docs.m5stack.com/zh_CN/StackChan/) |
| M5Stack Unit Button **U027** | 30 / 40 | 预算数，官方店 US$2.25。32 × 24 × 8 mm 带壳按键，附 20 cm Grove 线，外接 K151 PORT.B，白线按两份引脚表对应 GPIO8。轻按开始会话，只在交互已启用时生效；原侧面电源键独立。原机列出电源键、复位键和机顶三段电容触摸。独立机械聊天键采用 U027。接好后先以小角度慢速水平转头、再点头，观察线从哪个部件引出，检查拉扯与绕线；布好余量和动作限位后再扩大范围。底座 USB 的固定走线不能替代 Grove 线的实测。[规格与引脚](https://docs.m5stack.com/zh_CN/unit/Unit_Button) · [官方店](https://shop.m5stack.com/products/mini-button-unit) |
| K151 独立 USB 5V 国标适配器 | 50 / 60 | 工程预留，选与随附数据线匹配、可稳定供电的 5V 适配器，插底座 USB-C，留出转头余量。建议试 5V/2A 或以上容量并实测运动与放音峰值。 |
| NUC 完整成品 | 2599 / 2700 | 套装内含内存、SSD、65W 原配适配器、无线网卡。确认能外接 U 盘安装 Linux、可退换；上述型号须写入商家报价。 |
| Cat5e/6 网线 | 20 / 30 | 从 NUC 接现有家用路由器 LAN 口，按桌面至路由实际距离选择。 |
| 32GB 安装 U 盘 | 50 / 60 | Ubuntu 安装及恢复；已有可复用。借现有显示器、键鼠首装，后续 SSH 维护。 |
| 国标电源线、固定贴和理线件 | 40 / 50 | 主机套餐缺国标交流线时用此项补齐，避免另购底座或加工外壳。 |
| 运费、差价和杂项余量 | 200 / 200 | 覆盖本轮成品分批下单的估算。 |
| **内置音频整套** | **3808 / 4040** | 估算，含以上余量。历史 A2 的 3390–3790 使用不同主机占位。 |
| 条件选配：亿联 **CP900 Teams-SZ** 成品 USB 全双工会议扬声器 | 789 / 900 | 仅当内置音频失败且同意桌面多一个有壳声源，接 NUC USB，统一承担录放音，停用 K151 的音频通路。直径 132.5 mm、高 35.5 mm，保留无遮挡拾音。亿联列 USB、回声消除和全双工；CP700 在官方两机对照表只列 auto duplex。789 为国内同型号公开参考价，Linux 枚举及播报中插话仍须实测。[亿联规格](https://www.yealink.com.cn/product-detail/microsoft-teams-speakerphone-cp900) · [厂家对照](https://support.yealink.com/docs/cp700/speaker-phone-comparison/40ee7b04d559428eb94936d465849b20) · [国内同型号报价](https://detail.zol.com.cn/phonemeeting/index2128792.shtml) |
| **采用外接音频整套** | **4597 / 4940** | 封顶情形距 5000 元只余 60 元。任何缺件、必须增购的路由设备、额外电源控制器均须重新合计。V1 无需购买 Jetson、扩展摄像头、额外电机或原始录音存储。 |

**分三次作决定。** 第一步只购或借 K151、U027 与所需电源，基准 899 元、未摊运费。用当前 Mac 完成回刷、显示实物验读、独立聊天键、同步录放和持续 USB 下 PMIC 关断/同键再开。第二步在这些项已有明确结论、家中能拉网线且收到整机报价后购买 NUC；优先用电脑现有网卡验证该路由环境实际传得通魔术包。借不到同型号时，NUC 的 S5、Linux 驱动与五轮整机验收安排在到货可退换时限内。第三步仅在自然插话仍失败、使用者接受前方另放声源、且价格仍在总预算时借测或购买 CP900，重新做与原机相同的插话试验。若使用者坚持声源出自主体，外接扬声器不满足该体验。

## 两台机器共用原机电源键的实现与验证

1. **成立的硬件条件**。华硕 TPS 第 22 页明确有线 LAN 能从真正的 S5 软件关机唤醒，Deep S4/S5 会禁用相关唤醒。设置 BIOS 的 S4/S5 WoL 为正常开机，关闭 Deep S4/S5；Ubuntu 查 `ethtool` 的 `Supports Wake-on` 含 `g`、实际 `Wake-on: g`，将 magic-packet 配置持久化，重启再读回。主机使用 65W 电源接市电和有线网，K151 连同一广播域的家用 2.4GHz Wi-Fi。不同 VLAN、访客客户端隔离、广播被过滤或只有 Wi-Fi 的主机都须重新设计。先用另一个设备发送，再换 K151 特定 MAC 的魔术包；两端互相能 ping 不代表 S5 能唤醒。[华硕型号级电源表](https://dlcdnets.asus.com/pub/ASUS/NUC/NUC_14_Essential/E25722_NUC14MNB_NUC14MNK_TPS_EM_V2_WEB.pdf?model=NUC14MNB#page=22) · [华硕 BIOS 指南](https://www.asus.com/np/support/faq/1052580/)
2. **完整按键顺序**。初次合闸，两端启动至黑屏未启用，可将 NUC 设置为通电自启并单测冷上电；软件关闭麦克风、主动交互和云连接。短按一次 K151 电源键启用眼睛，独立 U027 才开聊天。运行中再短按 K151 电源键，立即停止交互和旧播报，给 Linux 发送带请求编号的关机指令；Linux 持久化文字、记忆待处理队列，落盘后确认已受理，执行 `systemctl poweroff`。K151 收到确认后关闭舵机、调用 PMIC 关机；ACK 只代表受理，Linux 进入 S5 另以实测判断。若控制链路失效，立即停交互、可见故障、保留可重试的未完成指令；避免直接切断 NUC 电源。双方已关后，用户短按同一个 K151 侧键使 ESP32 开机，固件在本地连 Wi-Fi、向 NUC 发送魔术包并等待就绪，保持黑屏；下一次新的短按才启用眼睛。首次通电、软件重启、看门狗复位和用户关机后按键启动要区分，防止无意重启导致自行唤醒主机。
3. **K151 决定能不能维持这一方案**。官方只保证单击开机、长按关机，AXP2101 数据及成品 PMIC 短按事件可作为开发入口。裸台烧录后，分别测底座 USB 适配器持续接入与电池供电，确认可读单次短按、软件 PMIC 关机后 ESP 与舵机停止，静置至少 10 分钟没有自启动，再按同键可开。正常验收始终用预定的底座 USB 和原电池，测试时不要连第二根供电或烧录 USB。观察 USB 电流、串口/启动原因、状态与下次全新 boot ID；黑屏、Wi-Fi 断连或充电灯单项不足以证明关机。当 USB 会持续触发上电唤醒，单改软件熄屏无法满足这个条件。两设备回到各自实体键可用于排障，常态用两键开机或将 NUC 常开都需用户另行接受。能重新证明时才建议引入现成外置电源控制器，避免柜内改线、剪线和搭继电器。[K151 打开、关闭、复位和原理图](https://docs.m5stack.com/zh_CN/StackChan/)
4. **到货验收**。在同一 Wi-Fi、真实墙充条件下完成至少五个完整电源循环，含第一次冷合闸和关机后分两次短按。保存每轮主机的 shutdown journal、boot ID、K151 启动原因及按键日志，核对上一答文字/待办均可恢复；任选轮次在关机过程中连按、故意断开家用外网但保留局域网，再验证启用及掉线提示。每次本机收音与云连接只在有效会话时开启。外接 CP900 若启用，另做 20–50 cm 真实播放中插话 10 次至少 9 次在 1 秒内停旧音，并观察播报单讲自激、双讲吞字、重新开机外设是否静音。有线 WoL 或 K151 PMIC 任一项反复失败，保留已购 K151 的使用价值，停在台架并单列实际缺口；不可将 S3 睡眠、黑屏或主机第二颗电源键计作 PRD AC-01 成功。

厂家 M5Unified 的 AXP2101 驱动实际实现了 `getPekPress()`（读取并清除 0x49 的短／长按位）和 `powerOff()`（设置 0x10 的软件关机位）。芯片数据手册给出 0x20 开机来源，可区分 PWRON 按键和 VBUS 插入；应结合 ESP32 自身的复位原因，避免把看门狗复位当作新的开机按键。上述寄存器和 API 解决的是按键事件获取与发出关机指令，K151 底座在墙充常插时是否保持关机仍须验证。[M5Unified 驱动](https://github.com/m5stack/M5Unified/blob/master/src/utility/power/AXP2101_Class.inl) · [X-Powers AXP2101 数据手册 6.13.2.17～18](https://bbs.aw-ol.com/assets/uploads/files/1679023464800-b7d68587-d5fa-4088-ad99-ae143dcc53e7-axp2101_datasheet_v1.0.pdf)

## 从样机到定型

| 顺序 | 需要的设备 | 通过条件与下一步 |
| --- | --- | --- |
| 1. 看脸屏 | 现有 Mac，支出 0 元 | Mac 试读已完成。你确认 50 厘米时一行、两行都清楚；后续在真屏复核字库与反光 |
| 2. 核机身 | K151 ＋ Mac | 记录 SKU、屏批次、固件和恢复步骤。原生屏绘字、两轴分开运动。录放并行时分辨本人声音和机器人自身声音。默认不保存原始录音 |
| 3. 自然插话 | 同上 | 20 与 50 厘米各 5 次，10 次至少 9 次在 **1 秒内听到旧声音停止**，按新问题回答且不续播。额外安排只有机器人自己讲以及舵机动作两种对照。用机身队列清空回执配合现场听感，不以云端已取消代替停声 |
| 4. 双设备与预算 | 借测或备齐的日用主机及 K151 | 家用 Wi-Fi 和有线主机互通。按一次立即停交互并安全关机，同键再开到黑屏未启用，再按一次启用。聊天用独立输入。连续 5 次完整循环，包括 USB 持续供电时，核无人为补按、自动重启或遗失历史。最终含税运和附件总价不超过 ¥5,000 |
| 5. 日用交付 | 选定整机 | 离开 Mac 后仍可独立运行，10 轮连续对话、20 个普通问题至少 18 个三秒内开始有效回答、3 次断网恢复和 8 小时混合运行。录入最终 BOM、实测版本和主观体验。[完整验收](../../prd/prd-v1.1.md) |

**当前结论。** 你已确认 A2 和 K151 机身，先在现有 Mac 上联调，再以 K151 样机验证音频、动作和电源。原屏已通过 50 厘米等比例试读。机身音频与双机电源各自待插话实测和五次开关机记录确认。采购仍需你另行决定。[项目工作清单](../../docs/work-checklist.md)
