// This script is bundled into the MCP UI resource, with no external browser dependencies.
import { App, PostMessageTransport } from "@modelcontextprotocol/ext-apps";
const $ = (id) => document.getElementById(id);
const embedded = window.parent !== window;
let app;
let activity = [];
function indicator(state, message) {
  const node = $("connection");
  node.classList.toggle("ok", state === "ready");
  node.textContent = "";
  const dot = document.createElement("span");
  dot.className = "dot"; node.append(dot, document.createTextNode(message));
}
function addActivity(name, successful, ms) {
  activity.unshift((successful ? "✓ " : "× ") + name + " · " + ms + " ms");
  activity = activity.slice(0, 5);
  const list = $("history"); list.replaceChildren();
  for (const entry of activity) {const li=document.createElement("li"); li.textContent=entry;list.appendChild(li);}
}
function extractText(result) {
  if (result?.isError) throw Error(result.content?.filter(x => x.type==="text").map(x=>x.text).join("\n") || "Tool reported an error");
  return result?.content?.filter(x => x.type === "text").map(x => x.text).join("\n") || "No text returned";
}
async function directCall(name, args) {
  const body = {jsonrpc:"2.0",id:Math.floor(Math.random()*1e9),method:"tools/call",params:{name,arguments:args}};
  const response = await fetch("/mcp",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},body:JSON.stringify(body)});
  const raw = await response.text();
  const eventData = raw.split("\n").find(line => line.startsWith("data:"));
  const parsed = JSON.parse(eventData ? eventData.slice(5).trim() : raw);
  if (!response.ok || parsed.error) throw Error(parsed.error?.message || "HTTP " + response.status);
  return parsed.result;
}
async function run(name, args, output, button) {
  const el=$(output);
  const started=performance.now();
  button.disabled=true;el.setAttribute("aria-busy","true");el.textContent="Calling "+name+"…";
  try {
    const result=embedded ? await app.callServerTool({name,arguments:args}) : await directCall(name,args);
    el.textContent=extractText(result);
    const duration=Math.round(performance.now()-started);
    $("latency").textContent=duration+" ms";
    addActivity(name,true,duration);
  } catch(error) {
    el.textContent="Error: "+(error?.message||String(error));
    addActivity(name,false,Math.round(performance.now()-started));
  } finally {
    el.setAttribute("aria-busy","false");button.disabled=false;
  }
}
function wire(id, name, args, output) {
  const button=$(id);
  button.addEventListener("click", () => {
    let input;
    try {input=args();} catch(e) {$(output).textContent=e.message;return;}
    void run(name,input,output,button);
  });
}
function finite(id,min,max) {
  const value=Number($(id).value);
  if ($(id).value.trim()==="" || !Number.isFinite(value) || value<min || value>max) throw Error("Invalid "+id.replace("-"," ")+" value");
  return value;
}
wire("ping","hello",()=>({name:"ChatGPT"}),"utility-output");
wire("time","get_current_time",()=>({}),"utility-output");
wire("random","random_number",()=>({min:1,max:100}),"utility-output");
wire("calc","calculate",()=>({operation:$("operation").value,a:finite("num-a",-1e12,1e12),b:finite("num-b",-1e12,1e12)}),"calc-output");
wire("alerts","get-alerts",()=>{
  const state=$("state").value.trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(state))throw Error("Enter a two-letter US state code");
  return {state};
},"alerts-output");
wire("forecast","get-forecast",()=>({latitude:finite("latitude",-90,90),longitude:finite("longitude",-180,180)}),"forecast-output");
if (embedded) {
  app = new App({name:"ChatGPT MCP Control Center",version:"1.0.0"});
  app.onhostcontextchanged=(ctx)=>{
    if(ctx.theme) document.documentElement.dataset.theme=ctx.theme;
  };
  app.ontoolresult=(_result)=>{};
  app.connect(new PostMessageTransport(window.parent,window.parent))
    .then(()=>{indicator("ready","Connected to host");$("transport").textContent="MCP App"; const theme=app.getHostContext()?.theme;if(theme)document.documentElement.dataset.theme=theme;})
    .catch(err=>indicator("error","Host unavailable: "+err.message));
} else {
  indicator("ready","Standalone preview");$("transport").textContent="HTTP";
}
