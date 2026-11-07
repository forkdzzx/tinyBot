# 火山引擎接入准备（Mac 首轮验证）

核对日期：2026-10-24。用户已确认开通 Seeduplex 3.0，本地凭证已通过真实 API 验证。以下开通步骤保留用于复现；控制台套餐与账单未登录核验。

最新补充：为比较语义与上下文能力，另准备了 [方舟文本模型的最小开通说明](ark-evaluation-setup.md)。现有语音服务无需重开，暂不要求开通独立 ASR/TTS。

## 用户需要做的准备

1. 登录[火山引擎控制台](https://console.volcengine.com/)，按平台提示完成注册、实名认证等必要账号步骤，搜索并进入豆包语音服务。此次开通的是开发者 API，不是豆包 App 会员。
2. 查找端到端实时语音服务。当前官方文档介绍的是 **豆包实时语音 3.0（Seeduplex）**。确认账号实际能开通的版本、费用和额度；如果控制台不提供该版本，记录可见版本名称，我们据此匹配协议。
3. 在新版豆包语音控制台的 **开通管理／API 服务中心**找到上述服务，核对实际价格与试用额度后开通。此次先验证端到端实时语音，不必同时购买独立语音识别、语音合成、声音复刻或 RTC 服务。如果提示申请权限或版本不可用，记录页面提示，不随意改买其他服务。
4. 在 **API 管理／API Key 管理**创建供本项目使用的凭证，可命名为 `jarvis-dev`，保持与开通服务相同项目。不要把方舟文本模型 Key 当作已验证可通用的语音凭证。密钥只保存在本地，不贴入对话。[官方控制台指引](https://docs.volcengine.com/docs/DoubaoVoice/console-guidance?lang=zh)、[API Key 说明](https://docs.volcengine.com/docs/DoubaoVoice/APIKeyUsage?lang=zh)
5. 后续运行真实语音程序时允许 Mac 麦克风权限；使用机器人预期的 20–50 cm 距离测试。现在的表达原型不需要麦克风。
6. 完成后只告诉我“已开通”、服务版本和本地配置文件路径，无需提供密钥内容。

有试用额度时优先用于首轮验证；没有时，先核对按量计费与账户充值要求，不急于购买长期资源包。1000 元/月是项目预算目标，不是本次充值金额。实际权益和费用以账号页面为准，不承诺免费。

新版凭证入口可尝试直接打开：[豆包语音 API Key 管理](https://console.volcengine.com/speech/new/setting/apikeys)。如果页面显示 APP ID、Access Token 等旧版信息，先确认控制台版本；旧接口不是不能用，但需要匹配对应协议，不能套用新版单 Key 配置。

## 本地保存方式

在项目根目录执行：

```sh
cd /Users/davidzhou/Desktop/workplace/tiny-robot
mkdir -p runtime
chmod 700 runtime
touch runtime/volcengine.env
chmod 600 runtime/volcengine.env
nano runtime/volcengine.env
```

在 nano 中编辑后按 Control+O、回车保存，再按 Control+X 退出；也可使用自己熟悉的本地代码编辑器。

用本地编辑器填写该文件，下面仅是占位示例：

```dotenv
VOLCENGINE_SPEECH_API_KEY=在本地填写真实值
```

`runtime/` 已加入忽略规则。表达原型不读取凭证；新增语音代理通过此文件读取凭证，运行方式见 [Mac 试聊说明](mac-voice-test.md)。无需现在配置文本模型、搜索或购买长期套餐。

## 已核对的接口差异

官方 3.0 页面说明使用新的 Realtime 事件协议，和原版存在明显差异；当前请求头使用 `X-Api-Key`，提供 Python、Go 和 Web 示例。不能混用旧版消息格式。输入为 16 kHz，输出为 24 kHz，后续需按选定格式处理音频，并遵守实时发送节奏。[当前 API 文档](https://docs.volcengine.com/docs/DoubaoVoice/endtoend-realtime-voice-full-duplex-version?lang=zh)

已核对[接入必读](https://docs.volcengine.com/docs/DoubaoVoice/access-mustread?lang=zh)及当前版本会话示例，并通过真实事件验证音频格式、文本回传及会话关闭。模型 ID 为 `1.2.6.1`；控制台权益与价格尚未登录核验。

## 开通后的第一轮

先用当前版本官方示例确认收音、播放与中英文连续对话，记录具体版本。随后接入 Jarvis 的轮次取消和表达，测试真实插话是否停音、旧音频是否清空，再测试文字回传、记忆提示与工具调用。最后记录实际用量并外推每天 1–1.5 小时聊天的月成本。

测试不记录原始录音，文字和诊断日志本地保留。唤醒前不持续上传环境音；云端连接只在允许的会话窗口建立。不要把浏览器示例的 Key 填到第三方体验站。
