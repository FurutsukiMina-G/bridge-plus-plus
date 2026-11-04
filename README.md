# Bridge++

Windows 桌面 Agent 开发工作台。把 Qoder CN、WorkBuddy 等模型源接到 DeepSeek Harness（DSH）、Kimi Code、Codex CLI 等开发环境里，在一个窗口里管理项目、会话和模型。

> 这是个人维护的非官方项目，与 Qoder、腾讯、DeepSeek、月之暗面、OpenAI、Google 没有关联。

## 功能

- **一个窗口用多个环境**：DSH、Kimi Code、Codex CLI、Antigravity，会话按文件夹分组，工具、技能、MCP 和子代理都留在各环境自己的原生流程里。
- **模型和环境自由搭配**：Qoder CN、WorkBuddy 的模型可以在 DSH、Kimi Code、Codex CLI 里用，上下文窗口和思考强度按来源声明的能力选择。
- **对外接口**：把模型源变成本机 OpenAI 兼容接口，一键接入 DSH、Kimi Code、Codex CLI，也可以给其他 Agent 用，支持开机在后台运行。
- **环境管理**：首次启动有引导，之后可以在设置里检查更新和更新环境。没配置好的环境不会出现在可选项里，只要有一个能用就能开始。
- **权限模式**：按环境选择授权方式，比如 DSH 的仅可查看、工作区内修改、自动审查、完全权限。
- **看得见的报错**：上游的实际报错、限速重置时间和中断原因都显示在对话里。
- **联网搜索**：DSH 环境可以直接用 Qoder CN、WorkBuddy 自带的搜索，不需要另外的 API key。
- **读起来方便**：LaTeX 公式直接渲染；连续的工具调用折叠成一行；回答里的文件链接点击就能预览，右键可以在资源管理器中显示；网页链接点击用浏览器打开，右键可以复制。
- **图片和媒体**：上游支持时可以在输入框发送图片，模型输出的图片也会显示。

## 安装

1. 到 [Releases](../../releases/latest) 下载 `Bridge++-Setup-<版本>.exe`，双击运行。不需要管理员权限，装好后自动打开。
2. 安装包没有代码签名，Windows 可能提示“已保护你的电脑”：点“更多信息”，再点“仍要运行”。

系统要求：Windows 10 或 11，64 位。

## 首次使用

首次启动会打开引导，分三步：

1. **开发环境**：至少准备一个。Kimi Code 已内置，其他环境可以在引导里下载或指定路径。Codex CLI 和 Antigravity 需要能访问 OpenAI、Google 的网络和账号，没有也不影响使用其他环境。
2. **模型源**：安装包不附带任何模型源。在引导里点“下载组件”，组件会从 npm 下载到你的电脑；账号用官方客户端登录，再点“重新检测”。

   | 模型源 | 需要 |
   |---|---|
   | Qoder CN | [Qoder CN](https://qoder.cn/) 账号，用官方客户端或 CLI 登录 |
   | WorkBuddy | [WorkBuddy](https://www.workbuddy.cn/) 账号，用官方桌面端登录 |
   | Antigravity · Gemini | 已登录的 Antigravity，由它原生运行 |

3. **工作文件夹**：选一个项目文件夹。

## 给其他 Agent 用

在“设置 › 对外接口”启动接口，在“接入到”选择目标 Agent，再点底部按钮完成配置。接口只监听 `127.0.0.1`，需要随机生成的密钥。接入 DSH 时 DSH 开着或关着都可以，运行中的 DSH 几秒内自动加载。

## 从源码运行

需要 Node.js 22 或更高版本。

```bash
npm ci
npm run build
npm start
```

运行测试：

```bash
npm test
```

打包安装程序：

```bash
npm run package:installer
```

## 数据和隐私

- 项目、会话和设置保存在本机 `%APPDATA%\AgentWorkbench`。
- Bridge++ 本身不收集数据。对话内容只发给你选择的模型服务。
- 模型源的登录信息由各自的官方客户端管理，Bridge++ 只在本机读取，用来发起你的请求。

## 说明

- 请用你自己的账号，并遵守各模型服务和开发环境的服务条款。账号和额度由你自己负责。
- 本项目暂未采用开源许可证，保留所有权利。第三方组件的许可证见各组件目录，`bridges/workbuddy-bridge/vendor` 中的第三方组件见同目录的 LICENSE 和 THIRD_PARTY_NOTICES。
