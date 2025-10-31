import { createSession } from "../../_utils/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const s = await createSession();
  const webBase = process.env.WEB_BASE_URL || `https://${req.headers.host}`;
  res.json({
    sessionId: s.id,
    joinUrl: `${webBase}/api/join/${s.id}`,
  });
}
