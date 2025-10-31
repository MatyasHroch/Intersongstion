import { getSession } from "../../_utils/store.js";

export default async function handler(req, res) {
  const { id } = req.query;
  const s = await getSession(id);
  if (!s?.common)
    return res.status(404).json({ ok: false, message: "Not ready" });
  res.json({ ok: true, ids: s.common.ids, names: s.common.names });
}
