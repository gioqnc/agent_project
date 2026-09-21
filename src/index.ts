import "dotenv/config";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { error, log } from "node:console";

const apiKey= process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const model = process.env.OPENAI_MODEL;
if(!apiKey || !baseURL || !model){
    throw new Error("配置错误");
}


const client = new OpenAI({apiKey,baseURL});

const messages:ChatCompletionMessageParam[]=[{role:"system",content:"你是一个有用的工作助手，请用简体中文回答"},];

const r1 = readline.createInterface({input:stdin,output:stdout});

while(true){
    const input = (await r1.question(">")).trim();
    if(!input || input==="exit") break;

    messages.push({role:"user",content:input});
    const res = await client.chat.completions.create({model,messages});
    const msg = res.choices[0]?.message;
    console.log(msg.content);
    if(msg){
        messages.push(msg);
    }
    console.log(res.usage);
}

r1.close();




    
