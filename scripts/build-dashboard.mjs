import { build } from "esbuild";
import { readFile,writeFile,mkdir } from "node:fs/promises";
import { dirname,resolve } from "node:path";
import { Script } from "node:vm";
for(const [name,htmlPath,scriptPath,out] of [
 ["dashboard","ui/dashboard.html","ui/dashboard-client.js","src/generated-dashboard.ts"],
 ["relay","ui/relay.html","ui/relay-client.js","src/generated-relay.ts"]
]){
 const html=await readFile(resolve(htmlPath),"utf8");
 if(!html.includes("<!-- APP_JS -->"))throw Error("HTML marker missing for "+name);
 const bundle=await build({entryPoints:[scriptPath],platform:"browser",format:"iife",target:"es2022",bundle:true,minify:true,write:false});
 const script=bundle.outputFiles[0].text.replace(/<\/script/gi,"<\\/script");
 new Script(script,{filename:name+"-inline.js"});
 const page=html.replace("<!-- APP_JS -->",()=>"<script>"+script+"</script>");
 await mkdir(dirname(resolve(out)),{recursive:true});
 await writeFile(resolve(out),"// Auto-generated UI bundle.\nexport const "+(name==="relay"?"relayHtml":"dashboardHtml")+" = "+JSON.stringify(page)+";\n");
 console.log(name+" UI: "+page.length+" characters");
}
