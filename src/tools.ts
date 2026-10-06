
import * as fs from "node:fs";
import * as path from "node:path";

export function resolveInside(root: string,userPath: string): string{
    const base = path.resolve(root);
    const target = path.resolve(base,userPath);
    const rel = path.relative(base,target);

    if(rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)){
        throw new Error("路径越界")
    }
    return target;   //返回目标文件的绝对路径

}

//搜索函数
export function searchFiles(root : string, query : string) : string{
    const q = query.trim();
    if(!q){
        return "query不能为空";
    }

    const hits :string[] = [];
    const base = path.resolve(root);

    function walk(dir:string): void{
        const entries = fs.readdirSync(dir,{withFileTypes: true});
        for (const entry of entries){
            const full = path.join(dir,entry.name);
            if (entry.isDirectory()) {
                walk(full);
                if (hits.length >= 20) {
                    return;
                }
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }

            //下一步判断文件是否命中
            const rel = path.relative(base,full);
            const text = fs.readFileSync(full,"utf8");
            const lines = text.split(/\r?\n/);

            let snippet = "";
            for (let i = 0; i < lines.length; i++ ){
                if (lines[i].includes(q)) {
                    snippet = (i+1 + ":" + lines[i].slice(0,120));
                    break;
                }
            }          
            
            if (entry.name.includes(q) || snippet) {
                hits.push(snippet?rel + "\n" + snippet : rel);
            }
            if (hits.length >= 20) {
                return;
            }
            
        }
    }

    walk(base);
    if (hits.length === 0) {
        return "没有匹配"
    }
    return hits.join("\n\n");

    
}

//读取函数
export function readFile(
    root : string,
    userPath : string,
    offset?: number,
    limit?: number,
) : string {
    
    let full : string;
    try{
        full = resolveInside(root,userPath);
    }catch(err){
        return err instanceof Error? err.message : "路径错误";
    }

    let text : string;
    try{
        text = fs.readFileSync(full,"utf-8");
    }catch{
        return "无法读取文件"
    }

    const lines = text.split(/\r?\n/);

    const start = Math.max(0,(offset ?? 1)-1);
    const count = limit ?? 400;
    const selected = lines.slice(start,start + count);

    const rel = path.relative(path.resolve(root),full);
    const body = selected
        .map((line,i) => (start + i + 1) + ":" + line)
        .join("\n");

    if(!body){
        return rel + "\n这个范围没有内容";
    }
    return rel + "\n" + body;
}

//将模型传来的名字和参数字符串，转成写好的两个函数调用
export async function executeTool(
    root : string, 
    name : string, 
    argsJson : string,
    ask: (question: string)=> Promise<string>,
): Promise<string>{
    try{
        //把json变成对象
        const args : { 
            query?: string;
            path?: string;
            offset?: number;
            limit?: number;
            content?: string;
        } = JSON.parse(argsJson);
         
        //如果名字是search_files，就取出query
        if(name === "search_files"){
            const query =args.query;
            if(typeof query !== "string"){
                return "缺少query";
            }
            return searchFiles(root,query);
        }
         //如果名字是read_files，就取出path
        if(name === "read_file"){
            const filePath = args.path;
            if(typeof filePath !== "string"){
                return "缺少path"
            }
            return readFile(root,filePath,args.offset,args.limit);
        }
        if (name ==="write_note") {
            const filePath = args.path;
            const content = args.content;
            if (typeof filePath !== "string" ) {
                return "缺少path";
            }
            if (typeof content !== "string") {
                return "缺少content";
            }

            return await write_note(root,filePath,content,ask)
        }

        return "未知工具"
    }catch{
        return "参数错误请重试"
    }

}


//write_note 工具
export async function write_note(
    root: string,
    userPath: string,
    content: string,
    ask: (question: string) => Promise<string>,
):Promise<string>{
    let full: string;
    try{
        full = resolveInside(root,userPath);
    }catch(err){
        return err instanceof Error? err.message : "路径错误"
    }

    const base = path.resolve(root);
    const rel = path.relative(base,full);
    const outPrefix = "output" + path.sep;
    if (rel !== "output" && !rel.startsWith(outPrefix)) {
        return "只能写入output目录";
    }   

    if (!content.trim()) {
        return "content不能为空";
    }
    console.log("将写入" + rel);
    console.log(content);
    const answer = (await ask("写入这个文件吗?(y/n)")).trim();
    if (answer !== "y") {
        return "用户取消";
    }
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf8");
    return "已写入 " + rel;


    
}