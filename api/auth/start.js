import {
  generateCodeVerifier,
  generateCodeChallenge,
} from "../../_utils/pkce.js";
import { getSession, setParty } from "../../_utils/store.js";

export default async function handler(req, res) {
  const { session, who } = req.query;
  if (!session || !["owner", "guest"].includes(who))
    return res.status(400).send("Bad params");

  const s = await getSession(session);
  if (!s) return res.status(404).send("Session not found");

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  await setParty(session, who, { codeVerifier });

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    scope: "user-library-read",
    state: `${session}:${who}`,
  }).toString();

  res.writeHead(302, {
    Location: `https://accounts.spotify.com/authorize?${params}`,
  });
  res.end();
}
