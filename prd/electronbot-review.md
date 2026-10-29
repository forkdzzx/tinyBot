# ElectronBot 对 Jarvis 的参考审查

> 日期：2026-10-21  
> 目的：在 Jarvis PRD v1.1 确认前，辨别 ElectronBot 中值得继承的体验与工程设计，补齐当前需求遗漏。  
> 审查仓库：[peng-zhihui/ElectronBot](https://github.com/peng-zhihui/ElectronBot)  
> 固定版本：[819927015323181a9a10e0184d64ad2bddfcb407](https://github.com/peng-zhihui/ElectronBot/tree/819927015323181a9a10e0184d64ad2bddfcb407)，查询时 main 指向该版本，提交日期为 2025-02-08。不是把当前仓库误当成未经修改的 2022 年发布快照。  
> 对应文档：[Jarvis PRD v1.1](prd-v1.1.md)。本次补充已随用户于 2026-10-23 整体确认 PRD 纳入基线；该日为项目启动日 T0。

## 1. 结论

ElectronBot 对 Jarvis 最有价值的参考，是把屏幕、机械姿态和交互节奏组合成一个有存在感的角色。Jarvis 应继承这种表达方式，并增加自然语音、记忆和主动交流。

建议保留当前“独立 Linux 主控、两个关节、第一代允许无外壳”的范围，把以下遗漏合并进 PRD：

1. 表情具有进入、循环、退出与被打断后的过渡规则。
2. 语音、眼睛、字幕和关节动作围绕同一次交互协调；打断需要取消整个旧表达，而不只是关闭声音。
3. 本地状态反馈不等待云端模型；云端慢时仍显得在倾听和思考。
4. 显示、语音和运动各自可降级，故障设备不能把整个机器人拖入无限等待。
5. 明确关节零位、方向、软限位、实际反馈能力和上电行为。
6. 先验证轻量头部、屏幕比例、重心和线材，再决定最终结构。
7. 开发初期增加最小表达样机和分模块自检，不到最后才第一次检查“像不像一个在交流的机器人”。

不建议本期照搬六自由度、双臂、极限小型化、自制全部 PCB、魔改舵机或 Unity 工作室。它们会显著增加工作量，而当前需求并不依赖这些部件。

## 2. 审查范围与证据边界

已读取完整仓库目录（5568 项，API 未截断），并按固定提交读取了 21 个关键文本文件，包括 README、根许可证、主控固件、舵机固件、LowLevel/Player SDK、Unity 姿态相关脚本及最小显示测试代码。

本次是静态源码和文档审查，没有购买或组装原机器人，没有编译运行其固件、Windows 程序或 DLL，没有对 STEP 模型执行尺寸／干涉分析，也没有观看完整演示视频。不能据此给出原项目的实测延迟、功耗、可靠性或今日复刻成本。

证据分三种：

- **仓库事实**：代码、目录或作者说明直接支持。
- **审查推断**：根据代码路径分析的风险，未作实机复现。
- **Jarvis 建议**：结合既有需求提出的本期设计细化，不是原仓库已经实现的功能。

## 3. 原项目与 Jarvis 的差异

ElectronBot 的 README 描述了 EVE 风格、六自由度、可回传角度的定制舵机及 USB 显示控制；硬件资料分为头部主控、传感器板、底座连接、舵机驱动和驱动调试板。README 还在 2022-04-17 的更新中链接了社区语音识别版本，因此应区分“原核心工程不是大模型助手”与“当时完全没有语音扩展”。本次未审查该独立语音分支。[作者说明](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/README.md#L25-L81)

| 维度 | ElectronBot 所审查实现 | Jarvis 的取舍 |
| --- | --- | --- |
| 日常运行 | 原软件链路以电脑上位机向机器人发送画面与姿态为核心 | 成品不依赖用户电脑持续运行；能力放在机器人 Linux 主控中 |
| 表达 | 屏幕与六关节共同表现 | 保留眼睛、脖子和底座两个关节，优先打磨协调性 |
| 图像链路 | LowLevel SDK 把画面转换为 240×240 RGB 数据经 USB 发送 | 不锁定分辨率和 USB 推帧方式；优先兼容、可读、低延迟 |
| 人机交互 | SDK、姿态编排及应用示例可供二次开发 | 自然语音、云端模型、本地记忆和模式是新增系统 |
| 机械 | 紧凑定制机构与特殊舵机方案 | 不按原图纸同比放大；优先现成机构和可维护安装 |
| 配置工具 | Windows C++ SDK、Unity 编辑工程 | 第一代保留本地配置，不移植完整编辑器 |

软件侧证据：[图像及关节传输](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-LowLevel/src/electron_low_level.cpp#L22-L175)、[构建依赖](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-LowLevel/CMakeLists.txt)。

## 4. 值得合并的设计

### EB-01：把表情作为有过渡的行为

**证据：** `4.CAD-Model/Emoji` 中有多组进入、可循环、回正片段；作者说明这些片段用来衔接不同表情。[表情目录](https://github.com/peng-zhihui/ElectronBot/tree/819927015323181a9a10e0184d64ad2bddfcb407/4.CAD-Model/Emoji)

**对现有 PRD 的补充：** 原版列了很多表情，但尚未规定如何切换。Jarvis 的开心、思考、疑惑等至少需要过渡、保持和退出语义；可通过程序化眼睛实现，不要求照搬 MP4 或增加动画编辑器。被打断时允许跳过旧表情的常规退出段，迅速进入倾听，不能等一整段动画播完。

眼睛平滑、动作克制，比每句话随机换一个表情更接近用户想要的实体伙伴。空闲生命感主要由眨眼等本地小变化提供，不必持续转动电机。

### EB-02：语音、眼睛与动作使用同一交互上下文

**证据：** `FrameMeta.cs` 为同一帧保存画面和六关节目标，`PoseEditor.cs` 可把头部、身体与手臂姿态录入帧；LowLevel SDK 在图像传输中携带关节数据。这说明原实现有明确的画面／姿态协同设计，但不等于已经具备大模型实时语音同步。[帧元数据](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/Unity/ElectronBot-Studio/Assets/Scripts/FrameMeta.cs#L5-L18)、[姿态记录](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/Unity/ElectronBot-Studio/Assets/Scripts/PoseEditor.cs#L120-L138)

**建议：** Jarvis 以会话轮次组织表达。识别到用户说话进入倾听，等待回答进入思考，实际开始播放才进入说话；鼓励、开心等可在合适的回答片段触发有限预设动作。无需逐字同步，更不需要云端生成每一帧关节轨迹。

当用户打断时，旧音频、尚未执行的旧动作、旧字幕及后到的旧结果应一起失效。实际关节以平滑减速或保持处理，不能为追求“立刻停”做剧烈反向动作。

### EB-03：把“本地快速反馈”和“云端有效回答”分开验收

**审查推断：** 本地受控的表达能力适合在云端尚未返回时维持交互状态。原 PRD 只有 1–3 秒有效回答目标，缺少用户开口后机器人何时表现出“正在听”的指标。

**建议：** 唤醒确认或有效语音活动已被本地检测后，争取在 300 ms 内呈现倾听表情。这个目标从本地事件被检测到起算，不能代替从用户说完到有效回答的 1–3 秒目标。外部请求慢时本地动画仍能运行；断网时仍能表达状态。

这不增加离线聊天功能，只是让已有眼睛状态及时出现。

### EB-04：分层与故障隔离应成为明确行为

**证据：** 原主控在同一主流程中接收图像、刷新显示、轮询关节；I2C 收发与部分 USB 等待存在无总时限循环。主控初始化阶段就依次访问六个关节。[主循环](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/2.Firmware/ElectronBot-fw/UserApp/main.cpp#L17-L85)、[I2C 循环](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/2.Firmware/ElectronBot-fw/Bsp/robot.cpp#L81-L92)

**建议：** Jarvis 保留 Linux 主控与小控制板的职责分工，但不能照搬同步阻塞流程。显示、运动与语音要有独立的超时、取消和失败恢复边界。单个关节缺失、控制板未就绪或连接中断时，机器人应报告能力不可用，而不是卡在启动或影响聊天。

建议有控制板就绪握手、心跳和过期命令丢弃机制；重新连接不回放掉线前积压的点头动作。主控掉线后如何保持或停止电机需按结构验证，不能机械地一律断力导致头部下坠。

### EB-05：关节反馈、校准和动作预设分开

**证据：** `robot.h` 每个关节有物理角度范围、模型角度范围及反向标记；`robot.cpp` 进行两者映射并读回角度；舵机固件通过 ADC 得到角度，执行位置控制。代码中的 `SetTorqueLimit` 实际限制控制输出幅度，不能把名字理解为精确的实测扭矩传感。[关节配置](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/2.Firmware/ElectronBot-fw/Bsp/robot.h#L19-L128)、[角度采样](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/2.Firmware/ServoDrive-fw/UserApp/main.cpp#L222-L238)、[输出限制](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/2.Firmware/ServoDrive-fw/Ctrl/motor.cpp#L5-L55)

**建议：** Jarvis 两个关节分别保存零位、方向、软限位、速度及动作幅度。装配或换舵机后重新校准；“点头”引用校准后的相对动作，不能照抄原项目数值。

有位置反馈的成品执行器可作为选型加分项，是否采用取决于预算。普通舵机的“指令已发送”不等于“已经到达”，不反馈电流／位置时也不能承诺可靠堵转检测。本期不新增手动拖动示教或自研舵机驱动板。

### EB-06：机械结构不能直接同比放大

**证据：** 仓库有 STEP 结构资料，作者提到很紧凑的舵机安装、底座柔性排线与 31.5 mm 面罩玻璃。31.5 mm 是面罩参考尺寸，不能冒充整机尺寸或屏幕有效显示尺寸。[CAD 目录](https://github.com/peng-zhihui/ElectronBot/tree/819927015323181a9a10e0184d64ad2bddfcb407/4.CAD-Model)、[结构说明](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/README.md#L120-L155)

**建议：** Jarvis 约 8×8 cm 的屏幕意向会改变头部重量与重心，不能拿原舵机、打印件和转角直接用。先做屏幕、支架和等效重量测试，再选执行器。

计算板、散热器和较重部件优先安排在固定底板或低处，尽量减轻颈部负载；底板上方身体仍按现有需求左右转动，具体安装需兼顾线材跨关节的余量。验证底座稳定、线材拉扯、活动范围、散热和拆装维护。即使没有外壳，也应有明确的脸部朝向和整洁固定，不将“无外壳”理解成所有部件散落在桌上。

### EB-07：显示布局和通信不照搬原分辨率

**证据：** LowLevel SDK 固定为 240×240×3 字节，一帧图像分四段传输，关节信息附在传输中。[图像缓冲与传输](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-LowLevel/src/electron_low_level.cpp#L130-L175)

**建议：** 学习“画面与姿态一致”的语义，不绑定原始推帧协议。在 Jarvis 目标屏幕上验证眼睛面积与两行中英字幕：20–50 cm 能看清，文字不挤掉角色表情。第一代优先程序化眼睛与已有字体渲染，不以视频播放器或 Unity 运行时作为必需依赖。

### EB-08：先做小模块，再做完整机器人

**证据：** 仓库专门提供 `6.Tests/TestDisplayUSB`，其主循环只处理显示链路，省去了正式固件中的六关节访问。[最小显示测试](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/6.Tests/TestDisplayUSB/ElectronBot-fw/UserApp/main.cpp)

**建议：** Jarvis 先分别验证屏幕、收音与播放、单关节和按键，再组合两关节；增加本地开发自检入口，允许不连接云端／不连接电机时测试眼睛状态。

第 1–2 周就演示“唤醒—倾听—思考—说话—打断—回到倾听”的最小表达序列。可以使用本地模拟事件，它是开发验证，不是对用户承诺离线智能。按键与运动异常也在早期测试，不能等所有板子和外壳都完成后才联调。

## 5. 不能直接作为 Jarvis 成品底座的源码细节

以下是本次在固定版本中发现的具体问题，不代表对全部仓库或社区改版作了完整缺陷审计，也没有修改或向上游提交任何代码。

| 项目 | 静态证据与风险 | 对 Jarvis 的意义 |
| --- | --- | --- |
| 图像尾包缓冲区越界 | LowLevel 头文件的 `usbBuffer200` 只有 200 字节；实现先复制 192 字节，再复制 32 字节附加数据，并发送 224 字节，超过该数组边界 24 字节 | 原 SDK 不能未经审查就作为可靠库复用；若选择复用需先修复并验证数据边界 |
| 失联后可能无限等待 | SDK 收发循环不设总重试界限，`Disconnect()` 先等待工作线程；固件 I2C 和 USB 等待也有无总时限路径 | “单次调用有超时”不等于整个流程可退出；必须有取消、总期限和独立降级 |
| Player 姿态接口尚未实现 | 主 SDK Player 的 `SetPose()` 为空，`GetPose()` 返回默认对象 | 不能仅看 API 名称就承诺姿态播放／反馈已经具备；其他低层或 Unity 路径应分别验证 |
| Windows 构建依赖 | CMake 有 Windows 库路径、MSVC `.lib`，头文件使用 `__declspec(dllexport)`；目录有 USBInterface DLL | Linux/ARM 运行不是复制目录即可，需要传输层和构建适配，不能记作零成本 |

证据：

- [缓冲区声明，第 39 行](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-LowLevel/src/electron_low_level.h#L39)；[192+32 字节写入和 224 字节发送](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-LowLevel/src/electron_low_level.cpp#L146-L152)。
- [SDK 循环与 Disconnect](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-LowLevel/src/electron_low_level.cpp#L56-L126)；[固件等待](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/2.Firmware/ElectronBot-fw/Bsp/robot.cpp#L11-L92)。
- [Player 空实现](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-Player/src/electron_player.cpp#L56-L65)。
- [Windows 构建配置](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/3.Software/SDK/ElectronBotSDK-LowLevel/CMakeLists.txt)。

## 6. 复用方式与预算影响

| 内容 | 建议 |
| --- | --- |
| 表情生命周期、姿态编排思想、分模块测试方法 | 直接转化为 Jarvis 的产品行为和开发要求 |
| 眼睛素材 | 可以研究和预览；使用原素材前记录作者和来源，先在目标屏幕验证比例与字幕空间 |
| CAD 与机构 | 用于学习关节布局、承重、排线和装配，不承诺原件直接适配 Jarvis |
| SDK、固件、协议 | 参考分层；若复用源码需做 Linux 适配、边界检查、超时和取消处理 |
| 全套原 PCB 与魔改舵机 | 第一代不列为默认路线；优先成品控制板和执行器 |
| Unity 编辑器、双臂、手势／摄像头、示教 | 留在后续探索，不加入当前交付范围 |

仓库根目录提供 [GPL-3.0 许可证文本](https://github.com/peng-zhihui/ElectronBot/blob/819927015323181a9a10e0184d64ad2bddfcb407/LICENSE)，README 单独署名了表情作者。若以后实际复制和对外分发源码、素材或修改设计，应在技术选型时记录具体文件、版本、来源和适用许可。本次只是审查和需求转化，没有把这些源码或素材复制进 Jarvis 项目。

本次审查没有发现可以直接替代 Jarvis 完整音频、Linux 主控和电源流程的现成低成本清单，因此不推翻 PRD 原有 B-L／B-J 预算结论。原项目中的历史打印费用不能作为今天 Jarvis 的整机报价。

对 C 方案的新启示是：即使使用 Jetson，也不必把计算板塞进头部；对于 A 方案，分层接口便于未来加计算节点。原项目由电脑上位机处理显示与应用，也不能反推出“Jarvis 必须买 GPU 才能有可爱的表情”。眼睛和两个关节的体验应独立评估。

## 7. 本次合并位置

| Review 编号 | PRD 修改位置 | 性质 |
| --- | --- | --- |
| EB-01 / EB-02 / EB-03 | 1.3、4.2、7.4 | 明确用户动机，增加表达生命周期、整轮取消、本地快速反馈建议 |
| EB-04 | 8.4、10.3、12.2 | 独立降级、就绪与失联处理、过期命令、故障验收 |
| EB-05 / EB-06 | 7.5、7.6 | 校准、反馈边界、承重与走线验证 |
| EB-07 | 7.4、8.4 | 屏幕可读性和实现方式不绑定原协议 |
| EB-08 | 11、13、12.2 | 前置最小表达样机与分模块自检 |
| 复用与源码审查 | 14、15、17 | 复用边界、版本化证据、本次变更摘要 |

本次没有改变两个关节、无摄像头、独立运行、5000 元预算、无正式外壳、三个月周期及既定按键流程。新增条目是对“实体交流感”和可靠性的细化建议，保留随 PRD 整体确认的状态。
