import { createClient } from "@vercel/kv";

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function createSession() {
  const id = Math.random().toString(36).slice(2, 10);
  const key = `sess:${id}`;
  const value = {
    id,
    createdAt: Date.now(),
    owner: null,
    guest: null,
    common: null,
  };
  await kv.set(key, value, { ex: 60 * 60 });
  return value;
}

export async function getSession(id) {
  return await kv.get(`sess:${id}`);
}

export async function setParty(sessionId, who, patch) {
  const key = `sess:${sessionId}`;
  const s = await kv.get(key);
  if (!s) return null;
  s[who] = { ...(s[who] || {}), ...patch };
  await kv.set(key, s, { ex: 60 * 60 });
  return s;
}

export async function setCommon(sessionId, common) {
  const key = `sess:${sessionId}`;
  const s = await kv.get(key);
  if (!s) return null;
  s.common = common;
  await kv.set(key, s, { ex: 60 * 60 });
  return s;
}
