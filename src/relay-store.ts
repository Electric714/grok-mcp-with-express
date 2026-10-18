import { randomUUID } from "node:crypto";
import { get, list, put } from "@vercel/blob";

const PREFIX = "ai-relay-v1/";
export const ROOM_CODE = /^[0-9a-f]{32}$/;
export const SENDERS = ["You", "ChatGPT", "Grok", "Claude", "Other"] as const;
export type Sender = (typeof SENDERS)[number];
export type Message = { id: string; sender: Sender; text: string; createdAt: string };

function path(room: string) {
  if (!ROOM_CODE.test(room)) throw new Error("Invalid room code");
  return PREFIX + room + "/";
}
export async function readMessages(room: string, limit = 30): Promise<Message[]> {
  const prefix = path(room);
  const response = await list({ prefix, limit: 101 });
  const blobs = response.blobs.filter(b => b.pathname.endsWith(".json"));
  const recent = blobs.sort((a,b)=>a.pathname.localeCompare(b.pathname)).slice(-Math.min(30,Math.max(1,limit)));
  const messages = await Promise.all(recent.map(async b => {
    const result = await get(b.pathname, { access:"private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return JSON.parse(await new Response(result.stream).text()) as Message;
  }));
  return messages.filter((m):m is Message=>m!==null).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
export async function sendMessage(room: string,sender:Sender,text:string): Promise<Message> {
  const prefix = path(room);
  if (!SENDERS.includes(sender)) throw new Error("Invalid sender");
  const body=text.trim();
  if (body.length<1||body.length>2000) throw new Error("Message must be 1–2000 characters");
  const count = await list({prefix,limit:101});
  if(count.hasMore||count.blobs.length>=100) throw new Error("Room limit reached (100 messages). Create another room.");
  const message:Message={id:randomUUID(),sender,text:body,createdAt:new Date().toISOString()};
  const pathname=prefix+message.createdAt.replace(/[-:.TZ]/g,"")+"-"+message.id+".json";
  await put(pathname,JSON.stringify(message),{access:"private",contentType:"application/json",addRandomSuffix:false});
  return message;
}
