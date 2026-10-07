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
//系统提示词改成常量
const SYSTEM_PROMPT = "只根据资料目录回答，写明文件路径，文件里没有就说找不到";
let summary = "";  //更早对话的摘要，一开始是空的
const messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];


const r1 = readline.createInterface({ input: stdin, output: stdout });
const MAX_STEPS = 10;
const MAX_TOOL_CHARS = 4000;
const MAX_TURNS = 10; // 最多保留最近几轮对话，包括当前这轮

//生成摘要函数
const summarize = async(oldSummary: string,dialog: string):
Promise<string | null> => {
  try{
    const res = await client.chat.completions.create({
      model,
      messages:[
        {
          role: "system",
          content: "你负责压缩对话记录。把已有摘要和新的对话合并成一份摘要，保留用户问过的问题、得到的结论和引用的文件路径，300 字以内，只输出摘要本身。",
        },
        {
          role: "user",
          content: `已有摘要： \n${oldSummary || "(无)"}\n\n新的对话: \n${dialog}`,
        },
      ],
    });
    return res.choices[0]?.message.content ?? null;
  }catch{
    return null;
  }
};
//滑动窗口函数
async function trimHistory(msgs: ChatCompletionMessageParam[], maxTurns: number){
  // 第一步：找出所有 user 消息的下标
  const userIdx: number[] = [];
  for(let i =0;i < msgs.length;i++){
    if (msgs[i].role === "user") {
      userIdx.push(i);
    }
  }

   // 第二步：轮数没超就什么都不做
   if (userIdx.length <= maxTurns) {
    return;
   }

   // 第三步：找到"要保留的第一条 user 消息"的下标
  const keepFrom = userIdx[userIdx.length - maxTurns];
  // 第四步：先复制要删除的消息。删掉 system（下标 0）之后、keepFrom 之前的所有消息
  const removed = msgs.slice(1,keepFrom);
  const lines: string[] = [];
  for(const m of removed){
    if((m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content){
      lines.push(`${m.role === "user" ? "用户" : "助手"}: ${m.content}`);
    }
  }
  msgs.splice(1,keepFrom - 1);

  const newSummary = await summarize(summary, lines.join("\n"));
  if (newSummary) {
    summary = newSummary;
    console.log(`[summary] ${summary}`);
  }else{
    console.log("[summary]生成摘要失败，旧对话已删除，保留原来的摘要");
  }
  
  //把摘要拼进system消息
  msgs[0] = {
    role: "system",
    content: summary ? `${SYSTEM_PROMPT}\n\n更早对话的摘要（原文已删除）：\n${summary}` : SYSTEM_PROMPT,
  }

}
while (true) {
  const input = (await r1.question(">")).trim();
  if (!input || input === "exit") break;

  messages.push({ role: "user", content: input });
  //滑动窗口
  await trimHistory(messages,MAX_TURNS);
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
    console.log(`[token] 第 ${steps} 步，输入 ${res.usage?.prompt_tokens}，输出 ${res.usage?.completion_tokens}`);
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
      console.log(`[tool] ${call.function.name} ${call.function.arguments}`);
      let result = await executeTool(
        workdir,
        call.function.name,
        call.function.arguments,
        (q) => r1.question(q),
      );

      if (result.length > MAX_TOOL_CHARS) {
        const total = result.length;
        result = result.slice(0, MAX_TOOL_CHARS) + `\n...（已截断：共 ${total} 字，只显示前 ${MAX_TOOL_CHARS} 字。需要后面的内容，用 read_file 的 offset 参数从后面的行号继续读）`;
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }
}

r1.close();
