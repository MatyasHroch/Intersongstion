import crypto from "crypto";

export function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url");
}

export function generateCodeChallenge(verifier) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return Buffer.from(hash).toString("base64url");
}
