import { getSession } from "../../_utils/store.js";

export default async function handler(req, res) {
  const { id } = req.query;
  const s = await getSession(id);
  if (!s) return res.status(404).send("Session not found");
  const base = process.env.WEB_BASE_URL || `https://${req.headers.host}`;
  res.writeHead(302, {
    Location: `${base}/api/auth/start?session=${id}&who=guest`,
  });
  res.end();
}
