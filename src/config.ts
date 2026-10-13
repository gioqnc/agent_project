// CLI 和评测脚本共用的配置，保证评测测的就是 CLI 实际在用的提示词和上限
export const SYSTEM_PROMPT = "只根据资料目录回答，写明文件路径，文件里没有就说找不到";
export const MAX_STEPS = 10;
export const MAX_TOOL_CHARS = 4000;
