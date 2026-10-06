# 会话交接：手搓 Agent（个人练手项目 → 可部署的「个人分身」）

把本文交给另一台电脑上的 AI 即可继续。`.env` 已被 gitignore，拷代码后必须单独带配置，**不要把 API Key 写进本文或任何会提交的文件**。

最近一次更新：2026-10-05（调整了最终形态、阶段和时间表，见「阶段」一节）。

---

## 背景（2026-10-05 补充）

- 用户是 26 届计算机专业毕业生，目前是 AI 产品助理，计划求职 **AI 应用开发**，面试主语言定为 Python。本项目继续用 TypeScript，**不迁移**。
- 本项目定位是**个人练手项目**。最终形态是「个人分身」：知识库换成用户本人的资料（简历、项目介绍、FAQ），部署到服务器上，面试时可以现场演示。
- 每周只给本项目 **约 3 小时**，其余时间用来补基础和刷题。完整计划见 `D:\study_agent\work_study\学习计划.md`。
- 2026-10-05 摸底时，用户说不出 `messages` 里有 `assistant` 这个 role（也就是自己代码里 `messages.push(msg)` 那一行）。说明「每一行都要能解释」这条规则之前没有真正执行，**从现在开始严格执行**（见「学法」）。

## 用户目标

自己实现一个 **agent harness**，用来涨经验，不是做竞品。练的是循环本身：模型决定何时调工具，工具结果喂回模型，直到任务结束。

```text
用户输入 → 组 prompt → 调模型 → 执行工具 → 结果喂回模型 → 直到结束
```

场景（2026-09-21 改）：第一版做成 **本地资料学习助手**，不做成改代码、跑测试的 coding agent。

约束：

- 只做能涨经验的东西，不追求产品完成度。
- **不绑定**任何现有 MCP 仓库（包括公司的 MCP 仓库）。MCP 是最后扩展点。
- 回复语言：简体中文。
- **核心循环必须用户自己写。** AI 可以给规格、审查、设计测试，不代写 `loop` / 工具执行主逻辑。用户要求：每一行都要能解释。

## 产品定义（已定稿）

第一版：

> 用户指定一个本地资料目录并提问。Agent 自主搜索、阅读笔记，给出带文件出处的回答；若需要保存总结或闪卡，先展示将写入的内容，用户确认后再落盘，最后展示写入结果及检查情况。

限制：**一个工作目录（资料库）、harness 用 TypeScript、资料第一版只用 Markdown、一个模型接口、一次一个任务。**

不是聊天机器人，不是 OpenCode fork，不是 TUI，不是代码修改 Agent。

资料必须是 **虚构知识库**（例如一套不存在的「青禾协议」笔记），避免模型不读文件就靠预训练答对。playground 已建在 `playground/`，Agent 工作目录必须指向它。

最终形态（2026-10-05 定）：

> 「个人分身」Agent：知识库换成用户本人的资料（`resume.md`、`projects/*.md`、`skills.md`、`faq.md`），通过 Web 页面对外提供问答。页面展示工具调用过程和回答出处，资料里没有的内容要明确说"资料里没有"，不能编。

上线约束：

- **线上只开放只读工具**（`search_files`、`read_file`）。`write_note` 只在本地 CLI 使用。
- 必须有：按 IP 限流、每日 token 上限、单次最大步数、输入长度限制、防提示词注入；在方舟后台设置消费上限。
- **隐私和保密**：知识库里不放手机号、身份证号等个人信息；工作项目必须脱敏，不写客户名称、内网地址、账号。**一律凭记忆重写，不从公司代码或文档里复制。**
- 「虚构的青禾协议」继续作为开发和评测用的测试资料。

## 明确不要做

- 不要 fork OpenCode / Codex / Pi 当底座。
- 不要先写 TUI / Web。Web 页面等到第 4 阶段（个人分身）再做，而且只做一个简单的聊天页。
- 不要一上来做多模型路由、插件市场、云沙箱。
- 不要把 MCP 焊进第一版。
- 不要让 Agent 的 cwd 指向 harness 自己（没有沙箱）。
- 不要先读 Pi/Codex 源码再写循环（会变成抄，面试讲不透）。
- 不要做成改代码 / 跑项目测试的 coding agent。
- 不要接开放网页搜索；第一版只吃本地资料。
- 不要一上来做向量数据库 / Embedding RAG。先用文件名和关键词搜索，吃检索的亏再考虑。

## 学法（已对齐，不要改）

用户开车，AI 坐副驾。

- 用户写 → 构造失败 →（循环能跑之后）对照 Pi → 修改 → 留下验证。
- AI 只 review：指出循环漏洞、问一个为什么、不替用户改核心逻辑。卡死超过约 15 分钟给最小提示，仍不代写整段 loop。
- **讲解关**（2026-10-05 新增）：用户每写完一段代码，都要用自己的话把它逐行讲给 AI 听，AI 挑错之后才能提交。讲不清楚的代码不提交。
- **可以让 AI 写的部分**：测试样板、评测脚本框架、Docker 配置、README、前端页面、生成虚构资料。前提是用户能看懂它写的是什么。**必须用户自己写的部分**：循环、工具执行、路径安全、上下文管理、限流和预算逻辑。
- Pi 对照顺序（**等只读循环跑通再打开**）：`types.ts` → `agent-loop.ts` → `agent.ts` → 最后才看会话/编辑/压缩。
- Pi 文档要点：内部 `AgentMessage` 和发给模型的消息是两套，中间是 `transformContext`（裁剪）和 `convertToLlm`（转换）。不要 `import` Pi 的 `Agent` 类。

参考：

- [Pi agent README](https://github.com/earendil-works/pi/blob/main/packages/agent/README.md)
- [Pi 核心循环 agent-loop.ts](https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts)
- [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)（只读循环跑通后再读）

## 工具集

| 工具 | 阶段 | 行为要点 | 状态 |
|------|------|----------|------|
| `search_files` | 第 1 阶段 | 在资料目录里按文件名和关键词搜索 | 已完成 |
| `read_file` | 第 1 阶段 | 按范围读取 Markdown | 已完成 |
| `write_note` | 第 2 阶段 | 在 `output/` 写入总结；先展示将写入的全文，用户确认后再写；**只在本地 CLI 使用，线上不开放** | 函数已写，**还没接入循环** |
| ~~`run_check`~~ | — | **2026-10-05 砍掉**，为了省时间。验收改成人工检查写出来的文件 | 不做 |

不要用开放的 `run_command`。如果以后要恢复 `run_check`，记住：它会执行仓库里的脚本，**限定命令 ≠ 沙箱**，简历里要能讲清楚两者的区别。

路径必须限制在指定工作目录内（防 `..` 和链接跳转）。写入只允许落在 `output/`（或等价的输出目录）。工具参数由程序校验。失败作为明确错误返回给模型。

## 阶段（进度以验收为准；2026-10-05 重排，每周约 3 小时）

| 阶段 | 范围 | 完成标准 | 目标时间 | 状态 |
|------|------|----------|----------|------|
| 第 0 步 | 脚手架 | `npm start` 打印 `harness ok` | — | **已完成** |
| 第 1 步 | 只聊天，不挂工具 | 多轮对话，`messages` 累积 | — | **已完成** |
| 第 1 阶段 | CLI + 手写循环 + `search_files` + `read_file` | 三个只读任务能自主搜、读、答，不用逐步指挥 | — | **用户已验收**（但用户还需要通过讲解关） |
| 第 2 阶段 | `write_note` 接入 + 最大步数 + API 错误处理 + 清理已知问题 | 写入前必须确认；死循环和网络错误不会让进程崩溃 | 10/26 | **当前** |
| 第 3 阶段 | 健壮性：流式输出、工具输出截断、上下文管理（滑动窗口或摘要压缩）、JSONL 会话持久化 | 长对话、失败、重启后的行为都能讲清楚 | 11/30 | 未开始 |
| 第 4 阶段 | 个人分身：用户资料知识库 + Node HTTP 服务 + SSE + 简单聊天页（展示工具调用和出处）+ 限流、预算、防注入 | 本地能完整演示 | 12/31 | 未开始 |
| 第 5 阶段 | 评测 + 部署：30 道题（含资料外问题和注入攻击），统计编造率和出处准确率；Docker + 云服务器 + HTTPS | 有真实的评测数据，公网可以访问 | 2027/1 月中 | 未开始 |
| 可选 | MCP：把检索能力做成 MCP 服务（可以和 1 月的 Python RAG 项目结合） | — | 有时间再做 | 未开始 |

ICP 备案审核需要 1 到 3 周，**10 月底前提交申请**（学习计划第 4 周）。

### 第 1 阶段的三个任务（必须只读）

不能是写总结、写闪卡。playground 已建立，和 harness 源码分开，Agent 工作目录必须指向 `playground/`（用 CLI 参数传入，禁止默认成 harness 自己）。资料用虚构设定，答案必须从文件里来。

| 任务 | 用户怎么说 | 怎样算过 |
|------|------------|----------|
| A | 「青禾协议」的超时默认值是多少？在哪篇笔记？ | 数字 + 文件路径，能被脚本核对 |
| B | 一次完整的「会话建立」经过哪些步骤、分别写在哪？ | 步骤链 + 文件依据 |
| C | 资料目录怎么组织的？索引文件叫什么、列了哪几篇？ | 索引路径 + 列出的文档名 |

「根据笔记写一份《青禾协议速查》到 `output/cheatsheet.md` 并跑检查」是第 2 阶段第 4 个任务。现在不要写评测题库。

### 评测原则（第 4 阶段才做框架）

留下部分任务作最终评测，别全部用来调提示词。先比自己的基础版 vs 改进版，固定模型和任务。有预算就重复跑，报告真实次数，不把单次结果包装成稳定能力。

| 指标 | 何时记 | 作用 |
|------|--------|------|
| 耗时、Token 用量（`res.usage`） | 第 1 步起，循环里打日志即可 | 衡量执行成本 |
| 工具调用次数 | 有工具之后 | 识别重复搜索和无效循环 |
| 越权操作是否被拦截 | 有写入工具之后 | 验证权限控制（例如不准写资料原文、不准跳出 `output/`） |
| 出处是否命中 | 有只读工具之后 | 回答必须能对上文件，不能只看口吻 |
| 任务成功数 / 总任务数 | 评测阶段 | 看实际完成能力 |
| 失败分类 | 评测阶段 | 指导下一轮改进（检索失败 / 读错范围 / 编造出处 / 写入未确认 等） |

不要第一周做评测跑分器。

## 当前仓库

本机路径：`D:\study_agent`  
（最初设想是 `D:\学习agent`，实际落在 `study_agent`。）

```text
package.json          # name: agent-harness, "type": "module", "start": "tsx src/index.ts"
tsconfig.json         # strict, Node16, rootDir src
.gitignore            # node_modules/, dist/, .env
.env.example          # 仍是 OpenAI 默认值，和真实配置不一致
.env                  # 用户本机已配方舟；被 gitignore，换电脑必须单独复制
src/index.ts          # 第 1 步多轮聊天已跑通；第 1 阶段要在此改循环、挂工具
playground/           # 虚构「青禾协议」笔记；Agent 工作目录指向这里
HANDOFF.md            # 本文
```

依赖：`openai` ^6.49.0、`dotenv` ^17.4.2；dev：`typescript`、`tsx`、`@types/node`。  
当时 Node：v20.19.6。当前这台是 v22.20.0。`node_modules` 换电脑后需要重新 `npm install`。

换电脑后：

```powershell
cd <项目目录>
npm install
# 把 .env 拷过来（不要提交、不要贴到聊天）
npm start    # 此时应仍打印 harness ok
```

## 模型接入（火山方舟，OpenAI 兼容）

用 Node `openai` SDK，变量名仍叫 `OPENAI_*`。`.env` 示例：

```env
OPENAI_API_KEY=<方舟 Key，不要写进本文、不要提交>
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
OPENAI_MODEL=<方舟接入点 ID，形如 ep-xxxx>
```

对应官方 Python 示例：`ARK_API_KEY` + `base_url=.../api/v3` + `model=ep-...`。

- `baseURL` 必须是 `/api/v3`，不要改成 `/v1`。
- 第 1 步用非流式。
- 工具调用需要该接入点支持 Function Calling；聊天通了但模型不调工具时再换接入点，循环不用改。
- Key 只放 `.env`，不放 `config.json` / `src/`。第 1 步不必再做 JSON 配置层。

代码侧对应关系：

```ts
import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});
```

## 第 1 阶段（已完成，以下保留作参考）：只读工具 + 手写循环

第 1 步已验收：多轮对话能接上上下文。用户自己改循环和两个只读工具，AI **不要直接写成可运行成品**，不代写 loop / 工具执行主逻辑。

建议拆成三个文件（也可以先全写在 `src/index.ts`，能讲清每一行再拆）：

- `src/index.ts` — 读环境变量、读工作目录、system prompt、循环
- `src/tools.ts` — `search_files` / `read_file` / 路径校验 / `executeTool`
- 工作目录 — `process.argv[2]`，缺了就 throw。启动：`npx tsx src/index.ts ./playground`

### 循环规格（和聊天循环的差别）

发给模型时带上 `tools`（无 stream）。每一轮：

1. 若上一轮 **没有** 工具调用：从 readline 读用户输入；空行或 `exit` 退出；push user。
2. `chat.completions.create({ model, messages, tools })`。
3. 取出 `msg`，**先把整条助手 message push 进 `messages`**（里面可能有 `tool_calls`）。
4. 若 `msg.tool_calls` 非空：对每个 call 执行工具，再 push
   `{ role: "tool", tool_call_id: call.id, content: 工具返回字符串 }`，
   **不要等用户输入，立刻回到第 2 步再调模型**。
5. 若没有 `tool_calls`：打印 `content` 和 `usage`，回到第 1 步等用户。

工具失败也要变成字符串返回给模型（例如 `JSON.stringify({ error: "..." })`），不要把整个进程 throw 死。参数用 `JSON.parse(call.function.arguments)`，parse 失败同样当错误字符串。

骨架（`???` 必须用户自己填）：

```ts
while (true) {
  // ??? 什么时候读用户输入，什么时候跳过
  const res = await client.chat.completions.create({ model, messages, tools });
  const msg = res.choices[0]?.message;
  if (!msg) break;
  messages.push(msg); // 整条助手消息

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    // ??? 逐个执行，push role:"tool"，continue 再调模型
    continue;
  }

  console.log(msg.content);
  console.log(res.usage);
}
```

### 两个工具的规格

`search_files`

- 参数：`query`（string，必填）
- 行为：在工作目录内递归搜 **文件名** 和 **文件正文**，返回匹配的相对路径 + 少量上下文行
- 上限：例如最多 20 条匹配，单条上下文截断，避免把整个库灌进模型

`read_file`

- 参数：`path`（string，必填）、`offset`（number，可选，从 1 开始的行号）、`limit`（number，可选，读多少行）
- 行为：读该文件指定行范围；不传 offset/limit 就读全文，但仍要截断（例如最多 400 行）

路径规则（两个工具都要走同一套校验）：

- 相对工作目录解析，结果必须仍在工作目录内
- `..`、绝对路径乱跳、symlink 逃出工作目录 → 返回错误给模型
- 用 `path.resolve` + `path.relative`，`relative` 以 `..` 开头或等于绝对路径则拒绝

### 工具 schema 形态（OpenAI function calling）

```ts
{
  type: "function",
  function: {
    name: "search_files",
    description: "在资料目录中按文件名和正文关键词搜索",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
}
```

`read_file` 同理，properties 含 `path` / `offset` / `limit`。

system prompt 要写明：只根据资料目录回答，引用文件路径，事实不在文件里就说找不到。不要让模型靠预训练编「青禾协议」。

### 验收（必须只读，不要指挥它逐步点文件）

启动：

```powershell
npx tsx src/index.ts ./playground
```

分别问（可以新开进程，一次一题）：

```text
> 「青禾协议」的超时默认值是多少？在哪篇笔记？
> 一次完整的「会话建立」经过哪些步骤、分别写在哪？
> 资料目录怎么组织的？索引文件叫什么、列了哪几篇？
```

过线标准：

- 超时默认值 **2700 毫秒**，出处 `notes/timeout.md`
- 四步：探活 / 握手 / 票证交换 / 会话锁定，能对上四篇笔记路径
- 索引是 `INDEX.md`，列出那 6 篇 `notes/*.md`

模型必须自己 `search_files` / `read_file`。你逐步告诉它读哪个文件，不算过。

这一阶段不要实现 `write_note` / `run_check`，不要打开 Pi 源码。

## 下一轮立刻做：第 2 阶段（确认后写入 + 健壮性底线）

第 1 阶段用户已用三题验收。循环不用重写，仍由用户自己写，AI 不代写工具执行主逻辑。

`read_file` 的 `required` 已经改成 `["path"]`（之前写着 `filePath` 的问题已修复）。

### 先过讲解关

动手之前，用户先给 AI 逐行讲一遍 `src/index.ts` 的循环和 `src/tools.ts` 的 `resolveInside`、`executeTool`，至少要讲到：

- 4 种 role 分别是什么，为什么要先 push assistant 消息，再 push tool 消息
- `tool_call_id` 有什么用
- 内层 `while` 循环什么时候退出

**进度（2026-10-05）**：以问答形式完成了 7 题，问答记录在 `D:\study_agent\work_study\面试问题.md` 的「讲解关」一节。循环主流程已经讲通。**还剩**：第 8 题 `resolveInside`（路径安全），以及 `write_note` 接入时 `forEach` 和 async 的问题。

讲解关里定下的设计（第 2 阶段照此实现）：
- 最大步数：计数变量放在 push user 消息之后、内层 `while` 之前；上限 10 到 20；在**调用模型之前**检查，避免留下没有结果的 tool_calls；超限时给用户明确提示，进阶做法是不带工具再调一次模型做总结。
- `executeTool` 区分"参数错误"和"工具执行出错"，返回不同的提示（现在整个函数被一个 try 包住，`searchFiles` 内部出错也会返回"参数错误请重试"，会误导模型）。

### 代码审查发现的问题（2026-10-05）

| 问题 | 位置 | 处理 |
|---|---|---|
| 内层循环没有最大步数，模型一直调工具就会死循环、一直消耗 token | `src/index.ts` 内层 `while(true)` | 加步数上限，超过就停止并告诉用户 |
| API 调用没有 try/catch，网络抖动或限流时整个进程会崩溃 | `client.chat.completions.create` | 捕获错误，可以重试 1 到 2 次；失败时保留当前对话 |
| `resolveInside` 防不住软链接逃出工作目录 | `src/tools.ts` | 用 `fs.realpathSync` 解析真实路径后再比较 |
| `searchFiles` 把所有文件都当 UTF-8 全文读进来，没有大小限制，也不跳过二进制文件 | `src/tools.ts` | 跳过大文件和非文本文件 |
| 没用到的 import：`node:dns` 的 `promises`，`node:console` 的 `error, log` | `src/tools.ts:1`、`src/index.ts:6` | 删除 |
| 没打印 `res.usage` | 循环里 | 加上，以后评测要用 |
| `if (msg)` 多余（前面已经 `if (!msg) break`） | `src/index.ts` | 删除 |

### `write_note`

- 参数：`path`（string，必填）、`content`（string，必填，将写入的全文）
- 路径先走 `resolveInside`，再要求结果落在工作目录的 `output/` 下面。写到 `notes/` 或 `output` 外面，返回错误，不落盘
- 写之前把 `path` 和全文展示出来，用现有的 readline 问 `y/n`
- 只有用户输入 `y` 才 `writeFileSync`。其他输入返回「用户取消」，文件保持原样
- 确认发生在程序里。模型在对话里说「已确认」不算数

`write_note` 函数已经写在 `src/tools.ts` 里（有 `ask` 回调参数），但**还没有**加进 `tools` 数组，也没有接到 `executeTool` 里。

`executeTool` 现在是同步函数。确认要 `await r1.question`，所以 `executeTool` 要改成 `async`，调用处用 `await`。`forEach` 不会等待 async 回调，这里改回 `for...of`。

### 验收

```powershell
npx tsx src/index.ts ./playground
```

```text
> 根据笔记写一份《青禾协议速查》到 output/cheatsheet.md
```

过线标准：
- 终端先显示将写入的全文，然后停下来等 `y`；输入 `y` 后文件出现，内容包含 `2700`、探活、握手、票证交换、会话锁定。
- 输入 `n`：文件不出现，模型收到「用户取消」。
- 让它写到 `notes/` 下：被拒绝。
- 模型没问你就直接写入文件：不算过。
- 另外再测一次：手动把步数上限调成 2，确认会正常停止，而不是死循环。

## 第 3 到第 5 阶段要点（到时再细化）

- **第 3 阶段**：流式输出（`stream: true`，边生成边打印）；工具输出超长就截断，并告诉模型"已截断"；上下文先做滑动窗口，再试摘要压缩，参考 Pi 的 `transformContext`；会话按 JSONL 追加写入，重启后可以恢复。
- **第 4 阶段**：
  - 用 Node 原生 `http` 或一个轻量框架做 `/chat` 接口，用 SSE 推送「工具调用、工具结果、回答文本」三类事件。
  - 前端一个页面，把工具调用和出处展示出来。
  - 知识库目录结构：`resume.md`、`projects/*.md`、`skills.md`、`faq.md`。
  - 线上只开放只读工具。
- **第 5 阶段**：
  - 评测集 30 道题，覆盖：正常提问、资料里没有的问题、诱导编造、提示词注入。
  - 统计成功率、编造率、出处命中率、token 用量和耗时。
  - Docker 部署，Nginx 加 HTTPS。
  - 链接放进简历，另外录一段演示视频备用。

## 简历表述（完成后才写进简历，数字必须真实）

现在简历上的写法（截至第 1 阶段，只写已经做完的）：

> **手写 Agent 执行循环｜个人项目（持续迭代）｜TypeScript**
> 不用 LangChain 等框架，自己写工具调用循环：模型返回 tool_calls 就执行工具、结果写回上下文，直到给出最终回答；工具出错时把错误返回给模型。实现文件搜索和按行读取工具，拦截 ../ 越界；用虚构的协议笔记当测试资料，防止模型靠自带知识作答，回答须写明出处。

第 5 阶段完成后的目标写法：

> **个人分身 Agent｜个人项目｜在线体验：xxx**
> 用 TypeScript 从零实现 Agent 执行循环（未使用 Agent 框架），面试官可以在线提问了解我的经历，回答附带资料出处。
> - 实现工具调用循环、SSE 流式输出、上下文管理和会话持久化，前端展示工具调用过程
> - 设计防编造和防提示词注入机制，用限流、token 预算和最大步数控制线上成本和风险
> - 构建 **N** 道评测集（含资料外问题和注入攻击），编造率从 **X%** 降到 **Y%**

N、X、Y 必须写真实数字。

---

**当前进度（2026-10-05）：** 第 1 阶段已验收；第 2 阶段进行中，`write_note` 已写但还没接入循环。下一步：先过讲解关 → 接入 `write_note`（改 async + `for...of`）→ 加最大步数和 API 错误处理 → 清理上表里的问题 → 验收。目标 10/26 完成。
