import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { executeTool } from "./tools.js";

export type AgentConfig = {
  client: OpenAI;
  model: string;
  tools: ChatCompletionTool[];
  maxSteps: number;
  maxToolChars: number;
  workdir: string;
  ask: (q: string) => Promise<string>;
  onMessage?: (m: ChatCompletionMessageParam) => void; // 每加一条消息，通知外面一声
};

export type AgentResult = {
  answer: string | null;
  stopReason: "done" | "max_steps" | "error";
  steps: number;
};

export async function runAgent(
  config: AgentConfig,
  messages: ChatCompletionMessageParam[],
): Promise<AgentResult> {
  const add = (m: ChatCompletionMessageParam) => {
    messages.push(m);
    config.onMessage?.(m);
  };

  let steps = 0;
  while (true) {
    if (steps >= config.maxSteps) {
      return { answer: null, stopReason: "max_steps", steps };
    }
    steps++;

    let res: OpenAI.Chat.Completions.ChatCompletion;
    try {
      res = await config.client.chat.completions.create({
        model: config.model,
        messages,
        tools: config.tools,
      });
    } catch {
      return { answer: null, stopReason: "error", steps };
    }
    console.log(
      `[token] 第 ${steps} 步，输入 ${res.usage?.prompt_tokens}，输出 ${res.usage?.completion_tokens}`,
    );
    const msg = res.choices[0]?.message;
    if (!msg) return { answer: null, stopReason: "error", steps };
    add(msg);

    const calls = msg.tool_calls;
    if (!calls || calls.length === 0) {
      return { answer: msg.content, stopReason: "done", steps };
    }

    for (const call of calls) {
      if (call.type !== "function") {
        continue;
      }
      console.log(`[tool] ${call.function.name} ${call.function.arguments}`);
      let result = await executeTool(
        config.workdir,
        call.function.name,
        call.function.arguments,
        config.ask,
      );

      if (result.length > config.maxToolChars) {
        const total = result.length;
        result =
          result.slice(0, config.maxToolChars) +
          `\n...（已截断：共 ${total} 字，只显示前 ${config.maxToolChars} 字。需要后面的内容，用 read_file 的 offset 参数从后面的行号继续读）`;
      }
      add({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }
}
