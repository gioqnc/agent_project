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

// 一次工具调用的记录
export type ToolTrace = {
  name: string;
  args: string; // 模型给的原始参数字符串
  resultChars: number; // 工具结果截断前的长度
  truncated: boolean;
  ms: number;
};

// 循环里一步的记录：一次模型调用，加上这一步执行的工具
export type StepTrace = {
  step: number;
  modelMs: number;
  promptTokens: number;
  completionTokens: number;
  tools: ToolTrace[];
};

export type AgentResult = {
  answer: string | null;
  stopReason: "done" | "max_steps" | "error";
  steps: number;
  trace: StepTrace[];
  error?: string; // stopReason 是 error 时，记下原因
};

export async function runAgent(
  config: AgentConfig,
  messages: ChatCompletionMessageParam[],
): Promise<AgentResult> {
  const add = (m: ChatCompletionMessageParam) => {
    messages.push(m);
    config.onMessage?.(m);
  };

  const trace: StepTrace[] = [];
  let steps = 0;
  while (true) {
    if (steps >= config.maxSteps) {
      return { answer: null, stopReason: "max_steps", steps, trace };
    }
    steps++;

    let res: OpenAI.Chat.Completions.ChatCompletion;
    const modelStart = Date.now();
    try {
      res = await config.client.chat.completions.create({
        model: config.model,
        messages,
        tools: config.tools,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { answer: null, stopReason: "error", steps, trace, error };
    }
    const stepTrace: StepTrace = {
      step: steps,
      modelMs: Date.now() - modelStart,
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
      tools: [],
    };
    trace.push(stepTrace);
    console.log(
      `[token] 第 ${steps} 步，输入 ${res.usage?.prompt_tokens}，输出 ${res.usage?.completion_tokens}`,
    );
    const msg = res.choices[0]?.message;
    if (!msg) {
      return { answer: null, stopReason: "error", steps, trace, error: "模型没有返回消息" };
    }
    add(msg);

    const calls = msg.tool_calls;
    if (!calls || calls.length === 0) {
      return { answer: msg.content, stopReason: "done", steps, trace };
    }

    for (const call of calls) {
      if (call.type !== "function") {
        continue;
      }
      console.log(`[tool] ${call.function.name} ${call.function.arguments}`);
      const toolStart = Date.now();
      let result = await executeTool(
        config.workdir,
        call.function.name,
        call.function.arguments,
        config.ask,
      );
      const toolTrace: ToolTrace = {
        name: call.function.name,
        args: call.function.arguments,
        resultChars: result.length,
        truncated: result.length > config.maxToolChars,
        ms: Date.now() - toolStart,
      };
      stepTrace.tools.push(toolTrace);

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
