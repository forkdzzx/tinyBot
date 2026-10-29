# 文本模型对照：最小开通步骤

2026-10-25 更新：用户已保存配置，方舟标准 API 已实测连通，返回模型版本 `doubao-seed-2-1-turbo-260628`。下方步骤保留供重建环境使用，无需重复开通。

本轮只增加一个文本模型，用已有识别文本测试理解和上下文。不需要再次测试麦克风，也不需要现在购买硬件或开通独立 ASR/TTS。

1. 登录 [火山方舟控制台](https://console.volcengine.com/ark/region:cn-beijing)，使用北京区域，进入模型开通/模型服务，查找 **Doubao Seed 2.1 Turbo** 并开通标准在线 API 调用。候选版本为 `doubao-seed-2-1-turbo-260628`；若控制台没有此版本，请告知可选模型名称，不必猜一个近似 ID。
2. 在 [方舟 API Key 管理](https://ark.volcengine.com/region:cn-beijing/apikey) 创建有该模型调用权限的标准 API Key。此处需要方舟标准 API 凭证，不是现有豆包语音 Key，也不是 Agent Plan/Coding Plan 专用 Key。官方说明见 [快速入门](https://docs.volcengine.com/docs/ark/quick-start?lang=en)。
3. 在本地新建 `runtime/ark.env`，参考 [配置模板](../eval/voice-v1/ark.env.example)，填写：

```dotenv
ARK_API_KEY=在本地填写实际密钥
ARK_MODEL=doubao-seed-2-1-turbo-260628
```

4. 保存后告诉我“方舟配置已保存”。不要把密钥贴到聊天中。已有 `runtime/volcengine.env` 保留；两个服务的凭证各自读取。

该目录已排除版本控制；建议文件权限设为仅本人可读写。若已存在配置，请直接编辑，避免覆盖已有凭证。用户已在本地保存真实密钥，文档和报告不包含密钥。

这一步只需 API 按量调用能力，不需要订阅套餐、包年资源或租云服务器。以控制台展示的开通条件与资费为准。本轮为 42 个短文本请求，每个输出上限 512 token，遇到接口错误立即停止；没有自动无限重试。

配置好后由我执行：

```sh
npm run voice:eval:ark -- --source runtime/evals/1792853530188-voice-v1-20261024.json
```

请求只发往 `https://ark.cn-beijing.volces.com/api/v3/chat/completions`，禁止重定向。输出在 `runtime/evals/`，保存问题、回答、模型版本、用量和耗时，不记录凭证。真实 API 已连通；这不代表独立 ASR/TTS 服务也已开通或完整备用语音链路已完成。

如果控制台给的是推理接入点，也可在 `ARK_MODEL` 填其准确的 `ep-...` ID；应确保接入同一候选版本，并记录版本。凭证不存在或无权限时停止，不能把语音 Key 自动尝试成方舟 Key。
