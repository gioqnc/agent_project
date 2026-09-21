# 会话交接：手搓轻量学习助手 Agent（学习向）

把本文交给另一台电脑上的 AI 即可继续。`.env` 已被 gitignore，拷代码后必须单独带配置，**不要把 API Key 写进本文或任何会提交的文件**。

---

## 用户目标

自己实现一个 **agent harness**，用来涨经验，不是做竞品。练的是循环本身：模型决定何时调工具，工具结果喂回模型，直到任务结束。

```text
用户输入 → 组 prompt → 调模型 → 执行工具 → 结果喂回模型 → 直到结束
```

场景（2026-09-21 改）：第一版做成 **本地资料学习助手**，不做成改代码、跑测试的 coding agent。

约束：

- 只做能涨经验的东西，不追求产品完成度。
- **不绑定**任何现有 MCP 仓库（包括以前打开过的 `im-mcp-client`）。MCP 是最后扩展点。
- 回复语言：简体中文。
- **核心循环必须用户自己写。** AI 可以给规格、审查、设计测试，不代写 `loop` / 工具执行主逻辑。用户要求：每一行都要能解释。

## 产品定义（已定稿）

第一版：

> 用户指定一个本地资料目录并提问。Agent 自主搜索、阅读笔记，给出带文件出处的回答；若需要保存总结或闪卡，先展示将写入的内容，用户确认后再落盘，最后展示写入结果及检查情况。

限制：**一个工作目录（资料库）、harness 用 TypeScript、资料第一版只用 Markdown、一个模型接口、一次一个任务。**

不是聊天机器人，不是 OpenCode fork，不是 TUI，不是代码修改 Agent。

资料必须是 **虚构知识库**（例如一套不存在的「青禾协议」笔记），避免模型不读文件就靠预训练答对。playground 到第 1 阶段再建立。

## 明确不要做

- 不要 fork OpenCode / Codex / Pi 当底座。
- 不要先写 TUI / Web。
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
- Pi 对照顺序（**等只读循环跑通再打开**）：`types.ts` → `agent-loop.ts` → `agent.ts` → 最后才看会话/编辑/压缩。
- Pi 文档要点：内部 `AgentMessage` 和发给模型的消息是两套，中间是 `transformContext`（裁剪）和 `convertToLlm`（转换）。不要 `import` Pi 的 `Agent` 类。

参考：

- [Pi agent README](https://github.com/earendil-works/pi/blob/main/packages/agent/README.md)
- [Pi 核心循环 agent-loop.ts](https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts)
- [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)（只读循环跑通后再读）

## 工具集（已定，但还没实现）

最终四个工具：

| 工具 | 阶段 | 行为要点 |
|------|------|----------|
| `search_files` | 第 1 阶段 | 在资料目录里按文件名和关键词搜索 |
| `read_file` | 第 1 阶段 | 按范围读取 Markdown |
| `write_note` | 第 2 阶段 | 在指定输出目录写入或追加总结 / 闪卡；先展示将写入的全文，用户确认后再写 |
| `run_check` | 第 2 阶段 | 只跑项目预配置的检查命令（例如检查总结是否含必填标题和关键事实）；超时、取消、输出上限 |

不要用开放的 `run_command`。`run_check` 会执行仓库脚本：**限定命令 ≠ 沙箱**，简历里要能区分。

路径必须限制在指定工作目录内（防 `..` 和链接跳转）。写入只允许落在 `output/`（或等价的输出目录）。工具参数由程序校验。失败作为明确错误返回给模型。

## 阶段（进度以验收为准，不要加阶段）

| 阶段 | 范围 | 完成标准 | 状态 |
|------|------|----------|------|
| 第 0 步 | 脚手架 | `npm start` 打印 `harness ok` | **已完成** |
| 第 1 步 | 只聊天，不挂工具 | 多轮对话，`messages` 累积 | **当前卡在这里** |
| 第 1 阶段 | CLI + 手写循环 + `search_files` + `read_file` | 三个只读任务能自主搜、读、答，不用逐步指挥 | 未开始 |
| 第 2 阶段 | `write_note` + `run_check` | 一次「写总结或闪卡」+ 真实检查结果 | 未开始 |
| 第 3 阶段 | JSONL 会话、超时取消、输出截断、中断恢复 | 失败/取消/重启后行为可解释 | 未开始 |
| 第 4 阶段 | 评测集 | 先 5 个任务（留白不调提示词），再考虑更多 | 未开始 |
| 最后 | MCP | 先接用户自己的测试 MCP，再考虑只读业务工具 | 未开始 |

### 第 1 阶段的三个任务（必须只读）

不能是写总结、写闪卡。playground 到第 1 阶段再建立，和 harness 分开，Agent cwd 指向 playground。资料用虚构设定，答案必须从文件里来。

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
src/index.ts          # 仍只有：console.log("harness ok");
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
OPENAI_MODEL=ep-20260810101252-wt4kz
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

## 下一轮立刻做：第 1 步（只聊天）

场景已经改成学习助手，**第 1 步仍然只聊天**。用户自己改 `src/index.ts`，AI **不要直接写成可运行成品**。

规格：

1. `import "dotenv/config"`
2. 用 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` 建 `OpenAI` 客户端；缺一就 `throw`
3. `messages` 数组，先放一条 `system`
4. `readline` 循环：空行或 `exit` 退出；否则 push user → `chat.completions.create({ model, messages })`（无 stream、无 tools）→ 打印 content → **把助手 message 也 push 进 messages** → 建议打印 `res.usage`
5. 发给模型的永远是整份 `messages`，不是最新那一句

骨架（`???` 必须用户自己填）：

```ts
import "dotenv/config";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const model = process.env.OPENAI_MODEL;
// ??? 缺一就 throw

const client = new OpenAI({ apiKey, baseURL });

const messages: ChatCompletionMessageParam[] = [
  { role: "system", content: "You are a helpful assistant. Reply in 简体中文." },
];

const rl = readline.createInterface({ input: stdin, output: stdout });

while (true) {
  const input = (await rl.question("> ")).trim();
  if (!input || input === "exit") break;

  // ??? push user
  const res = await client.chat.completions.create({ model, messages });
  const msg = res.choices[0]?.message;
  // ??? 打印 content；push 助手 message；打印 res.usage
}

rl.close();
```

验收：

```text
> 1+1等于几
> 把你上一句换成一句话    # 必须接得上上下文
> exit
```

过了才允许进入第 1 阶段（只读两个工具 + 三个只读任务 + 建立虚构资料 playground）。

## 简历表述（当验收目标，现在不要写进 README）

完成后方向：

> **轻量学习助手 Agent｜个人项目**  
> 基于 TypeScript 和模型 SDK 实现 Agent 执行循环，支持本地资料搜索、按范围阅读、带出处回答，以及确认后写入总结或闪卡，并用检查命令验证落盘结果。

可展开为：

- 自主实现工具调用循环、参数校验、执行事件流及任务取消，支持多轮工具执行和错误反馈。
- 实现工作目录访问限制、写入确认及会话持久化，处理长工具输出与中断恢复。
- 构建包含 **N** 个任务的自动化评测集，通过出处核对与输出文件检查验证任务结果，对比优化前后的成功率、耗时及 Token 用量。

N 写真实数字。

---

**当前进度：** 产品场景已从 coding agent 改为本地资料学习助手；脚手架已能跑；方舟 `.env` 已在本机；`src/index.ts` 还是 `harness ok`；下一步是用户手写多轮聊天，不加工具。
