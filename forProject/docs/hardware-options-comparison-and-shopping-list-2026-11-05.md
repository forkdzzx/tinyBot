# Jarvis 全部硬件方案对比与购买清单

> **11-07 更新**　预装整机优先级、最新声音接口与单机清单见[整机交付与全部方案购买清单](hardware-options-and-shopping-list-2026-11-07.html)。本文保留原十条路线的零件明细。

编制日期：**2026-11-05，Asia/Shanghai**。用途：供你逐项阅读、比较和选择验证方向。**当前尚未确定路线、下单或完成任何整机硬件验收。**

本文件统一覆盖 **10 条主路线：A1、A2、B-L、B-J、C1～C6**。C2 的两个实现、C3 的两种板卡分别列出；C5 额外说明 Lite 变体。此前广搜中筛除的项目仍保留在[调查报告](hardware-alternatives-review-2026-11-05.md)，没有把它们包装成已经具备完整采购条件的新方案。

## 阅读顺序与清单口径

建议先看下面两张总表，再读感兴趣路线的独立购买清单，最后看共同工具和选型门槛。每条路线均列出自身必需的硬件类别，尽量不让你在多个文件之间来回拼清单。

购买清单中的状态有明确含义：

| 标记／用语 | 含义 |
| --- | --- |
| 另购／成品候选 | 有对应商品或明确型号，但还需要核对中国到手价、库存与兼容性 |
| 已含／套餐内 | 随所列整机或套装提供，不重复加购；仍应按最终订单清单核实 |
| 待核／条件购买 | 接口、数量、随附配件或适配结果尚不确定，不能直接形成订单 |
| 代工／定制 | 需要制板贴片、打印、加工或改线；提供的是文件/规格入口，不是现货购买链接 |
| 旧预算占位 | 11-01等历史规划金额，为比较保留，不是本轮商家报价 |
| 本轮挂牌价 | 11-05公开页面显示金额；不代表国内含税运到手价，也不代表已有库存 |

数量按一台 Jarvis 计划；“一套”代工件仍需工程图和制造文件才能询价。无法核定的型号、价格和数量明确写“待定”，**不以0元填空，也不把只买主板的价格当整机价格**。已含零件不能与另购行重复计费。所有硬件均不含云端使用费；开发继续用现有 Mac，最终运行不隐含依赖这台日常电脑常开。

这里的“支持音频”分四层：能够录放、能够同时录放、具有实际回声消除路径、整机能自然插话。前三层有文档或代码证据，也不能替代第四层实测。下文“有基础”均不是验收通过。

## 一眼比较：优势、劣势与费用

| 路线 | 实际搭什么 | 最主要优势 | 最主要劣势 | 当前成本信息 | 适合的取舍 |
| --- | --- | --- | --- | --- | --- |
| **A1** | K151单机 | 本体、脸屏和两轴现成；设备数量少 | 现有Linux/Node业务需大量移植；音频、电源与长期存储仍要验证 | 旧完整分配 **1480–1880元** | 愿意用更多嵌入式开发换小体积和较低硬件费用 |
| **A2** | K151＋专用Pi | 现成身体＋保留Linux业务 | 设备音频桥是核心难点；另有小屏与双系统电源 | 旧完整分配 **3390–3790元** | 重视成品身体，并愿意开发设备固件/协议 |
| **B-L** | Pi＋独立屏/音频＋自建双轴 | 最便于按当前需求选择屏幕与接口；业务可延续 | 机械、电源、走线和整机集成工作多 | 旧完整分配 **4565元** | 希望保留脸屏与扩展自由，能接受较多现场装配 |
| **B-J** | Jetson＋独立屏/音频＋自建双轴 | 本期直接拥有NVIDIA计算平台 | 当前组合超预算；装配工作并未减少，V1云端对话不需要这份GPU算力 | 旧组合测算 **6739元** | 愿意追加预算并明确近期本地计算用途 |
| **C1** | K151脸/动作＋Pi＋外置USB音频 | 保留成品机械，绕过K151音频桥 | 外置模块增加；显示/动作协议与双系统电源仍要做 | 旧增量试算 **4050–4450元**，安装/电源变化另核 | 接受小屏、旁置主机和音频，优先减少机械工作 |
| **C2** | OpenDeskBot开源终端＋Pi | 有结构资料及实际AEC/取消播放代码可借鉴 | 终端成品供应未确认；可能需PCBA/打印；AEC有退化路径 | **完整总价未知** | 接受开源套件/代工，愿意先核可复制性 |
| **C3** | Pi＋Whisplay板＋自建双轴 | 集成屏幕、音频与按钮，减少分散接线 | 机械仍要做，软件AEC待测；板卡尺寸限制布局 | HAT **US$35.99**／HAT+ **US$49.99**，仅板卡价 | 希望精简B-L部件，能接受较小屏幕与软件音频调试 |
| **C4** | 复用VerdiBot结构/电路 | 不必从零画完整结构，可参考一体化布局 | BOM版本未统一；改舵机、制板焊接可能费时 | **完整总价未知** | 重视学习与结构复用，能接受较多制作工作 |
| **C5** | Reachy Mini Wireless套件 | 自带Linux、机械和XVF3800；集成度高 | **无眼睛/字幕脸屏**；国内交期和电源交互需核 | **US$499**整机套件挂牌，税运另核 | 可以改变脸屏设想，希望少做本体选配 |
| **C6** | 森灵小木编程版 | 国内成品，已有Linux与动作/麦克风API | 能否全面接管音频和主程序尚未证明 | 编程版 **US$380**挂牌，国内订单条件待核 | 愿意先确认厂商开放接口，优先减少装配 |

价格依据见各路线表格。人民币旧分配与美元商品价不能直接横向排序；目前没有十套都核实完成的含税运人民币总账。尤其 C2/C4 的“未知”不是“很便宜”，A1低物料费用也不代表开发最省时。

## 按你的核心需求比较

| 路线 | 自主软件与现有代码 | 自然插话的依据/缺口 | 脸屏与动作 | 本体制作负担 | 后续扩展 |
| --- | --- | --- | --- | --- | --- |
| A1 | 可自写固件；当前Node/本地文件流程不能原样部署 | 芯片/驱动有路径，目标固件与AEC效果待验 | 2英寸屏、成品两轴 | 低；电源改造另算 | 主机资源受MCU限制；外设与网络协议需开发 |
| A2 | Linux业务可复用；新增终端桥 | 已核社区桥录放互斥，不能直接满足插话 | 2英寸屏、成品两轴 | 低；新增主机摆放 | 主机扩展强，身体内部空间有限 |
| B-L | Linux业务可复用；做设备适配 | XVF3800有硬件AEC基础；摆位与整机效果待测 | 约4英寸方屏、按需求搭双轴 | 高 | 摄像头/有线网络/外设最容易自行安排 |
| B-J | Linux业务可复用；核JetPack和驱动 | 与B-L相同音频思路，GPU不自动解决回声 | 约4英寸方屏、自建双轴 | 高 | 本期有GPU，但功耗/散热/空间也需规划 |
| C1 | Linux业务可复用；K151只接表达和按键 | XVF3800独立链路绕过原音频桥；仍待实测 | 2英寸屏、成品两轴 | 低到中；音频需固定 | 主机扩展强，成品身体扩展有限 |
| C2 | 业务放Linux；新增USB或WebSocket设备适配 | 有AFE/AEC及停播代码；具体路径可能关闭或退化 | 约1.83英寸屏、已有两轴设计 | 中到高；取决于成板/代装 | 主机可扩；终端接口/机壳需改版 |
| C3 | Linux可复用；普通HAT显示需专门适配 | 普通版有软件AEC示例，HAT+须另测 | 1.69或2.8英寸；两轴另建 | 中到高 | Pi扩展可用，但HAT占总线和布局空间 |
| C4 | Pi方向可保留业务；硬件版本先统一 | 电路有音频不等于已有有效AEC | 屏幕BOM有冲突；原结构需裁剪 | 高或未知；取决于代工 | 可改CAD/PCB，但升级可能需要重制 |
| C5 | Linux/SDK可开发；豆包适配仍需做 | 官方明确默认XVF3800 AEC；我们的插话验收未做 | **无脸屏**；动作能力丰富但结构不同 | 套件装配与调试，低于从零设计 | 有可编程主机；实际外部接口/有线节点另核 |
| C6 | 已有SSH/SDK；能否完整替换系统待核 | 原始麦克风可读，不足以证明PCM输出/停播/AEC | 有成品表情/动作；字幕自由度与关节映射待核 | 低；深度修改未定 | 取决于底层开放程度与内部资源 |

“本体制作负担”仅比较装配、结构和电气，不是项目总工时。A2/C1等可以少做机械，却可能多做固件和协议。全部路线都仍要完成共有的搜索、主动搭话、记忆质量和最终验收。

**所有候选尚未证明完全符合单键电源循环。** 原要求仍是：通电启动但交互未启用；按一次启用；再按保存并关机；再次按键开机后回到未启用状态。聊天键单独负责开始会话，正常使用不依赖长按。成品自带电池、摄像头或其他按键行为，必须逐项确认差异，不能默认改PRD。

未来NVIDIA扩展按“增加独立Jetson节点并联网协作”评估，不是承诺把Jetson作为普通PCIe显卡插入任一主控；V1不重复采购未来节点和摄像头。

## A1：K151 单机，直接连接云端

**优势：** 三者中硬件费用和桌面占用最低，屏幕、声音、动作与结构已集成。云端负责模型推理，不能因为主控是 MCU 就认定无法使用大模型或保存记忆。

**劣势：** 现有 Node／浏览器程序不能直接运行于 ESP32 固件；要在受限内存与存储环境移植业务、恢复逻辑和运维。音频收放、回声处理和即时打断需要固件级验证。未来更换屏幕或音频布局自由度较小。

**剩余开发：** 自主豆包／方舟协议接入；会话与模式控制；文字历史、记忆和提炼任务恢复；本地配置和排障入口；屏幕字幕；按键电源流程；音频 AEC、插话与旧输出取消；运动调度和故障隔离。已有社区示例可借鉴，但尚无满足整套 Jarvis 的现成固件。

**主要需求差异：** 从 Linux 文件与进程管理变为 MCU 固件及 SD 管理；2英寸屏需验证可读性；有线连接未来独立 Jetson 的路径未成立，不能把 Wi-Fi 等同于已满足有线预留。后两项不是自动删需求的理由。

**购买清单——A1 独立列全：**

| 物品 | 数量 | 用途 | 采购／适配状态 | 商品或规格链接 | 价格性质／旧预算位置 |
| --- | ---: | --- | --- | --- | --- |
| M5StackChan K151 标准整机 | 1 | MCU、脸屏、两轴、麦克风、扬声器与成品结构 | 另购，锁定屏幕批次；无需再买一套 CoreS3/舵机/屏幕 | [K151 商品](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) | 当前 US$99；旧人民币到手占位 800–1200 元 |
| K151 内置屏、双轴、音频、电池及摄像头 | 各随整机 | 本体交互；电池/摄像头本期不启用新功能 | 已含，0新增；并非额外购买项 | [规格](https://docs.m5stack.com/en/StackChan) | 已计整机，不能重复加价 |
| USB-A→C 数据线 | 1 | 烧录、供电与维护 | 官方商店已含50cm线；长度不够才替换 | [装箱清单](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) | 0新增；替换线进入下面线材包 |
| K151 兼容 microSD | 1 | 本地完整文字历史、记忆及必要资源 | 另购；品牌、容量、格式按最终固件核定 | [microSD接口](https://docs.m5stack.com/en/StackChan) | 旧占位80元；未取得具体卡报价 |
| K151 USB电源适配器 | 1 | 独立插电运行 | 另购；中国插头、输出和峰值能力待冻结 | [供电规格](https://docs.m5stack.com/en/StackChan) | 旧占位70元；不是最终型号报价 |
| 电源键／聊天键及接线、必要电源管理适配 | 电源和聊天各1个功能入口，适配1套 | 实现聊天触发和指定开关机循环 | 需改造／型号待定；现有物理键能复用时不重复买；现有触摸区不自动等于实体聊天键 | [原机电源行为与电路](https://docs.m5stack.com/en/StackChan) | 合计旧占位120元；完整电气方案未冻结 |
| 固定件、底托、必要替换线／读卡器／接头 | 1套 | 固定、防拉扯、刷卡与维护 | 另购／型号待定；读卡器若已有可复用 | [接口及尺寸](https://docs.m5stack.com/en/StackChan) | 合计旧占位160元；清单随接口方案细分 |
| 未来有线计算节点连接预留的适配件 | 0–1套，方案待定 | 如保持PRD有线扩展要求，为未来Jetson留连接能力 | 型号待定、兼容路径未核；不能现在盲购网卡模块 | [现有扩展接口](https://docs.m5stack.com/en/StackChan) | **未计入旧总额，仍是需求/预算缺口** |
| 必要加工／焊接服务或工具补齐 | 按改造量 | 按键、电源或固定件改造 | 条件项；用户当前没有完整工具时应计外协或工具费用 | 无已确认商品；由最终适配图确定 | 优先从返工项核算，超过余量另计 |
| 运费、税费差额、返工与备件预留 | 1项 | 覆盖非器件本身费用 | 预算预留，不是商品 | 按实际收货地址与加工报价 | 旧占位250元；不得视为固定包干价 |

**旧预算合计：1480–1880元**＝K151 800–1200＋SD80＋电源70＋按键电源120＋固定线材160＋余量250。该数未解决有线扩展等未定项，不是本轮已核到手总价。

## A2：K151 负责完整交互，专用 Linux 主机负责业务

**优势：** 现有会话、记忆与 Skill 程序可继续运行在 Linux；K151 提供成品机械和脸部，节省双轴结构设计。主机可以保留摄像头接口和未来有线 Jetson 连接。此优点与 B-L 共享。

**劣势：** K151 不是已验证的即插即用 USB 声卡。11-01固定版本社区 USB 桥录放互斥，需要开发其他完整音频路径或修改固件；这属于所核实现的限制，不等于 K151 硬件不能全双工。此外有两套运行状态、控制协议和供电管理。

**剩余开发：** 双向音频和控制桥、AEC、立即清空音频与取消反馈、断连恢复、脸/字幕/动作同步、按键事件、双设备保存关机/再次开机，以及 Pi 部署。必须保持新问题优先，不能让旧音频或动作在重连后恢复。

**主要需求差异：** 桌上有成品机器人和专用小主机；无隐含日常 Mac 常开依赖。保留小屏可读性与同键双机开关机门槛。原始数据主要保存在 Linux，K151 的SD仅按终端固件资源需要决定。

**购买清单——A2 独立列全：**

| 物品 | 数量 | 用途 | 采购／适配状态 | 商品或规格链接 | 价格性质／旧预算位置 |
| --- | ---: | --- | --- | --- | --- |
| M5StackChan K151 标准整机 | 1 | 脸、两轴、声音、按键终端 | 另购；确认屏幕批次和可恢复固件 | [K151商品](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) | 当前 US$99；旧占位800–1200元 |
| K151 内置屏、舵机、音频组件 | 各随整机 | 完整交互终端 | 已含；不再另买显示屏、两轴和声卡 | [规格](https://docs.m5stack.com/en/StackChan) | 0新增，已计整机 |
| Raspberry Pi 5 4GB 裸板 | 1 | 专用Linux业务主机 | 另购；4GB为比较基线，仍需目标镜像实测 | [商品目录](https://www.waveshare.net/left_column/Raspberry-Pi.htm)、[规格](https://www.raspberrypi.com/products/raspberry-pi-5/) | 当前目录¥1299；旧分配1350元 |
| 官方27W USB-C电源，中国插头候选 | 1 | Pi独立供电 | 另购；对应Pi5的5V/5A能力，勿用普通手机充电器替代规格核验 | [官方电源](https://www.raspberrypi.com/products/27w-power-supply/) | 旧分配120元；国内配套报价待核 |
| Pi5 Active Cooler | 1 | 主机散热 | 另购；安装要保留进出风空间 | [官方散热器](https://www.raspberrypi.com/products/active-cooler/) | 旧分配60元；未核当前人民币到手价 |
| Pi用128GB microSD及必要读卡器 | 1套 | 系统、文字历史、记忆和日志 | 另购／具体卡型号待定；不同时无理由加购NVMe | [存储接口](https://www.raspberrypi.com/products/raspberry-pi-5/) | 旧分配150元；主机上述四项合计1680元 |
| K151用microSD | 0–1 | 固件资源/本体日志 | 条件另购；Linux已有持久化，不应误认两张卡均必需 | [终端SD接口](https://docs.m5stack.com/en/StackChan) | 旧预算保留80元，确认不需后再扣减 |
| K151 USB供电适配器 | 1 | 机器人本体及动作供电 | 另购／型号待定；不默认Pi USB口足够供整机峰值 | [供电接口](https://docs.m5stack.com/en/StackChan) | 旧分配70元 |
| 主机↔K151 USB-A→C数据线 | 1 | 候选音频/控制连接及刷写 | K151已含50cm线；采用局域网桥则用于维护 | [装箱清单](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) | 0新增；延长/替换线计线材包 |
| 独立供电与数据连接所需分配/防回供件 | 0–1套，依最终拓扑 | 避免把双供电或USB连接当作自然兼容 | 型号待定，可能需改造；**不得直接并接两个USB电源** | [K151电路](https://docs.m5stack.com/en/StackChan)、[台架电源方案](hardware-bench-plan.md) | 旧按键电源200元仅为总占位，是否足够未定 |
| 电源/聊天按钮、信号线与双设备电源适配 | 2个功能入口＋适配1套 | 指定交互及保存关机循环 | 需改造；Pi J2仅解决Pi一侧，未解决K151同步 | [Pi规格](https://www.raspberrypi.com/products/raspberry-pi-5/)、[台架方案](hardware-bench-plan.md) | 与上一项**合计**旧占位200元，不重复计价 |
| 主机底托/防护固定、机器人固定、备用线接头、必要短网线 | 1套 | 装配、维护及扩展通道 | 另购／型号待定；成品Pi外壳可替代部分底托，需兼容散热器 | [Pi机械资料](https://www.raspberrypi.com/products/raspberry-pi-5/)、[K151尺寸](https://docs.m5stack.com/en/StackChan) | 合计旧占位160元 |
| 必要加工/焊接服务或工具补齐 | 按适配量 | 电源与按钮改造 | 条件项，询价后从返工额核算 | 无已确认商品，待电气图 | 超出余量则另计 |
| 运费、税费差额、返工和备件预留 | 1项 | 完整落地非器件费用 | 预算预留 | 按实际地址与服务报价 | 旧占位400元 |

**旧预算合计：3390–3790元**＝K151 800–1200＋主机1680＋终端SD80＋终端电源70＋按键电源200＋固定线材160＋余量400。尚未证明供电适配和接口开发需要的所有附属件都落在占位内。

## B-L：Pi 主控、独立音频与屏幕、自建两轴

**方案结构：** Pi负责业务与显示；XVF3800负责麦克风和回声处理，匹配扬声器接同一声卡；ESP32控制两个总线舵机。主控放固定底座，屏幕与轻支架随头部运动。

**优势：** 屏幕、音频和机械可以分别选择；容易延续现有Linux/Node程序；能明确安排摄像头、有线网络和未来主机扩展。4英寸方屏比多数小型成品更接近你的脸屏意向。

**劣势：** 没有现成整机骨架，需要做支架、承重、走线、供电和声学布局；后续美观外壳仍是单独工作。选有AEC的声卡也不会自动完成整机自然插话。

**需要开发：** Linux部署与音频设备路由、屏幕布局、控制板通信、动作标定、故障隔离、实体按钮/背光/保存关机、语音与动作取消联动。已有业务不重写；两轴驱动和支架可借现成模块。

### B-L 独立硬件购买清单

金额列是11-01预算分配；新查到的商品价单独注明。没有电气图和尺寸确认的行仍是待定采购项。

| 物品与数量 | 用途 | 采购状态 | 旧分配／元 | 商品／规格入口与需要确认的内容 |
| --- | --- | --- | ---: | --- |
| Raspberry Pi 5 4GB ×1 | Linux业务主控 | 成品另购 | 1350 | [微雪SKU25837](https://www.waveshare.net/shop/Raspberry-Pi-5-4GB.htm)；本轮目录1299元，选择裸板不误买另一套餐 |
| 官方27W USB-C电源 ×1 | Pi独立供电 | 成品另购 | 120 | [官方规格](https://www.raspberrypi.com/products/27w-power-supply/)；5.1V/5A，核中国插头与随附线，不给舵机共用 |
| Pi5 Active Cooler ×1 | 主控散热 | 成品另购 | 60 | [官方散热器](https://www.raspberrypi.com/products/active-cooler/)；主机/支架要留风道 |
| 128GB耐写microSD ×1；读卡器按需1 | 系统、文字历史与记忆 | 品牌/料号待定 | 150 | 接口见[Pi5规格](https://www.raspberrypi.com/products/raspberry-pi-5/)；不额外默认购买NVMe/HAT |
| 4inch HDMI LCD (C) ×1 | 眼睛和一两行字幕 | 成品候选 | 260 | [SKU21433](https://www.waveshare.net/shop/4inch-HDMI-LCD-C.htm)；720×720，目录230.28元；核净重、安装孔、背光控制 |
| Micro-HDMI→HDMI柔性线与固定件 ×1套 | 固定底座到运动头部视频 | 长度/型号待定 | 45 | 按Pi5输出口与屏幕接口选，原短转接头不一定满足运动走线 |
| reSpeaker XVF3800 USB裸板 ×1 | 收音、AEC与输出声卡 | 成品另购 | 600 | [SKU101991441](https://www.seeedstudio.com/ReSpeaker-XVF3800-USB-Mic-Array-p-6488.html)；本轮单件US$60.99；不要误选另一I2S/ESP32套装 |
| 匹配4Ω/5W扬声器及线 ×1套 | 由同一声卡输出并提供参考 | 候选另购 | 60 | 上述声卡页有配套Mono Enclosed Speaker 4R5W加购；仍核插头、腔体尺寸及线长 |
| Servo Driver with ESP32 ×1 | 两轴控制及与主机通信 | 成品候选 | 100 | [SKU21593](https://www.waveshare.net/shop/Servo-Driver-with-ESP32.htm)；目录80.80元；需开发Jarvis设备协议 |
| ST3215标准12V舵机 ×2 | 底座yaw、颈部pitch | 候选另购 | 240 | [SKU22414](https://www.waveshare.net/shop/ST3215-Servo.htm)；目录109元/只；按实际头重复核，非7.4V版 |
| 成品12V电源 ×1，≥6A为候选 | 运动独立供电 | 型号待定 | 150 | 插头/线径/配电需统一；大电源不改变控制板允许电流 |
| 外设辅助5V供电／必要有源USB分配 ×1套 | 屏、声卡等负载 | 条件购买/待设计 | 200 | 先核峰值电流、数据枚举、无回供电；不是随便买USB Hub即可 |
| 电源键、聊天键各1；背光门控、分配保护/连接件 ×1套 | PRD电源循环和外设保护 | 待设计/装配 | 200 | 电源键核Pi5 J2路径；见[电源台架](hardware-bench-plan.md)；控制板接口可能需适配 |
| 固定底板、双轴支架/承载件、打印件、小五金 ×1套 | 固定底板＋活动上身＋俯仰头 | 代工/定制 | 450 | 按尺寸和重量报价；不含精美外壳，不认为现成小摄像头云台能直接承载 |
| USB数据线、网线、备用线和应力释放 ×1套 | 连接与维护 | 按实际缺件购买 | 80 | 不重复买盒内已附线；信号/电源规格分别核 |
| 运费、普通返工和备件余量 ×1项 | 成本预留，非硬件 | 预算项 | 500 | 不能用来掩盖尚未列入的主要器件 |
| **历史合计** | | | **4565** | 距5000元还有435元；新增工具/超额加工/真实税运会消耗余量 |

**关键未决项：** 标准ST3215每只堵转电流2.7A，两只可能合计5.4A；原候选控制板5A路径不能简单承受全部异常电流。应设计独立配电/保护，或重新选舵机与驱动，而不是拿“12V/6A电源”证明安全匹配。[舵机规格](https://docs.waveshare.com/ST3215_Servo)、[驱动文档](https://docs.waveshare.com/Servo_Driver_with_ESP32)

音频还需选择正确USB固件、采样率和处理声道，把输出送回同一声卡，最终摆位后重测。B-L现有工时估算为：本体集成145–282工程小时；加共有软件与验收后基础236–452小时。含额外20%预留约285–545小时，其中用户约70–125小时，二者不能相加，也不是日历工期。[完整工作量口径](bl-work-breakdown-2026-11-02.md)

## B-J：本期直接使用 Jetson，自建整机

**方案结构：** 将B-L的Pi主控换为Jetson Orin Nano 8GB完整开发套件，显示、独立音频和两轴仍需自己集成。这里用微雪DEV套件作可比较基线，不混用只有核心模块或缺配件的BASE价格。

**优势：** 本期就可安排NVIDIA本地视觉/计算实验；不用日后再增加一个计算节点。Linux应用仍可作为迁移基础。

**劣势：** 当前组合超过5000元；对现有云端聊天未形成必要收益。仍有B-L的机械/供电工作，还要处理JetPack、载板、驱动、显示转接与散热。

**需要开发：** B-L对应的设备适配和整机联调，加Jetson平台部署；不把GPU配置和本地大模型额外开发计入V1。主机电源键行为需按载板单独设计，不能照搬Pi J2。

### B-J 独立硬件购买清单

| 物品与数量 | 用途 | 采购状态 | 旧分配／元 | 商品／规格入口与需要确认的内容 |
| --- | --- | --- | ---: | --- |
| JETSON-ORIN-NANO-8G-DEV-KIT ×1套 | 主控、GPU及基础主机配件 | 成品候选 | 3819 | [国内目录](https://www.waveshare.net/left_column/AI-Board-Kit.htm)、[DEV/BASE区别](https://www.waveshare.com/product/jetson-orin-nano-dev-kit.htm)；核SKU24451的SSD、无线/天线、散热和电源随附范围；有缺项另加，不能用BASE价替代 |
| 系统SSD、Wi-Fi模组/天线、散热器、主机电源 | 上行主机完整套装的构成 | 按DEV套餐核对，预期已含 | 已计上一行 | 不再买Pi电源/散热/microSD；若改买官方Super或其他载板，整行重新报价 |
| 4inch HDMI LCD (C) ×1 | 脸屏与字幕 | 成品候选 | 260 | [SKU21433](https://www.waveshare.net/shop/4inch-HDMI-LCD-C.htm)；实际分辨率与背光需验证 |
| DP→HDMI转接与柔性走线 ×1套 | Jetson到头屏 | 型号待定 | 80 | 依据所选载板输出核对；标准开发板USB-C不能默认当视频输出 |
| reSpeaker XVF3800 USB裸板 ×1 | 音频与AEC | 成品另购 | 600 | [SKU101991441](https://www.seeedstudio.com/ReSpeaker-XVF3800-USB-Mic-Array-p-6488.html)；本轮单件US$60.99；目标Linux驱动仍测 |
| 匹配4Ω/5W扬声器及线 ×1套 | 语音输出 | 候选另购 | 60 | 声卡同页配套扬声器候选，接同一音频链路 |
| Servo Driver with ESP32 ×1 | 运动小控制板 | 成品候选 | 100 | [SKU21593](https://www.waveshare.net/shop/Servo-Driver-with-ESP32.htm)；串行协议/故障处理需开发 |
| ST3215标准12V ×2 | 双轴 | 候选另购 | 240 | [SKU22414](https://www.waveshare.net/shop/ST3215-Servo.htm)；需与载荷及配电一起复核 |
| 独立12V运动电源 ×1，≥6A候选 | 舵机供电 | 型号待定 | 150 | 不默认共用主机电源；控制板电流限制仍需处理 |
| 外设5V供电／有源USB分配 ×1套 | 屏幕与音频供电 | 待设计 | 200 | 核USB负载和回供电 |
| 电源键、聊天键各1；背光门控与低压配电 ×1套 | 完整开关机流程 | 待设计/装配 | 200 | Jetson载板电源控制重新核查，预算不能证明该方案已实现 |
| 固定底板、双轴支架/承载件、打印及五金 ×1套 | 机械主体 | 代工/定制 | 450 | 按主机及头部尺寸调整 |
| USB/网线及应力释放 ×1套 | 连接与维护 | 按缺件购买 | 80 | 按实际套装附线去重 |
| 运费、返工、备件余量 ×1项 | 成本预留 | 预算项 | 500 | 不含额外开发工具缺件 |
| **历史合计** | | | **6739** | 比5000元高1739元，当前不满足硬件预算 |

复核公式：`4565 − 1680（Pi主机四项）− 45（Pi显示线）＋3819（DEV套件）＋80（DP线）＝6739`。本轮目录仍显示DEV套件3819元，但最终套餐与税运仍待核实。按这套外围分配，完整主机套件需降至2080元以内才能满足5000元；本轮未取得这样的完整报价。

## C1：K151 只负责脸和动作，Linux 直连独立音频

**优势：** 保留成品结构，把录放音与回声处理交给有 USB 音频/AEC 路径的 XVF3800，绕过 K151 半双工社区音频桥。既有 Linux 业务继续复用，可以分别验证音频和身体。

**劣势：** 比A2多买一套声音硬件；桌面占用、线材和供电更多。需要把声卡与扬声器固定在机器人底座区域或专门小盒中，机器人一体感和收音布局要自己完成。不能以绕过音频桥推断字幕和电源适配已经解决。

**剩余开发：** USB声卡/声道/采样率与现有软件适配、AEC与插话验收；K151显示/动作/按钮控制固件及主机协议；轮次取消传播；双系统开关机；固定和声学摆位。播放必须送回同一声卡提供参考；本方案不通过K151内置喇叭播音，否则需要另核音频链路。

**主要需求差异：** 保留2英寸脸屏；使用单独音频模块而非K151内置音频。固定底座/小盒能否使声音仍来自机器人本体，需要布局确认。未来主机计算扩展与B-L相近，本体换大屏/加强关节仍受成品限制。这是我们提出的A2派生组合，不是厂商即用套装。

**购买清单——C1 独立列全：**

| 物品 | 数量 | 用途 | 采购／适配状态 | 商品或规格链接 | 价格性质／旧预算位置 |
| --- | ---: | --- | --- | --- | --- |
| M5StackChan K151 标准整机 | 1 | 成品脸屏、两轴和按键终端 | 另购，音频本期旁路；确认屏幕批次 | [K151商品](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) | 当前 US$99；旧占位800–1200元 |
| K151内置屏幕、舵机及其他原机组件 | 各随整机 | 交互本体 | 已含；内置麦/喇叭不作为C1主音频 | [整机规格](https://docs.m5stack.com/en/StackChan) | 0新增；不重复买两轴机构 |
| Raspberry Pi 5 4GB裸板 | 1 | 专用Linux、业务与音频主机 | 另购 | [当前目录](https://www.waveshare.net/left_column/Raspberry-Pi.htm)、[官方规格](https://www.raspberrypi.com/products/raspberry-pi-5/) | 当前目录¥1299；旧分配1350元 |
| 官方27W USB-C电源，中国插头候选 | 1 | Pi供电 | 另购；供电能力需结合USB负载核验 | [官方电源](https://www.raspberrypi.com/products/27w-power-supply/) | 旧分配120元 |
| Pi5 Active Cooler | 1 | 主机散热 | 另购 | [官方散热器](https://www.raspberrypi.com/products/active-cooler/) | 旧分配60元 |
| Pi用128GB microSD及必要读卡器 | 1套 | Linux系统、历史、记忆与日志 | 另购／卡型号待定 | [存储接口](https://www.raspberrypi.com/products/raspberry-pi-5/) | 旧分配150元；主机四项合计1680元 |
| reSpeaker XVF3800四麦USB裸板配置，SKU101991441 | 1 | USB收音、回声处理和音频输出 | 另购；固定USB固件，核对处理后声道；不买错为不同芯片或默认I2S套装 | [官方商品](https://www.seeedstudio.com/ReSpeaker-XVF3800-USB-Mic-Array-p-6488.html)、[固件与连接](https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/) | **当前单件US$60.99**；旧人民币分配600元 |
| 匹配单声道扬声器，Seeed 4Ω5W封装款候选 | 1 | 由XVF3800声音路径输出语音 | 另购；插头/线序/安装尺寸核验后冻结 | [扬声器候选](https://www.seeedstudio.com/Mono-Enclosed-Speaker-4R-5W-p-5931.html)、[连接说明](https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/) | 音频板页面加购显示US$2；旧含线分配60元 |
| XVF3800 USB数据/供电线（主机USB-A→声卡USB-C候选） | 1 | 主机↔声卡连接 | 是否随音频板附送本轮未确认；缺件时另购；不能拿唯一K151线同时连两台设备 | [USB连接规格](https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/) | 未独立报价，原线材160元中核算；超出另计 |
| K151用microSD | 0–1 | 终端表情/字体资源和日志 | 条件另购；固件可不用时省略 | [SD接口](https://docs.m5stack.com/en/StackChan) | 历史比较保留80元，未确认必要性 |
| K151 USB供电适配器 | 1 | 身体与动作供电 | 另购／输出电流与适配型号待定 | [电源接口](https://docs.m5stack.com/en/StackChan) | 旧分配70元 |
| 主机↔K151 USB-A→C数据线 | 1 | 候选表情/动作/按键通信，兼刷写 | 已含50cm线；可用局域网替代运行时数据通道，但需另评估延迟/重连 | [K151装箱清单](https://shop.m5stack.com/products/stackchan-kawaii-co-created-open-source-ai-desktop-robot) | 0新增，延长/替换计线材包 |
| 电源/聊天按钮、信号线、K151与Pi电源协调及防回供适配 | 2个功能入口＋适配1套 | 指定交互及保存关机 | 型号待定／需改造；不是买两个按钮即可完成 | [电路](https://docs.m5stack.com/en/StackChan)、[台架计划](hardware-bench-plan.md) | 旧分配200元，适配方案未证明可在此额内完成 |
| 主机底托/防护件、K151固定、声卡与扬声器小盒/隔振/走线、备用接头和必要短网线 | 1套 | 机械固定与声学布局 | 另购／需设计；音频器件应尽量放固定部分 | [板卡连接](https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/)、[Pi机械资料](https://www.raspberrypi.com/products/raspberry-pi-5/) | 沿用旧160元固定线材占位；**新增音频安装的实际增量尚未重算** |
| 必要的有源USB分配/独立外设供电 | 0–1套，测得需要才买 | 若主机USB供电预算不足，补足供电 | 型号待定；须核数据枚举和主机关机后无回供 | [Pi规格](https://www.raspberrypi.com/products/raspberry-pi-5/)、[台架计划](hardware-bench-plan.md) | **未在4050–4450元里独立计价**，不是默认已含或必购 |
| 必要加工/焊接服务或工具补齐 | 按适配量 | 按键/电源/音频底托制作 | 条件项 | 待电气图、结构尺寸和加工报价 | 从余量核算，超出则另计 |
| 运费、税费差额、返工和备件预留 | 1项 | 完整落地费用 | 预算预留 | 按地址和服务报价 | 沿用旧400元；新增设备运费仍须复核 |

**旧增量试算：4050–4450元**＝K151 800–1200＋Pi主机1680＋K151 SD80＋K151供电70＋按键电源200＋固定线材160＋XVF600＋扬声器含线60＋余量400。并非已核整机价；新增音频固定、USB辅助供电、现价变化可能令此合计变化。

## C2：OpenDeskBot 开源终端＋专用 Linux 主机

两个实现独立评价，固件、协议和物料不能混用。它们的价值是复用终端结构与已有音频代码；当前成板供货、生产资料及整机音频效果均未核齐。下面分别给出完整类别清单。

### C2-a：brufik_in_one_v2 + 专用 Linux 主机

**固定范围：** [OpenDeskBot/brufik_in_one_v2](https://github.com/OpenDeskBot/brufik_in_one_v2/tree/39b408019bfe4d63e39ff71e6bd42a8fe602c716)，提交 `39b408019bfe4d63e39ff71e6bd42a8fe602c716`；设备端 Wi-Fi WebSocket，Linux 主机运行 Jarvis 及适配程序。设备不是 USB 声卡。

**优势：** 有对应的两轴结构 STEP、两份 PCB BOM、具体屏幕/舵机/线材规格；固件已存在持续录放、AEC 参考信号、取消播放和清空旧队列的实现。相对纯自建，减少的是小型结构、电路及设备音频前端的探索。[硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md)、[AEC 配置](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/firmware/audio_frontend_esp_sr.cpp#L999)、[播放参考](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/firmware/speaker.cpp#L198)

**劣势和门槛：** 仍需成板或代工、打印装配；并未核到可直接下单的整机。1.83 英寸屏幕明显小于原屏幕偏好，字幕可读性需体验。Wi-Fi、内部 RAM 与 AEC 回退需实测。屏幕 RST/BL 硬接 3.3V，严格冷启动黑屏不能仅画黑色解决。原结构是否精确满足“底板不动、上方身体左右转、脖子点头”须对照 CAD，不能只见双舵机就认定一致。

**新发现的复制缺口：** 两份 XLSX BOM 均成功读取，主板含 ESP32-S3-WROOM-1U-N16R8、NS4168 和 LMD2718T271-OA5。但 README 所链接 Base Gerber ZIP 在固定提交返回 HTTP 404；完整且未截断的仓库树也没有该 ZIP，未找到 LCM 独立 Gerber。因此应先取得完整生产资料或匹配的已装配板报价；“有 BOM 和板图”不等于 PCBA 已可下单。

**开发内容：** 保留现有 Node 会话/记忆/Skill；新增设备 WebSocket 协议适配和 Opus/PCM 转换，或运行受控 Python 桥；接回现有 Seeduplex/方舟。移植状态脸、1–2 行字幕、两轴动作与按钮事件，补冷启动禁用、保存关机、断线降级、AEC 明确健康状态与运动故障隔离。不能把原后台整套替换为 Jarvis 后，就认为音频时序自动保持。

#### C2-a 独立采购/制作清单

| 项目 | 数量 | 用途和范围 | 采购状态 | 价格 | 依据 |
|---|---:|---|---|---|---|
| Raspberry Pi 5 4GB | 1 | 专用 Linux 主机，现有业务与设备桥 | 成品候选 | 待询 | [Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/)、[现有基线](hardware-route-review-2026-11-01.md) |
| 官方 27W USB-C 电源，中国适用插头 | 1 | 仅主机供电；不默认把舵机负载压在 Pi USB 上 | 成品候选 | 待询 | [电源](https://www.raspberrypi.com/products/27w-power-supply/) |
| Active Cooler | 1 | 主机散热 | 成品候选 | 待询 | [散热](https://www.raspberrypi.com/products/active-cooler/) |
| 128GB microSD、必要读卡器 | 各 1 | OS、配置、日志、记忆；读卡器已有则复用 | 成品候选，具体料号待定 | 待询 | [现有基线](hardware-route-review-2026-11-01.md) |
| Pi 主机小盒/底板及固定柱 | 1 套 | 独立固定，保留散热、USB、网口和电源键走线 | 成品或打印待定 | 待询 | [台架布局](hardware-bench-plan.md) |
| PCB V2.0 Base 完整 PCBA | 1 | ESP32-S3、板载麦克风、功放、接口及阻容 | **代工/成板待询；生产资料未齐** | 待询 | [Base BOM](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/mechanical/BOM_V2.0_Base_PCB_V2.0_Base_2026-09-02.xlsx)、[硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| LMD2718T271-OA5 PDM 麦克风 | 1，含于上项 | 收音；不是再买一块 USB 麦克风 | 板内已含，报价确认 | 含 Base PCBA | [Base BOM](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/mechanical/BOM_V2.0_Base_PCB_V2.0_Base_2026-09-02.xlsx) |
| NS4168 功放 | 1，含于 Base | I2S 外放，不等于独立 AEC 芯片 | 板内已含，报价确认 | 含 Base PCBA | [Base BOM](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/mechanical/BOM_V2.0_Base_PCB_V2.0_Base_2026-09-02.xlsx) |
| PCB V2.0 LCM 完整 PCBA | 1 | 屏幕转接与连接器 | **代工/成板待询；完整生产资料待补** | 待询 | [LCM BOM](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/mechanical/BOM_V2.0_LCM_PCB_V2.0_LCM_2026-09-02.xlsx) |
| 1.83 英寸 ST7789 SPI 屏 | 1 | 240×284、圆角、12pin 插接、无触摸；不能按同尺寸任意换屏 | 成品，需核具体接口版本 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| 9g 180° 舵机，JR2.54 | 1 | 俯仰；原资料给 SG90/9g 搜索方向，具体尺寸及品质待定 | 成品候选 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| 3.7g 舵机，JR2.54 | 1 | 水平；必须支持 5V，长宽 20.2×8.5mm，允许 ±0.5mm | 成品候选 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| 2011 腔体喇叭 | 1 | 8Ω 1W、1.25 插头；与板载功放匹配 | 成品候选 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| FPC 天线 | 1 | IPEX 一代、5cm 线、28×9mm；不大于30×30mm | 成品候选 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| 机器人逻辑端 5V USB-C 电源与供电线 | 1 路 | Base 逻辑供电；可与合规辅助电源整合，但必须先冻结原理图 | 成品电源候选；最终拓扑待定 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md)、[台架计划](hardware-bench-plan.md) |
| 舵机独立 5V 电源 | 1 路 | 作者下限为 ≥1A；双轴峰值/堵转/压降另核，不把 1A 当已验证容量 | 成品，额定电流待核 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| 低压配电、保护、接头与共地线 | 1 套 | 逻辑/运动分路、防 USB 回灌、关机后执行器安全状态 | 待电气图后采购/代工 | 待询 | [台架计划](hardware-bench-plan.md) |
| 1.25mm 6pin 双头同向硅胶线 | 1 | 长150mm，连接主板与屏幕板；不能买反向线 | 成品或定制压线 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| USB 数据线 | 1 | 初始烧录、维修、串口日志；即使日常 Wi-Fi 也需要 | 成品候选 | 待询 | [固件说明](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| 当前版本整机打印件 | 1 套 | 按固定 STEP 核板卡、舵机、走线；报价需按可制造零件拆分 | 打印代工 | 待询 | [结构 STEP](https://github.com/OpenDeskBot/brufik_in_one_v2/tree/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/mechanical) |
| M2×5 / M2×8 / M2×12 平尾自攻螺丝 | 14 / 9 / 2 | 原每套数量；改造件另核，报价可含少量备件 | 成品 | 待询 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md) |
| 外置常开电源键、独立聊天键及线束 | 各 1 | Pi J2 电源事件与聊天输入分开；按压启动后不得直接越过未启用状态 | 成品按钮；输入接法待定 | 待询 | [PRD](../prd/prd-v1.1.md)、[台架计划](hardware-bench-plan.md) |
| 背光或显示电源门控改造 | 1 套 | 当前 BL 硬接 3.3V；补真正灭背光、避免信号回灌 | 电路与器件待定，需返修/代工 | 待询 | [硬件引脚表](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md)、[PRD](../prd/prd-v1.1.md) |
| 终端开关机联动改造 | 1 套 | Linux 保存关机后屏/音频/运动停止；必要低压门控和信号隔离 | 方案待定；与上项/配电去重报价 | 待询 | [PRD](../prd/prd-v1.1.md)、[台架计划](hardware-bench-plan.md) |
| 摄像头 OV3660 与固定卡子 | V1 0；原方案各1 | V1 不采购；保留连接，先确认无相机也能正常启动 | 本期不买 | 不计 | [硬件资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md)、[PRD](../prd/prd-v1.1.md) |
| 调试网线/必要转接、标签、绝缘与线束固定辅材 | 1 套 | 主机维护、未来有线节点空间和基本可靠装配；已有件可复用 | 成品，按盘点补缺 | 待询 | [台架计划](hardware-bench-plan.md) |
| 组装/测试工具或代工调试服务 | 1 套 | 螺丝刀、万用表等；细间距 PCBA 优先外包，不默认用户现有焊接工具 | 盘点后采购/委托 | 待询 | [装配资料](https://github.com/OpenDeskBot/brufik_in_one_v2/blob/39b408019bfe4d63e39ff71e6bd42a8fe602c716/hardware/README_zh.md)、[台架计划](hardware-bench-plan.md) |
| 运输、PCBA 起订量、打印/接线返工、备件余量 | 1 项 | 订单可能需多块板；不能只算装机各1块成本 | 预算待询后预留 | 待定 | [现有预算口径](hardware-route-review-2026-11-01.md) |

**采购闸门：** 成板/生产资料可获得 → 硬件版本与固件对应 → 供电/背光及两轴结构映射明确 → 总价含加工与余量 ≤5000 元 → 才能形成可下单清单。不存在“先买两个 PCB 裸板就等于硬件准备完成”。

### C2-b：tudoom/OpenDeskBotV2 + 专用 Linux 主机

**固定范围：** [tudoom/OpenDeskBotV2](https://github.com/tudoom/OpenDeskBotV2/tree/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6)，提交 `1cf5050ee63b1fe4cae6b7815e565a0955f15bd6`。首轮只评估 **USB CDC / DBOT v1，且设备未保存 Wi-Fi 配置**。Linux 主机仍可用自己的 Wi-Fi 上网。

**优势：** USB 协议已有 CRC、session epoch、心跳与旧媒体清理；终端已有 AEC、播放参考和紧急停播代码，主机负责全部云服务，较适合做可控终端。[固件/协议说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md)、[AEC 启动条件](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/firmware/deskbot_rom.ino#L142)

**劣势和门槛：** 设备曾保存 Wi-Fi 配置时，启动代码会跳过 AFE 以释放内部 RAM；因此“支持 USB 和 Wi-Fi”不能合并推断为两条链路都具 AEC。未核实 Linux 版服务与现有 Node 直接可用。硬件生产资料指向[立创项目](https://oshwhub.com/eda_hedwaytj/project_asxqsedb)，本轮访问返回403，不能根据 brufik 外形相近就复制其舵机、PCBA、线材或螺丝表。

**开发内容：** Linux 上实现 DBOT CDC 收发/Opus/重连/取消，或移植并约束现有 Python 服务作为设备桥；Node 业务及现有云接入保留。补脸屏、字幕、按钮、电源循环；使 AFE 是否真实启用可观测。先验证 USB 无配网配置条件，不把 Wi-Fi AFE 内存优化作为 V1 默认前置承诺。桌面客户端原有豆包 ASR/TTS 模板不等于已适配当前 Seeduplex。

#### C2-b 独立采购/制作清单

下面覆盖完整系统需要的物料类别；**机器人端明细仍是待冻结清单，不是可照表下单的 BOM**。数量为 Jarvis 装机需求，不能拿来声称原作者当前生产包已核实。

| 项目 | 数量 | 用途和范围 | 采购状态 | 价格 | 依据 |
|---|---:|---|---|---|---|
| Raspberry Pi 5 4GB | 1 | 专用 Linux 主机，Node 与 CDC/DBOT 桥 | 成品候选 | 待询 | [Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/)、[现有基线](hardware-route-review-2026-11-01.md) |
| 官方 27W USB-C 电源 | 1 | 主机供电；USB 外设供电预算另核 | 成品候选 | 待询 | [电源](https://www.raspberrypi.com/products/27w-power-supply/) |
| Active Cooler | 1 | 主机散热 | 成品候选 | 待询 | [散热](https://www.raspberrypi.com/products/active-cooler/) |
| 128GB microSD、必要读卡器 | 各 1 | 系统和本地业务数据；无需因终端 Flash 再加一张卡 | 成品候选 | 待询 | [现有基线](hardware-route-review-2026-11-01.md)、[固件分区说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md) |
| 主机小盒/底板和固定柱 | 1 套 | 独立固定、散热和串口线应力保护 | 成品/打印待定 | 待询 | [台架计划](hardware-bench-plan.md) |
| 与固定固件对应的 Deskbot v2 主板 PCBA | 1 套 | 自定义 ESP32-S3 默认目标；板数、版本与 BOM 未取得 | 成板/代工待询，**资料待补** | 待询 | [硬件说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md)、[生产资料入口](https://oshwhub.com/eda_hedwaytj/project_asxqsedb) |
| 屏幕适配/连接 PCBA | 待定 | 是否独立板、是否含在主板套件须查最新生产包 | 待核，禁止套用 brufik LCM | 待询 | [生产资料入口](https://oshwhub.com/eda_hedwaytj/project_asxqsedb) |
| 显示屏 | 1 | 固件确认 ST7789P 240×284；物理尺寸、针脚、批次待核 | 成品型号待定 | 待询 | [deskbot_config.h](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/firmware/deskbot_config.h) |
| PDM 麦克风与 I2S 功放 | 各 1 功能位 | 固件有 PDM 输入及 I2S 功放使能；是否板含、实际型号待核 | 可能 PCBA 已含，**先核再计价** | 待询/板价内待核 | [引脚配置](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/firmware/deskbot_config.h) |
| 匹配扬声器及腔体 | 1 | 阻抗、功率、尺寸、插头待生产包确认 | 成品型号待定 | 待询 | [生产资料入口](https://oshwhub.com/eda_hedwaytj/project_asxqsedb) |
| 俯仰舵机 | 1 | GPIO15；型号、供电、尺寸及原机构限制待核 | 成品/改装待定 | 待询 | [引脚配置](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/firmware/deskbot_config.h)、[硬件说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md) |
| 水平舵机 | 1 | GPIO16；不能套用另一仓库的3.7g规格 | 成品/改装待定 | 待询 | [引脚配置](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/firmware/deskbot_config.h) |
| 生产版天线 | 待定 | USB 方案不使用设备 Wi-Fi；是否可不装需确认射频/配网维护需求 | 待核；不默认购买 | 待询 | [硬件说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md)、[生产资料入口](https://oshwhub.com/eda_hedwaytj/project_asxqsedb) |
| USB 数据线 | 1 | 日常 CDC、烧录、维修，需有数据导线 | 成品候选 | 待询 | [USB 说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md) |
| 终端逻辑供电路径 | 1 路 | 优先核 USB 供电是否满足；如外接电源，需防回灌，不盲目双路供电 | 规格/是否需独立适配器待定 | 待询 | [USB过流/保护说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md)、[台架计划](hardware-bench-plan.md) |
| 舵机辅助电源与低压配电保护 | 1 路+1套 | 双轴峰值、电压、地线和主机 USB 容量未核，不能省略预算 | 成品电源与配电方案待定 | 待询 | [硬件说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md)、[台架计划](hardware-bench-plan.md) |
| 匹配生产版本的屏/音频/舵机内部线束 | 1 套 | 针数、正反向、长度、接头全部待当前 BOM；不得照搬 brufik | 压线代工/成品待核 | 待询 | [生产资料入口](https://oshwhub.com/eda_hedwaytj/project_asxqsedb) |
| 匹配打印结构、支架与底板 | 1 套 | 两轴机构、主板、屏幕、喇叭安装及防夹线 | 打印代工，版本待冻结 | 待询 | [生产资料入口](https://oshwhub.com/eda_hedwaytj/project_asxqsedb) |
| 紧固件、轴承/轴套、舵盘 | 1 套，明细待定 | 以冻结 CAD 的孔径、受力和舵盘为准 | 成品待核 | 待询 | [生产资料入口](https://oshwhub.com/eda_hedwaytj/project_asxqsedb) |
| 电源键、独立聊天键及线束 | 各 1 | Pi J2 与会话输入；本体已有独立用户键则核实后复用 | 成品候选，已有键未核 | 待询 | [PRD](../prd/prd-v1.1.md)、[台架计划](hardware-bench-plan.md) |
| 冷启动背光及终端关机联动改造 | 1 套 | 原待机脸不符合未启用黑屏；是否可GPIO控背光、是否需电源门控待图纸 | 电路/固件待定 | 待询 | [启动待机说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md)、[PRD](../prd/prd-v1.1.md) |
| 摄像头与支架 | V1 0 | 原固件新批次适配OV3660；先确认缺相机可启动，预留不等于要采购 | 本期不买 | 不计 | [硬件说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md)、[PRD](../prd/prd-v1.1.md) |
| 调试网线、绝缘与线束固定辅材 | 1 套 | 维护、主机有线口预留、基本装配 | 成品按缺口补 | 待询 | [台架计划](hardware-bench-plan.md) |
| 工具或整板/整机代工测试服务 | 1 套 | 避免默认用户可完成细间距焊板；需可读串口日志与量电源 | 盘点后采购/委托 | 待询 | [硬件诊断说明](https://github.com/tudoom/OpenDeskBotV2/blob/1cf5050ee63b1fe4cae6b7815e565a0955f15bd6/hardware/README.md) |
| 运费、起订量、打印/电源返工及备件余量 | 1 项 | USB供电与生产资料缺口可能带来改板，不能按零计 | 询价后预留 | 待定 | [现有预算口径](hardware-route-review-2026-11-01.md) |

**采购闸门：** 取得可用的当前硬件包或匹配成板 → 证明上述资料与固定固件一致 → 确认 USB 未配网时 AFE 健康且持续录放 → 确认 Linux 桥和停播 → 再冻结采购。不能因 README 写了“出厂已烧录”就推定存在可购买现货。

## C3：两种 Whisplay 的完整物料清单

**优势与取舍：** 把屏幕、音频和按键合在一块板上，Linux业务可以延续；代价是显示布局受板型限制，两轴机械和软件回声处理仍需自己完成。优先研究HAT+，普通版保留作更小体积的对照。

下表两列分别组成完整方案，不需要再叠加 B-L 的屏、USB 声卡或第二套主机。两轴先沿用可研究的 ST3215/ESP32 方向；不是已经验证承载 HAT+ 与 Pi 的选型。

| 物料 / 用途 | C3+ HAT+：数量与状态 | C3 普通 HAT：数量与状态 | 价格性质 / 购买或规格 |
| --- | --- | --- | --- |
| Linux 主控：Raspberry Pi 5 4GB | 1，另购 | 1，另购 | 沿用旧计划 ¥1350 预算占位，非今日报价；[官方 Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/) |
| 集成显示/音频板 | HAT+ ×1，另购；2.8 英寸 480×640 DSI、ES8389、触摸/按钮 | HAT ×1，另购；1.69 英寸 240×280 SPI；V1 WM8960/V2 ES8389，采购锁版本 | 官方挂牌 US$49.99 / US$35.99；[HAT+ 商品](https://www.pisugar.com/products/pisugar-whisplay-hat-plus-touchscreen-for-raspberry-pi-5)、[HAT 商品](https://www.pisugar.com/products/whisplay-hat-for-pi-zero-2w-audio-display) |
| 麦克风 / 音频输入 | 1 组：板卡提供音频输入，麦克风实物配置/数量随货核对；不预先再加 USB 声卡 | 板载双麦，已含 | 不拆价；[HAT+ 规格与测试](https://docs.pisugar.com/docs/product-wiki/whisplay-plus/overview)、[普通板说明](https://docs.pisugar.com/docs/product-wiki/whisplay/overview) |
| 扬声器及匹配线 | 1 套，套餐待核；包装清单未单列扬声器，先预留另购匹配 4-pin 立体声组件的费用，阻抗/功率需厂家确认 | 板载扬声器已含；若实测音量不足才另购 8Ω/1W、2-pin PH2.0 单声道外接组件 ×1 | HAT+ 外接组件未询价；普通版不重复列标配扬声器费用；同上规格链接 |
| Pi 5 供电：官方 27W USB-C、中国插头 | 1，另购；只供 Pi 与经核验的板卡负载 | 1，另购 | 旧计划 ¥120 占位；[官方规格](https://datasheets.raspberrypi.com/power-supply/27w-usb-c-power-supply-product-brief.pdf)；不能用此项替代电机电源 |
| Pi 5 Active Cooler | 1，另购；与板/柱高度先核间隙 | 1，另购；与板/柱高度先核间隙 | 旧计划 ¥60 占位；[官方散热器](https://www.raspberrypi.com/products/active-cooler/) |
| 系统/历史存储：128GB microSD | 1，另购，耐写型号待定 | 1，另购，耐写型号待定 | 卡+必要读卡器旧计划合计 ¥150 占位；[官方存储说明](https://www.raspberrypi.com/documentation/computers/getting-started.html) |
| microSD 读卡器 | 0 或 1，若现有 Mac 无可用读卡器才另购；不是运行常驻件 | 0 或 1，同左 | 已含于上项预算，不重复计费 |
| 显示线 / GPIO 连接 | 套餐列 2 条 DSI FPC（Pi5 与 Pi4/3），实际用匹配 Pi5 的 1 条；40-pin 延长排针 ×1 已含 | 不需要 DSI/HDMI 线；40-pin 连接匹配现有板；若为散热/装配增高，另购延长排针 ×1，型号待定 | HAT+ 包装清单已含；普通版额外排针待询；[HAT+ 商品清单](https://www.pisugar.com/products/pisugar-whisplay-hat-plus-touchscreen-for-raspberry-pi-5) |
| 板卡安装柱/螺钉 | HAT+ 随附安装柱/螺钉 1 套；装机新增件另核 | 1 套，套餐待核，缺件另购 | 不将 HAT+ 随附件重复计入定制结构；同上商品；[普通 HAT 驱动/装配入口](https://github.com/PiSugar/Whisplay) |
| 两轴舵机：ST3215 标准 12V，SKU22414 | 2，另购，最终载荷校核后冻结 | 2，另购，最终载荷校核后冻结 | 旧计划合计 ¥240 占位；[标准版规格](https://docs.waveshare.com/ST3215_Servo)；不要误买 7.4V/HS 版 |
| 电机控制板：Servo Driver with ESP32 | 1，另购；USB 串口与 Pi 通信 | 1，另购 | 旧计划 ¥100 占位；[厂商控制资料](https://docs.waveshare.com/ST3215_Servo/Web-Use)；不是已含舵机/电源套装 |
| 电机电源：12V、≥6A 候选 | 1，另购，成品电源型号待定 | 1，另购，型号待定 | 旧计划 ¥150 占位；需按峰值、保护、接头确认；[厂商用电边界](https://docs.waveshare.com/ST3215_Servo/Web-Use) |
| 两轴独立低压分配、保护/保险、共地与合适连接器 | 1 套，另购/自制，电气图待定 | 1 套，另购/自制 | 费用未冻结；ST3215 两只堵转合计 5.4A，控制板最大 5A，不允许简单全经控制板供电；更大电源不解决板上限 |
| 固定底板、yaw 轴支撑、pitch 头架、轴承/舵盘/紧固件 | 1 套，另购/加工；承载整个头部组合 | 1 套，另购/加工 | 旧 B-L ¥450 仅参考分配，需为实际载荷重新报价；[Pi5 现有壳仅供参考](https://github.com/PiSugar/suit-cases/tree/main/pi5-whisplay-chatbot)，不是现成两轴套件 |
| 聊天按键 | 板载 ×1 已含；不方便触达时增加外置按钮 ×1，型号待定 | 板载 ×1 已含；外置同左 | 不默认买两套；需将按钮事件接入 Jarvis；[HAT+ GPIO](https://docs.pisugar.com/docs/product-wiki/whisplay-plus/overview)、[普通 HAT daemon](https://github.com/PiSugar/Whisplay) |
| 独立电源按键与 Pi5 J2 连接线 | 1 套，另购/加工，接口和布置待定 | 1 套，另购/加工 | 未询价；与聊天按钮职能不同；[Pi 电源按钮文档](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html) |
| 黑屏启动/背光门控、必要音频静音/电机上电门控 | 1 套设计项；先验证板载 GPIO 控背光，若启动阶段闪屏再补硬件，数量待定 | 1 套设计项，同左 | 未冻结，不假设仅软件就保证全启动流程；[HAT+ 背光 GPIO](https://docs.pisugar.com/docs/product-wiki/whisplay-plus/overview)、[普通版引脚](https://docs.pisugar.com/docs/product-wiki/whisplay/overview) |
| USB 数据线、舵机线、线束固定、应力释放、必要延长线 | 1 套，随货核数量后补购 | 1 套，随货核数量后补购 | 未询价；不重复计套餐 DSI/排针；外部扬声器线算音频项 |
| 以太网连接线/可达端口 | 1 条候选，现有可用则复用；Pi 网口留出 | 1 条候选，同左 | 待询价；服务当前调试及未来独立 Jetson，Jetson 本体不列本期 |
| 运费、打印/切割/返工与配件余量 | 1 项，独立列账 | 1 项，独立列账 | 未取得成套报价，不能拿余量填未列器件或直接宣称低于 ¥5000 |

**音频与软件边界：** [whisplay-chatgpt](https://github.com/PiSugar/whisplay-chatgpt) 的普通 HAT 路线使用 PipeWire/WebRTC 软件 AEC；不是板载专用 AEC DSP，也不是 HAT+ 实测证据。[whisplay-xiaozhi 配置](https://github.com/PiSugar/whisplay-xiaozhi/blob/main/.env.template) 默认关闭插话。HAT+ 的驱动提供 Linux 桌面显示，需管理内核模块升级；普通 HAT 要适配 SPI 画面。原 Node 业务可以保留，浏览器 UI、音频设备和两轴驱动不能直接当成已迁移。[HAT+ 驱动说明](https://docs.pisugar.com/docs/product-wiki/whisplay-plus/overview)

官方两种商品的静态页面都同时出现 Sold out 与 Add to cart；这里只确认挂牌价，不确认中国现货/运费。HAT+ 与普通 HAT 不共用显示接线/驱动/外壳。V1 不另购 PiSugar 电池；现有含电池的参考壳是否能无电池固定要检查。

## C4：VerdiBot Pi 5 版，两轴裁剪、原 USB 语音板方向

**此次只选一个可说明的方向：** Pi 5 本体，参考原主控/显示扩展板、USB 语音/Hub 板、改装舵机驱动板这三类电路；裁剪为 Jarvis 两轴。**不混入 Zero 2 W 方案，也不同时购买另一段清单的 I2S 麦克风/功放。** 原零件数量与两轴裁剪后的数量并不等价。

**优势：** Pi 可直接承载现有 Linux/Node 业务；公开结构文件、制板与装配资料提供可制造布局参考，不必完全从空白开始。能自主改电路和结构，未来网络节点易于接入。[仓库](https://github.com/maker-community/VerdiBot)、[PCB 分类](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)

**劣势和门槛：** 作者 BOM 标题明确未补齐；同页主屏出现2.4英寸裸屏与3.5英寸SPI屏，音频出现PCM2912A USB板与MAX98357A/SPH0645 I2S组合，舵机/驱动板/线材/轴承前后数量不一致。不能把不同段落相加当整机采购表。原设计多关节，删除手臂等并不自动满足 Jarvis 的固定底板/身体旋转布局。仍有制板、装配、改舵机与电气调试工作；对机械新手，未必比 B-L 现成模块省时。[官方 BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html)

**音频判断：** PCM2912A/USB声卡证明存在录放接口，不能证明 AEC 或自然插话已达标。本轮未核到可直接复用的完整回声消除/取消播放证据。如果需改为 XVF3800，应重新建立“结构复用+B-L音频”的独立变体并重算空间/预算，不能把原 USB 板和新声卡默默混算。

**开发内容：** Node 主业务可保留；适配 SPI/屏幕驱动与字幕、原舵机 I2C 协议、标定/限位/断连停机、音频回声链路、按钮与电源、两轴裁剪结构。原 .NET 应用可作驱动/行为参考，不必为了用壳迁移业务到 .NET。当前该路线首先是资料对齐工程，随后才是复制装配工程。

### C4 独立采购/制作清单

下表为“Pi 5 + 原 USB 音频板 + Jarvis 两轴裁剪”完整类别清单；未匹配版本的项明确待冻结。不是原作者未完成 BOM 的补写，也没有给它虚构总价。

| 项目 | 数量 | 用途和范围 | 采购状态 | 价格 | 依据 |
|---|---:|---|---|---|---|
| Raspberry Pi 5 4GB | 1 | 本体 Linux 主机；无需再加外置主机 | 成品候选 | 待询 | [Pi5](https://www.raspberrypi.com/products/raspberry-pi-5/)、[原BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html) |
| 官方27W USB-C电源 | 1 | 采用当前基线，不沿用未核的15W整机供电假设 | 成品候选 | 待询 | [官方电源](https://www.raspberrypi.com/products/27w-power-supply/) |
| Active Cooler或同等兼容散热 | 1 | 候选Active Cooler；须检查扩展板与壳内间隙后冻结 | 成品，机械兼容待核 | 待询 | [散热尺寸入口](https://www.raspberrypi.com/products/active-cooler/)、[Pi5结构](https://github.com/maker-community/VerdiBot) |
| 128GB microSD、必要读卡器 | 各1 | 沿用当前Jarvis存储基线；不同时买原表64GB | 成品候选 | 待询 | [现有基线](hardware-route-review-2026-11-01.md) |
| 主控/显示扩展板完整PCBA | 1套 | Pi接口、显示及电源；可能含显示转接，不再默认重复一块 | 代工，需冻结EDA版本 | 待询 | [PCB说明](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[EDA](https://oshwhub.com/greenshade/verdibot) |
| USB语音/Hub完整PCBA | 1套 | 本次固定选USB方向；PCM2912A等元件按同版BOM含入 | 代工，详细完整BOM待核 | 待询 | [PCB说明](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[BOM前段](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html) |
| PCM2912A与USB板阻容/连接器 | 按板含 | USB声卡核心及配套；不是独立USB成品声卡再购买一次 | PCBA已含待报价确认 | 含上项 | [官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html) |
| 主显示屏 | 1 | **2.4寸裸屏/3.5寸SPI冲突待消除**，必须选匹配PCB与CAD的一款 | 型号待冻结；不可同时下单 | 待询 | [官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html) |
| 胸前OLED及配套连接 | V1拟0；若电气依赖则1 | Jarvis不要求第二屏；需确认省略不阻塞启动与结构 | 待工程核对，不预购 | 待询/省略不计 | [PCB说明](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[PRD](../prd/prd-v1.1.md) |
| USB音频板匹配麦克风 | 1功能位 | 可能板含；型号与安装声学待同版原理图，**不套用I2S那段** | 待核；板含则去重 | 待询 | [PCB说明](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[EDA](https://oshwhub.com/greenshade/verdibot) |
| USB音频板匹配扬声器/功放 | 1套 | 型号、阻抗、腔体和功放是否板含待同版电路；不默认抄4Ω3W I2S组合 | 成品/板内待核 | 待询 | [PCB说明](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[EDA](https://oshwhub.com/greenshade/verdibot) |
| 改装舵机驱动PCBA | 两轴所需量，待拓扑核实 | 官方说明I2C驱动改装舵机；原表六套芯片不等于本方案必须买6板 | 代工，数量/固件待冻结 | 待询 | [PCB说明](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html) |
| 俯仰执行器 | 1 | 原表4.3g/9g不能直接分配到本轴；按CAD/扭矩/改装要求选定 | 成品+改装/代工待定 | 待询 | [官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html)、[PRD](../prd/prd-v1.1.md) |
| 身体水平执行器 | 1 | 要实现底板不动、上方身体转；不是任意原关节直接替换 | 成品+改装/代工待定 | 待询 | [结构资料](https://github.com/maker-community/VerdiBot)、[PRD](../prd/prd-v1.1.md) |
| 执行器辅助电源 | 1路 | 实际电压、峰值和分配待冻结；不通过Pi5V口盲供所有关节 | 成品适配器待选 | 待询 | [台架计划](hardware-bench-plan.md)、[EDA](https://oshwhub.com/greenshade/verdibot) |
| 低压分配/保护、接地与防回灌连接 | 1套 | Pi、屏、USB板、执行器的供电边界和关机状态 | 电路/器件待定 | 待询 | [台架计划](hardware-bench-plan.md) |
| 匹配当前板卡的屏排线/USB/舵机线束 | 1套，分项待冻结 | 原页0.8接头数量与文字矛盾，不能把原表数字当最终线束 | 压线代工/成品待核 | 待询 | [官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html) |
| 两轴裁剪后的结构打印件 | 1套 | Pi5版头、身体、固定底板、轴支撑；原手臂/耳朵件不照单打印 | CAD修改后打印代工 | 待询 | [结构仓库](https://github.com/maker-community/VerdiBot)、[PRD](../prd/prd-v1.1.md) |
| 匹配结构的轴承、轴套、舵盘、固定柱与螺丝 | 1套，规格数量待冻结 | 原BOM两段轴承与紧固件不一致；按最终CAD生成清单 | 成品待核 | 待询 | [官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html)、[结构仓库](https://github.com/maker-community/VerdiBot) |
| 电源键、聊天键及线束 | 各1 | Pi J2电源循环和独立会话入口；如原板已有则核实复用 | 成品/板含待核 | 待询 | [台架计划](hardware-bench-plan.md)、[PRD](../prd/prd-v1.1.md) |
| 背光与终端供电联动改造 | 1套 | 满足冷启动黑屏、无收音、关机后动作和播放停止；是否原板可控未核 | 电路与固件待定 | 待询 | [PRD](../prd/prd-v1.1.md)、[EDA](https://oshwhub.com/greenshade/verdibot) |
| 原设计Pi5 UPS/电池 | V1 0 | 不照抄原BOM采购；无电池改为稳定插电后，必须重新确认原板电源路径 | 本期不买，改造成本在上项 | 不计 | [官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html)、[PRD](../prd/prd-v1.1.md) |
| 摄像头、环境传感器、额外手臂/耳朵电机 | V1 0 | 非当前需求；省略需确认代码不强依赖，摄像头连接能力保留 | 本期不买 | 不计 | [官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html)、[PRD](../prd/prd-v1.1.md) |
| 调试USB线/网线、必要转接与装配辅材 | 1套 | 烧录、日志、电气验证、维护和有线网络预留 | 成品按盘点补缺 | 待询 | [PCB说明](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[台架计划](hardware-bench-plan.md) |
| PCBA代工测试与舵机改装服务/工具 | 1套 | 现无工具条件下，不把细间距焊接和改舵机劳动算免费 | 询价；已有工具复用 | 待询 | [制作资料](https://verdibot.verdure-hiro.cn/zh/hardware/pcb-manufacturing.html)、[官方BOM](https://verdibot.verdure-hiro.cn/zh/hardware/bill-of-materials.html) |
| 运费、最低板量、改版打印及电源/音频返工余量 | 1项 | 当前BOM未齐带来额外迭代；不以作者旧总价替代 | 询价后预留 | 待定 | [现有预算口径](hardware-route-review-2026-11-01.md) |

**采购闸门：** 选定同一版EDA/CAD/固件 → 取得无冲突完整BOM与改装舵机说明 → 证明可裁剪到规定两轴并保留散热 → 明确USB音频AEC实施路径 → 获得代工/加工全价。未完成前，C4仅能评为设计参考，不能评成比B-L更便宜省时的成品路线。

## C5：Reachy Wireless 与 Lite 的独立完整 BOM

**优势与取舍：** 本体集成、SDK与硬件AEC基础较清楚，可少做从零机械设计；但没有脸屏，国内交期和电源行为仍需核验。它是改变表达方式后的候选，不能悄悄当成原PRD全部满足。

**两版不可混买，也不把 Lite 误当自带 Linux。** 下表每列是一套独立方案。Wireless 自带 CM4 4GB RAM/16GB flash；Lite 为满足“无需日常 Mac 常开”，新增 Pi5 完整主机。两者都无脸屏，不能在保留原 PRD 时宣称下表已经是无缺项的合格机器人；脸屏改造另立条件项。

| 物料 / 用途 | C5-W Wireless：数量与状态 | C5-L Lite + Pi5：数量与状态 | 价格性质 / 规格或购买 |
| --- | --- | --- | --- |
| Reachy 机器人套件 | Wireless ×1，另购，SKU100090917 | Lite ×1，另购，SKU100025004 | US$499 / US$399，Seeed 页面挂牌；[Wireless](https://www.seeedstudio.com/Reachy-Mini-Wireless-Kit-p-6724.html)、[Lite](https://www.seeedstudio.com/Reachy-Mini-Lite-Kit-p-6702.html) |
| 应用主控与原装存储 | CM4 4GB/16GB ×1，已含；不加 Pi/系统 SD | Pi5 4GB ×1，另购；旧计划 ¥1350 占位 | [Wireless 硬件](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/hardware)、[Lite 硬件](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/hardware)、[Pi5](https://www.raspberrypi.com/products/raspberry-pi-5/) |
| 主机 Wi-Fi | CM4 无线/天线已含 | Pi5 无线已含 | 不另买无线模块；中国网络安装/更新仍需验证 |
| 外部主机电源 | 不需要再买 Pi 电源 | 官方 27W USB-C ×1，另购；旧计划 ¥120 占位 | [Pi 电源规格](https://datasheets.raspberrypi.com/power-supply/27w-usb-c-power-supply-product-brief.pdf) |
| 外部主机散热与外壳 | 原装整机方案已含，先测热/负载；不加普通 Pi 散热器 | Active Cooler ×1 + 匹配主机外壳 ×1，另购 | 旧散热占位 ¥60，机壳未询价；[官方散热器](https://www.raspberrypi.com/products/active-cooler/) |
| 外部主机存储/读卡器 | 不必另购；16GB 可用空间/日志增长实测，扩容不能擅自假设 | 128GB microSD ×1 + 必要读卡器 ×1，另购 | 旧计划合计 ¥150；[Pi 系统存储](https://www.raspberrypi.com/documentation/computers/getting-started.html) |
| 音频前端、麦克风、扬声器 | XVF3800 阵列/4 麦、5W/4Ω 扬声器各1组，已含 | 同左，已含 | 套件包含，不另加 XVF3800 板或外部喇叭；[Wireless 规格](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/hardware)、[Lite 规格](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/hardware) |
| 电机与控制电子 | 原装9个舵机及控制/配电板，已含 | 同左，已含 | 不另购两只 ST3215/ESP32；原动作映射到点头/左右转动即可，限位/停机要验 |
| 机壳、底座、机构、螺钉与装配工具 | 1 套，已含；仍需自己组装 | 1 套，已含；仍需自己组装 | 厂商称约2–3小时装配，不是 Jarvis 开发总工时；[Wireless 入门](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started)、[Lite 入门](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/get_started) |
| 机器人原装电源及交流插头 | 原装电源 ×1，套餐/中国插头逐单核；不能用 USB-C 充电 | 原装电源 ×1，官方 Lite 入门明确 supplied；中国插头核对 | [厂商两版说明](https://pollen-robotics.com/reachy-mini/)、[Lite 供电说明](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/get_started)；输入6.8–7.6V，不能换12V舵机电源 |
| 内置电池、摄像头 | 电池与摄像头已含；V1不需要但不是可扣价项 | 摄像头已含、无电池；无需另购 | 套件包含，不另购摄像头；硬件资源同上 |
| 机器人 USB 数据线 | 调试用0–1条，套餐核，不作为每日主机连接前提 | Pi 到 Lite 数据线 ×1，套餐待核，缺少时另购 | [Lite 连接说明](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/get_started)；USB不替代机器人电源 |
| 可直接开始聊天的实体输入 | 1 套待核：原有可编程输入若不合适，另配 USB 按钮/输入板，型号待定 | 1 个外置聊天按钮+Pi输入线，另购，型号待定 | 未询价；SDK入口不等于已有Jarvis聊天按键 |
| 单键保存关机/再次开机及静默启动 | 1 套设计项，原电源板控制能力待核；可能需改装，非已包含成品功能 | 1 套设计项；Pi5电源按钮/两设备供电与动作静默协调 | 未冻结，不默认买某个电源模块就能实现；需先审接口/电路，若不可实现必须回到需求决策 |
| 眼睛与字幕显示 | 原装没有；保留PRD则需另加显示/驱动/电源/安装架1套，型号、接口、载荷待定 | 同左 | **未冻结、未计价、未批准放弃**；不能用外部手机网页冒充脸屏，也不保证添加4英寸屏可行 |
| 未来独立 Jetson 接口 | CM4 控制板公开 USB-C host；有线网需核 USB网卡/驱动及端口占用，0–1套待定 | Pi网口保留，网线×1候选 | 未计入 Jetson 本体；[Wireless 接口](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/hardware) |
| 税运、必要插头适配、固定与备件余量 | 1 项，待到手报价 | 1 项，待到手报价 | 厂商报价排除税运；不要将两个卖家的库存/交期承诺相互替代 |

**开发与可用性判断：** 官方明确 XVF3800 默认 AEC，可通过 SDK/系统调整；这比仅有音频采集示例的证据强，但豆包 PCM 收发、取消旧音频、自然插话与模式仍需整合测试。[AEC 官方文档](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/media_advanced_controls)

Wireless 官方提供 SSH、自定义系统镜像与应用流程，因此本地主控复用有明确入口；不是保证原 Node 项目部署即验收。[开发入口](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started) Lite 的主机须运行机器人控制程序，官方特别说明 ARM64 桌面应用可能不工作，支持直接用 Python SDK；选 Pi5 要走这个已知方向。[Lite 平台说明](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/get_started)

**预算口径：** Wireless = US$499 + 税运/中国供电适配 + Jarvis 按钮/电源适配 +（若保留脸屏）尚未定义的显示改造。Lite = US$399 + Pi 主机电源散热存储旧占位¥1680 + 主机壳 + 同类交互改造/税运。没有换算成“确定低于5000”。官方 Pollen 提示最长90天发货且税运另计，Seeed页面显示库存；中国交付需最终确认。[厂商](https://pollen-robotics.com/reachy-mini/)

## C6：森灵小木编程版完整清单与新增价格证据

**优势与取舍：** 国内成品、Linux和官方编程接口有机会降低装配投入；核心不确定性是是否能完整接管音频、显示和主程序。应先证明自主开发范围，再比较工时。

**本次补齐了独立编程版商品链接：** [官方 Programming Edition 页面](https://www.timuai.com/order/code) 的搜索索引明确 US$380；[标准版入口](https://www.timuai.com/order) 的 US$330 不应用于编程版。直接打开页面返回无可读文本，故当前记录为“官方索引价”，不是已核结算价。官方索引写包邮含税、7个工作日发货，但中国地址/付款渠道适用性未核。

| 物料 / 用途 | 数量与状态 | 价格性质 / 官方入口 |
| --- | --- | --- |
| 小木编程版整机 | 1，另购；必须明确 Programming/Coding Edition，不能标准版替代 | US$380 官方索引价，国内最终价待核；[编程版](https://www.timuai.com/order/code) |
| Linux ARM 主控与RAM | 已含1套；官方列四核1.9GHz、4GB RAM，具体SoC未公开核实 | 套件包含，不再添 Pi；Node版本/磁盘权限需验证；[编程版规格](https://www.timuai.com/order/code) |
| 系统/本地历史存储 | 已含可运行系统的存储；容量/可用空间、扩容接口、耐写性待核 | 不凭4GB RAM误认为4GB硬盘；必要扩容硬件数量0–1，先核接口再定；[开发接口](https://github.com/TimuTechnology/senling-xiaomu-ros2-api-examples) |
| 显示/眼睛模块 | 1套已含；分辨率、可写任意字幕和帧缓冲权限待核 | 不另购脸屏，除非接口审查失败后重新定义方案；[官方产品说明](https://www.timuai.com/) |
| 麦克风、扬声器及音频板 | 内置1套已含；数量/芯片待核 | 不预先加USB声卡；原始录音有示例，任意PCM输出/停播/AEC尚未证明；[官方API仓库](https://github.com/TimuTechnology/senling-xiaomu-ros2-api-examples) |
| 运动机构、电机控制与机壳 | 原装5自由度相关机构1套已含；具体电机型号待核 | 不另购ST3215/ESP32；需确认固定底板上方yaw、pitch是否满足约定；[官方产品](https://www.timuai.com/) |
| 无线联网 | 内置Wi-Fi 2.4/5GHz，已含 | 不另买Wi-Fi模块；部署豆包/方舟自定义请求仍须验证；[编程版](https://www.timuai.com/order/code) |
| 磁吸充电底座 | 1，包装已含 | 不重复计费；[编程版包装](https://www.timuai.com/order/code) |
| USB-C 充电线 | 1，包装已含；不能默认为USB数据开放口 | 不重复计费；同上 |
| 5V/2A 电源适配器、中国插头 | 1，另购预留；包装未列墙插适配器，订单确认赠送后才取消 | 具体型号/价格待定；输入要求来自[官方编程版](https://www.timuai.com/order/code) |
| 电池/摄像头/其他传感器 | 原装已含，不作为本期另购项 | V1不用也不假设可扣价/拆除；摄像头和传感器原始接口见[API仓库](https://github.com/TimuTechnology/senling-xiaomu-ros2-api-examples) |
| 开始聊天实体输入 | 优先核原装触摸/按键是否可独立映射；若不符合，加1套外置输入，接口/型号待定 | 未询价；不是已实现硬件按钮验收 |
| 保存关机、同键再开、启动黑屏/静音 | 1套待验证的系统/电源改造项；可否不改硬件未知 | 不虚构通用电源板；接口未核前不采购改造件 |
| 摄像头未来替换与有线Jetson连接 | 原装摄像头已在；有线网/USB host/扩展引脚待核；扩展适配器0–1套待定 | 未证明有线扩展，不采购Jetson；不能凭“开放接口”口号视作通过 |
| 备份/维护及必要数据线 | 1套维护路径；优先SSH网络备份；USB介质/读卡器仅接口确认后补 | 未询价，不默认已含外置存储 |
| 运输、必要固定/配件与返工余量 | 1项，按中国实际订单核算 | 页面宣传DDP/包邮含税不能替代中国最终订单；不重复默认增加全额海外税运 |

**真正的放行条件不是低价，而是自主接管。** 官方仓库有 Linux/Python/ROS2 入口与传感器/动作示例；本轮没有证明停止原助手后仍能持有硬件驱动、接入原始双向声流并清空播放队列，也没有证明自定义字幕和严格电源流程。不能据商品宣传“所有接口开放”把这些项勾为已完成。[官方 API](https://github.com/TimuTechnology/senling-xiaomu-ros2-api-examples)

若核心音频/显示接口不开放，应淘汰该独立路线或另立“外部主机+独立音频”的新组合并重算，不是在本清单中悄悄追加整套Pi/声卡让它看似仍是成品方案。

## 所有路线都要核对的工具与费用

这些是工作条件，不要求十套方案各买一份。先盘点已有工具，缺少时选择购买、借用或外协；不能把工具支出隐形排除后仍声称整机总投入不超过5000元。

| 项目 | 计划数量 | 哪些路线需要 | 购买/借用与计费方式 |
| --- | --- | --- | --- |
| 精密螺丝刀、镊子、剪线/剥线工具 | 1套 | 自装路线；成品套件视附工具而定 | 按螺丝和接插件规格选；套装已附的不重买 |
| 数字万用表 | 1台 | B-L/B-J/C2/C3/C4及任何改电源的路线 | 用于测压/通断；现有设备优先，缺少则询价计入 |
| 游标卡尺与小量程电子秤 | 各1 | 自建支架、头部承重和代工尺寸确认 | 可以借用；不能只凭屏幕对角线估算装配尺寸和重量 |
| 可控温焊接工具、焊料、助焊剂 | 1套或外协1项，二选一 | C2/C4手工制作，其他路线按改线需求 | 优先询PCBA/预接线方案；不能在无工具条件下假定自己完成细间距贴片 |
| 压接/连接器装配工具 | 1套或预制线束 | 自制电源与运动线束 | 优先明确规格的预制线；不重复算外协和自购工具 |
| USB功率/供电检测器 | 按需1 | USB供电异常定位 | 诊断可选，不把普通测量器当能够通过全部USB数据/PD的配件 |
| 读卡器、USB数据线、调试转接 | 按现有接口缺件 | 取决于主机和固件刷写方式 | 已在路线BOM计过的只计一次；USB自带刷写的板不默认再买USB-TTL |
| 加工运输、装配外协、返工件 | 按报价 | 所有DIY/套件路线 | 各路线已有预留时不重复追加；超过预留才调整总额 |

当前没有核实你的工具库存和这些项目报价。B-L的435元预算余量不是保证能覆盖全部缺件；其他路线同样需要补这部分信息后才能得出最终可买结论。

## 软件投入和你需要动手的内容

| 路线 | 能复用的部分 | 新增开发重点 | 你主要承担的现场工作 |
| --- | --- | --- | --- |
| A1 | 对话规则、业务设计和数据格式思路 | MCU语音/存储/记忆/Skill适配，完整电源交互；不是原Node直接迁移 | 刷写恢复、连接配置、听音与小屏体验；可能改线 |
| A2 | Linux会话、记忆与Skill | 音频桥、设备固件、AEC与取消、显示动作同步、双系统电源 | 主机部署协作、样机刷写、配电与声学验证 |
| B-L | Linux业务与已有表达原型 | 音频路由、实体界面、控制板协议、标定、电源、整机联调 | 收货清点、接线、称重、支架和两轴装配、校准 |
| B-J | Linux业务 | B-L工作＋Jetson/载板适配 | 与B-L相似，另有主机刷机与散热检查 |
| C1 | Linux业务，K151原机械 | 独立音频＋K151脸/动作协议、旧输出取消、双系统电源 | 音频固定、线材/供电组织、刷机与体验验证 |
| C2 | Linux业务；开源终端驱动和协议可借鉴 | 固定版本构建、终端协议、AEC退化可见、云端衔接与电源 | 成板验收或PCBA/打印外协、两轴装配和刷写 |
| C3 | Linux业务，官方板驱动 | 显示接口、软件AEC与豆包、两轴和电源联调 | 叠板/排线、支架、舵机与音频摆位 |
| C4 | Linux业务，部分CAD/PCB资料 | 对齐版本、裁剪结构、驱动/音频验证、舵机控制 | 制板、焊接/代工、打印、改舵机和机械调整较多 |
| C5 | Linux业务设计与SDK | 豆包音频适配、取消/模式/记忆、生命周期和扩展接口 | 套件装配、联网和设备维护、现场验收 |
| C6 | 业务逻辑设计，厂商动作/音频API | 先证明可接管，再定原程序替换、PCM播放与停播、字幕 | 成品开通/SSH、厂商接口验证、声学与交互体验 |

除A1需较大移植外，Linux路线可以复用当前业务基础，但都仍要目标平台验证。上表不意味着某条路线已有完整开发排期。只有B-L已有分项估算，不能凭其他方案清单更短就给它承诺“几天完成”，也不能把共用软件工时全部算成成品可节省的时间。

## 选择前，各方案最需要补齐哪一项

| 路线 | 第一优先补齐的证据 | 出现什么情况就需要重选或重估 |
| --- | --- | --- |
| A1 | 当前业务在MCU上的部署方案，含本地历史/记忆与可维护性 | 必须大幅简化已确认功能，或仍隐含依赖个人Mac |
| A2 | K151指定固件下，真实外放时能收音并立即停掉旧回答 | 音频桥只能轮流收放，或所购屏批次无法支持 |
| B-L | USB音频、主机供电与单轴载荷分别过台架 | AEC/电流/承重需要大幅换型，或真实总价超预算 |
| B-J | 完整含缺件价格及本期GPU用途 | 在5000元上限不变时，完整总价仍高于上限 |
| C1 | K151脸/字幕/动作控制可用，独立音频预算和摆位明确 | 为了改屏/改头又重做机械，或电源/附件令总价超限 |
| C2 | 硬件生产文件/成板可获得，固定固件可构建，具体链路启用AEC | 无法拿到匹配板件，或实际运行长期退回原始麦克风 |
| C3 | HAT+驱动/音频兼容和头部布局；普通版字幕体验 | 集成板迫使重主控随头转，或软件AEC不能达到体验目标 |
| C4 | 同一版本的CAD、PCB、BOM能闭合 | 只能拼接互相矛盾的文件，导致大量重新设计 |
| C5 | 是否接受无脸屏；国内供货与总价；可用音频/SDK链路 | 脸屏要求保留且无轻量改造，或交期影响目标日 |
| C6 | 厂商确认并展示原始PCM输入输出/停播、AEC、自定义界面和应用接管 | 只能调预设文本播报或动作，不能掌握会话与音频 |

## 当前建议与下一步讨论入口

我建议按需求取舍分组，而不是给十条路线一个看似精确的综合分数：

- **保留脸屏、尽量少做机械：** C1最值得先查清；A2继续保留，区别在于愿不愿投入K151音频桥开发。
- **保留大一些的脸屏、接口和布局自主性：** B-L是比较基线；C3可研究减少零散板卡，但不自动减少机械和声学工作。
- **接受开源套件/代工，希望复用成熟代码：** C2先核硬件可获得性与实际AEC路径，再比较总价和工时；不先假定它比成品路线省事。
- **可接受没有屏幕脸、希望本体高度集成：** C5应重点比较。其限制来自产品需求差异与交付条件，不是缺少Linux或AEC基础。
- **希望直接购买国内可编程成品：** C6先核底层自主权；若能接管音频、界面和业务，再进入正式预算比较。
- **优先学习机械/电路并愿意制作：** C4可作为复用方向；A1是MCU平台方向；B-J只有预算或近期本地算力目标改变后才有更强理由。

下一轮只需聚焦少数候选，将各自待定行变成具体料号、到手价和验证步骤，再决定首批样机/器件。现在无需同时购买十套硬件，也不要求你立即确认路线。

## 依据与维护方式

本文件汇总并更新了[原四路线及预算](hardware-route-review-2026-11-01.md)、[新增路线调查](hardware-alternatives-review-2026-11-05.md)、[B-L工时明细](bl-work-breakdown-2026-11-02.md)和[电源/台架计划](hardware-bench-plan.md)。外部购买与硬件来源随各方案列出。

本轮新增价格更正：XVF3800单件现为US$60.99，旧报告US$54.90仅作历史记录；小木编程版独立页面为US$380，标准版US$330不混用。价格核查不代表付款页面、国内税运或发货承诺已确认。

后续变更优先更新本文总表与对应BOM，再同步工作清单T-42。文档更新不自动变更PRD、任务完成状态或交付日期。最终采用哪条路线仍由你决定。
