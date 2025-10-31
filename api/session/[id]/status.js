import { getSession } from "../../_utils/store.js";

export default async function handler(req, res) {
  const { id } = req.query;
  const s = await getSession(id);
  if (!s) return res.status(404).json({ ok: false });
  res.json({
    ok: true,
    haveOwner: !!(s.owner && s.owner.trackIds && s.owner.trackIds.length),
    haveGuest: !!(s.guest && s.guest.trackIds && s.guest.trackIds.length),
    ready: !!s.common,
    commonCount: s.common?.ids?.length || 0,
  });
}
