import "dotenv/config";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { executeTool } from "./tools.js";


const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const model = process.env.OPENAI_MODEL;
if (!apiKey || !baseURL || !model) {
  throw new Error("配置错误");
}

const client = new OpenAI({ apiKey, baseURL });
const workdir = process.argv[2];
if (!workdir) {
  throw new Error("缺少资料目录");
}

//定义工具数组
const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_files",
      description: "在资料目录中按文件名和正文关键词搜索",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },

  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "在资料目录中按文件名读取",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          offset: { type: "number" },
          limit: { type: "number" },
        },
        required: ["path"],
      },
    },
  },

   {
    type: "function" as const,
    function: {
      name: "write_note",
      description: "把内容写入一个 Markdown 文件。path 必须以 output/ 开头，比如 output/cheatsheet.md。写入前会请用户确认。",      // 告诉模型这个工具干什么、只能写到哪个目录
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },    // 文件路径，参数名要和后面取值时一致
          writeContent: { type: "string" },    // 要写入的内容
        },
        required: ["path","content"],              // 两个都必填
      },
    },
  },
];

const messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: "只根据资料目录回答，写明文件路径，文件里没有就说找不到",
  },
];

const r1 = readline.createInterface({ input: stdin, output: stdout });
const MAX_STEPS = 10;
while (true) {
  const input = (await r1.question(">")).trim();
  if (!input || input === "exit") break;

  messages.push({ role: "user", content: input });
  let steps = 0;
  let res: OpenAI.Chat.Completions.ChatCompletion;
  while (true) {
    //加步数限制
    if (steps >= MAX_STEPS) {
        console.log("调用超过最大次数限制，请重试")
        break;
    }
    steps ++;
    
    try {
      res = await client.chat.completions.create({
        model,
        messages,
        tools,
      });
    } catch (error) {
      console.log("调用模型失败请重试");
      break;
    }

    const msg = res.choices[0]?.message;
    if (!msg) {
      break;
    }

      messages.push(msg);
    

    const calls = msg.tool_calls;
    if (!calls || calls.length === 0) {
      console.log(msg.content);
      break;
    }
    for (const call of calls) {
      if (call.type !== "function") {
        continue;
      }
      const result = await executeTool(
        workdir,
        call.function.name,
        call.function.arguments,
        (q) => r1.question(q),
      );

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }
}

r1.close();
