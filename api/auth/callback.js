import { getSession, setParty, setCommon } from "../_utils/store.js";

async function fetchAllSavedTrackIds(accessToken) {
  const ids = new Set();
  let url = "https://api.spotify.com/v1/me/tracks?limit=50";
  while (url) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.status === 429) {
      const retry = parseInt(r.headers.get("Retry-After") || "1", 10);
      await new Promise((ok) => setTimeout(ok, (retry + 1) * 1000));
      continue;
    }
    if (!r.ok) throw new Error(`/me/tracks failed: ${r.status}`);
    const j = await r.json();
    for (const item of j.items || []) {
      if (item?.track?.id) ids.add(item.track.id);
    }
    url = j.next;
  }
  return ids;
}

async function getTrackNames(accessToken, idList) {
  const chunk = 50;
  const names = [];
  for (let i = 0; i < idList.length; i += chunk) {
    const ids = idList.slice(i, i + chunk).join(",");
    const r = await fetch(`https://api.spotify.com/v1/tracks?ids=${ids}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) continue;
    const j = await r.json();
    for (const t of j.tracks || []) {
      if (t)
        names.push(`${t.name} — ${t.artists.map((a) => a.name).join(", ")}`);
    }
  }
  return names;
}

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send("Missing code/state");

    const [sessionId, who] = state.split(":");
    const s = await getSession(sessionId);
    const codeVerifier = s[who]?.codeVerifier;

    const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        code_verifier: codeVerifier,
      }).toString(),
    });

    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token;
    const trackIds = await fetchAllSavedTrackIds(accessToken);
    await setParty(sessionId, who, {
      accessToken,
      trackIds: Array.from(trackIds),
    });

    const updated = await getSession(sessionId);
    const other = who === "owner" ? "guest" : "owner";

    if (updated?.[other]?.trackIds?.length) {
      const idsA = new Set(updated.owner.trackIds || []);
      const idsB = new Set(updated.guest.trackIds || []);
      const common = Array.from(idsA).filter((id) => idsB.has(id));
      const names = await getTrackNames(accessToken, common);
      await setCommon(sessionId, { ids: common, names });
    }

    const webBase = process.env.WEB_BASE_URL || `https://${req.headers.host}`;
    res.writeHead(302, {
      Location: `${webBase}/?session=${sessionId}&who=${who}`,
    });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send("Callback error");
  }
}
