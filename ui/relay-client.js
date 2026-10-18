import {App,PostMessageTransport} from "@modelcontextprotocol/ext-apps";
const $=id=>document.getElementById(id);
const isEmbedded=window.parent!==window;
let app, room="", messages=[], busy=false;
const VALID=/^[0-9a-f]{32}$/;
function say(str,bad=false){$("status").textContent=str;$("status").style.color=bad?"#c04444":"";}
function parse(result){if(result?.isError)throw Error(result.content?.map(x=>x.text).join(" ")||"Tool error");if(result.structuredContent)return result.structuredContent;return JSON.parse(result.content?.find(x=>x.type==="text")?.text||"{}");}
async function callTool(name,args){
 if(isEmbedded){if(!app)throw Error("MCP host not connected");return parse(await app.callServerTool({name,arguments:args}));}
 const body={jsonrpc:"2.0",id:Date.now(),method:"tools/call",params:{name,arguments:args}};
 const r=await fetch("/mcp",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},body:JSON.stringify(body)});
 const raw=await r.text(),evt=raw.split("\n").find(x=>x.startsWith("data:"));
 const val=JSON.parse(evt?evt.slice(5).trim():raw);if(val.error||!r.ok)throw Error(val.error?.message||"HTTP "+r.status);
 return parse(val.result);
}
function setRoom(code){code=code.trim().toLowerCase();if(!VALID.test(code))throw Error("Room codes need 32 hexadecimal characters");room=code;$("room").value=code;$("room-label").textContent="Room "+code.slice(0,8)+"…";location.hash="room="+code;messages=[];draw();}
function draw(){const el=$("messages");el.replaceChildren();for(const m of messages){const card=document.createElement("div");card.className="bubble"+(m.sender==="You"?" mine":"");const meta=document.createElement("div");meta.className="info";const who=document.createElement("strong");who.textContent=m.sender;const when=document.createElement("span");when.textContent=new Date(m.createdAt).toLocaleString();meta.append(who,when);const text=document.createElement("div");text.className="body";text.textContent=m.text;card.append(meta,text);el.append(card);}el.scrollTop=el.scrollHeight;}
async function refresh(){if(!room){say("Create or join a room first.",true);return;}if(busy)return;busy=true;$("refresh").disabled=true;say("Loading…");
 try {const data=await callTool("relay_read_messages",{room,limit:30});messages=data.messages||[];draw();say(messages.length+" messages loaded.");}
 catch(e){say(e.message||String(e),true);}finally{busy=false;$("refresh").disabled=false;}}
async function post(){if(!room){say("Create a room first.",true);return;}const text=$("draft").value.trim();if(!text){say("Enter a message.",true);return;}if(busy)return;busy=true;$("send").disabled=true;say("Posting…");
 try{await callTool("relay_post_message",{room,sender:$("sender").value,text});$("draft").value="";say("Posted.");}
 catch(e){say(e.message||String(e),true);busy=false;$("send").disabled=false;return;}busy=false;$("send").disabled=false;await refresh();}
async function copy(text){try{await navigator.clipboard.writeText(text);say("Copied to clipboard.");}catch(e){say("Copy failed. Try a browser with clipboard permission.",true);}}
function handoff(name){if(!room){say("Create or join a room first.",true);return;}
 const transcript=messages.slice(-15).map(x=>x.sender+": "+x.text).join("\n\n");
 void copy("You are "+name+" collaborating with ChatGPT, Claude, Grok and me through a shared message relay.\n\nMCP server: https://chatgpt-mcp-with-express-kaleb-s-projects1.vercel.app/mcp\nRoom code: "+room+"\n\nIf this MCP server is connected, call relay_read_messages and then relay_post_message using sender '"+name+"' with your reply. Do not claim to have used tools unless you did.\n\nIf you cannot connect to the server, answer in your own conversation and I will paste your response into the relay.\n\nPlease respond to the newest message. Previous conversation:\n"+(transcript||"(empty room)"));
}
$("create").addEventListener("click",()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));setRoom(Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join(""));say("Room created. Write a message.");void refresh();});
$("join").addEventListener("click",()=>{try{setRoom($("room").value);void refresh();}catch(e){say(e.message,true);}});
$("refresh").addEventListener("click",()=>void refresh());$("send").addEventListener("click",()=>void post());
$("invite").addEventListener("click",()=>room?void copy(location.origin+"/relay#room="+room):say("Create a room first.",true));
for(const name of ["Grok","Claude","ChatGPT"])$(name.toLowerCase()).addEventListener("click",()=>handoff(name));
const fromUrl=(location.hash.match(/room=([a-f0-9]{32})/i)||[])[1];if(fromUrl)try{setRoom(fromUrl);}catch{}
if(isEmbedded){app=new App({name:"AI Relay",version:"1.0.0"});app.onhostcontextchanged=ctx=>{if(ctx.theme)document.documentElement.dataset.theme=ctx.theme;};app.connect(new PostMessageTransport(window.parent,window.parent)).then(()=>{$("connection").textContent="MCP connected";const theme=app.getHostContext()?.theme;if(theme)document.documentElement.dataset.theme=theme;if(room)void refresh();}).catch(e=>{$("connection").textContent="Host unavailable";say(e.message,true);});}else{$("connection").textContent="Standalone";if(room)void refresh();}
