# K151 到手后的固件登记、备份与回刷

**2026-11-08 · 适用于 A2 首批的 M5Stack StackChan K151 标准机身。** 拿到样机后，先记录“拿到时能做什么”，再准备恢复材料，最后刷 Jarvis 开发固件。今天在 Mac 上核过源码版本、工具命令和厂家说明。样机版本、能否读取整片 Flash、恢复后的外设表现都留待现场填写。[A2 硬件交付书](../forProject/A2-硬件选型交付书.md)

## Mac 工位与开发基线

| 项目 | 确认方法及本轮记录 |
| --- | --- |
| 主机 | `uname -m` 为 `arm64`，`sw_vers -productVersion` 为 `26.2`，当前 `python3 --version` 为 `3.9.6`。当前命令路径未找到 `idf.py` 或 `esptool`，本轮没有编译、安装刷机工具或连接设备。 |
| 固件源码 | M5Stack/StackChan 固定提交 `28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400`，其中 `firmware/CMakeLists.txt` 的 `PROJECT_VER` 为 **1.6.2**。板型为 StackChan / ESP32-S3。样机到手时单独登记实装版本。[版本定义](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/CMakeLists.txt) |
| 工具链及依赖 | 上游指定 **ESP-IDF v6.1**。保留该提交的 `dependencies.lock`、`repos.json` 和音频补丁，核对小智 v2.5.2 提交 `49b4380b3faa0ceadd28a3e78aaf0f311c46c57e`。在独立检出的这份源码的 `firmware/` 下，激活指定 ESP-IDF 环境，按顺序执行 `idf.py --version`、`python3 ./fetch_repos.py`、`git -C xiaozhi-esp32 rev-parse HEAD`、`idf.py build`。这一步只编译。记录顶层提交、实际依赖提交、工具版本和构建结果。[固定版构建说明](https://raw.githubusercontent.com/m5stack/StackChan/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/README.md) · [依赖与补丁](https://raw.githubusercontent.com/m5stack/StackChan/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/repos.json) |
| 回刷工具 | 原厂恢复走 **M5Burner** 的 StackChan 官方条目。K151 手册列出的 macOS 安装包是 x64，首次操作前先在这台 arm64 Mac 打开工具、核实能下载固件。下文选用独立的 **esptool 5.1.0** 做可选的同机备份，命令使用该版本的连字符拼法。在 Python ≥3.10 的独立虚拟环境中执行 `python -m pip install 'esptool==5.1.0'` 和 `esptool version`，应显示 5.1.0。[M5Burner 官方下载](https://docs.m5stack.com/en/download) · [esptool 安装条件](https://docs.espressif.com/projects/esptool/en/latest/esp32/installation.html) · [5.1.0 命令定义](https://raw.githubusercontent.com/espressif/esptool/v5.1.0/esptool/__init__.py) |

## 收到样机，第一次刷写之前

1. 给样机一个本地编号，例如 `K151-01`。登记 SKU、包装批次、底座及所用数据线。官方记录 2026-08-07 更换过 LCD，ILI9342E 要求采用 M5GFX 时版本 ≥0.2.27。询问供货方这台的屏幕型号。只有日期线索时，屏型号填“待核”。[产品规格与版本变更](https://docs.m5stack.com/en/StackChan/)
2. 离线启动原厂应用，观察启动画面右下角的 `V…`，出现太快可拍摄启动画面回看。固定版源码在这里显示固件版本。若该批次不显示，可从已有的启动日志查项目版本，仍读不到就登记“未知”。先别进入联网的 AI Agent 或固件更新页，原厂应用可自动更新。记录原屏文字及触摸、正常音量下的麦克风自检和回放、灯、舵机回中与侧键启动的表现。仅做回中观察，保留原有校准。[启动标签](https://github.com/m5stack/StackChan/blob/28b9f0c8bd6acd81cb3c70f1a93c3e373b39d400/firmware/main/hal/hal.h#L152-L167) · [原厂功能与自检](https://docs.m5stack.com/en/StackChan/)
3. 打开 M5Burner，搜索 **StackChan**，勾 **Only Official**，选机身对应的原厂固件。记录条目名、发布者、具体版本及支持的屏批次，先只按 **Download**。有可访问的本地发布包时保留该文件并记录 SHA-256。官方工具提供的版本有可能比到手版本更新。借样时与出借人明确是否允许重刷以及需交还哪个状态。若要求原样归还，先完成下面的同机备份并核对设备绑定、外部存储及舵机校准；无法保留的状态与出借人核实后再刷。[厂家恢复流程](https://docs.m5stack.com/en/StackChan/#restore-factory-firmware)

## 需要保留原状态时，读取这台机器的 Flash

整片镜像可能含 Wi-Fi 配置及设备配对资料。仅在允许备份的样机上操作，写到 Mac 的私有本地目录，公共测试记录只登记样机编号、版本、字节数、校验值和结果。ESP32-S3 的 Flash 备份范围不含 microSD、eFuse、厂商账号状态或外围控制器内部存储。

1. 用数据线连接 **底座 USB-C** 与 Mac。普通启动时和进入下载模式后串口可能不同。按住机身底面 microSD 旁的 **RST** 约 3 秒，绿灯亮后松手，绿灯熄灭表示已进入下载模式。拔插前后各运行一次 `python -m serial.tools.list_ports`，确认实际出现的端口。关闭其他占用该串口的工具。[K151 下载模式](https://docs.m5stack.com/en/StackChan/#download-mode)
2. 在已激活 esptool 的终端填写实际端口，先运行两条只读查询。命令逐条执行，任一步失败先查端口及下载模式。若芯片或容量不符，或显示 Secure Download、Secure Boot、Flash Encryption 启用／状态不明，保留结果，使用厂家针对该样机的受支持方案；保留保护设置和 eFuse 原值。[安全状态查询](https://raw.githubusercontent.com/espressif/esptool/v5.1.0/esptool/__init__.py) · [Flash 容量与保护](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/esptool/basic-commands.html)

   ```sh
   k151_port='/dev/cu.请换成刚确认的实际端口'
   esptool --chip esp32s3 -p "$k151_port" --after no-reset --no-stub get-security-info
   esptool --chip esp32s3 -p "$k151_port" --after no-reset flash-id
   ```

3. 对于确认是 ESP32-S3、Flash 为 16 MB、上述保护均未启用且可正常读取的原机，在用户私有目录新建一次性备份目录，保留其完整路径。以下命令在 Mac 的 zsh 中逐条执行，失败就停下。校验期间保持下载模式，避免应用启动后写入配置改变对比结果。若串口消失，重新进下载模式并核对 `k151_port`。[全片读取](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/esptool/basic-commands.html#read-flash-contents-read-flash) · [读取后保持下载模式](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/esptool/advanced-options.html) · [设备与文件比对](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/esptool/advanced-commands.html)

   ```sh
   umask 077
   k151_backup=$(mktemp -d "$HOME/K151-01-backup.XXXXXX")
   cd "$k151_backup"
   esptool --chip esp32s3 -p "$k151_port" --after no-reset read-flash 0 ALL stock.bin
   wc -c stock.bin
   esptool --chip esp32s3 -p "$k151_port" --after no-reset verify-flash 0 stock.bin
   shasum -a 256 stock.bin > stock.sha256
   shasum -a 256 -c stock.sha256
   ```

   此规格期待 **16,777,216 字节**、设备比对成功、最后本地输出 `stock.bin: OK`。校验针对读取的一致性。恢复后的实际功能仍需下一节验证。

## 还原与复核

| 要恢复的内容 | 现场操作 |
| --- | --- |
| 官方应用及出厂功能 | 在已准备好的 M5Burner 官方 **StackChan** 固件条目点 **Burn**，核对版本与机身端口，再点 **Start**。完成后按需短按 RST 正常启动，先离线核对原厂启动版本与功能。此路恢复到所选发布版，用户设置及账号绑定另核。[厂家恢复说明](https://docs.m5stack.com/en/StackChan/#restore-factory-firmware) |
| 这台机备份时的完整 Flash | 仅在确需还原原镜像时，重新核对同一台样机、芯片、容量和安全状态，进入该机的备份目录，再运行 `shasum -a 256 -c stock.sha256`。结果为 OK 后，使用 `esptool --chip esp32s3 -p "$k151_port" --after no-reset write-flash 0 stock.bin` 写回整片。随后 `esptool --chip esp32s3 -p "$k151_port" --after no-reset verify-flash 0 stock.bin`，成功后短按 RST 重启。整片写回会覆盖这台机备份以来的所有 Flash 改动。遇到保护拒绝或校验差异时保存报错，停在台架排查。[写入与保护](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/esptool/basic-commands.html) · [复核命令](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/esptool/advanced-commands.html) |

恢复完成的判据是复现首刷前记录的原厂启动、屏幕显示、触摸、麦克风自检回放、舵机回中及原厂电源键行为。逐项记“通过／失败／未测”，同时登记目标版本、实见版本、工具版本和样机编号。若仍是白屏或某一关节失败，保留故障及硬件批次，再检查发布包。Jarvis 的 20／50 厘米真实插话、墙充常插时机身同键关机再开、Linux 主机到位后的五轮双机循环，分别按[硬件台架计划](../forProject/docs/k151-hardware-plan-2026-11-08.md)独立记录。
