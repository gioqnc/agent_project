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
    calls.forEach((call) => {
      if (call.type !== "function") {
        return;
      }
      const result = executeTool(
        workdir,
        call.function.name,
        call.function.arguments,
      );

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    });
  }
}

r1.close();
