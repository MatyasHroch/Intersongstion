import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QRCodeCanvas } from "qrcode.react";

// Single-file React UI that works with your existing /api routes on Vercel.
// It keeps the same flow:
// 1) Owner clicks Login → we create a session (POST /api/session)
// 2) We show QR with /api/join/:id for the guest
// 3) Both users go through Spotify PKCE via /api/auth/start & /api/auth/callback
// 4) We poll /api/session/:id/status and, when ready, GET /api/session/:id/common
//
// Drop this file into e.g. src/App.jsx in a Vite/CRA app, or export as default in Next.js client component.
// No other components are required.

export default function IntersongstionReact() {
  const [sessionId, setSessionId] = useState(
    () =>
      new URLSearchParams(location.search).get("session") ||
      sessionStorage.getItem("sessionId") ||
      ""
  );
  const whoFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("who") || "",
    []
  );

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({
    haveOwner: false,
    haveGuest: false,
    ready: false,
    commonCount: 0,
  });
  const [names, setNames] = useState([]);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = sessionId ? `${base}/api/join/${sessionId}` : "";
  const pollingRef = useRef(null);

  const persistSession = useCallback((sid) => {
    setSessionId(sid);
    try {
      sessionStorage.setItem("sessionId", sid);
    } catch {}
  }, []);

  // Create a session and kick off owner auth
  const startOwner = useCallback(async () => {
    setError("");
    setCreating(true);
    try {
      const r = await fetch(`/api/session`, { method: "POST" });
      if (!r.ok) throw new Error(`Session failed: ${r.status}`);
      const j = await r.json();
      persistSession(j.sessionId);
      // Immediately redirect owner to Spotify auth
      window.location.href = `/api/auth/start?session=${j.sessionId}&who=owner`;
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setCreating(false);
    }
  }, [persistSession]);

  // Poll session status until ready, then fetch common
  const pollStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const r = await fetch(`/api/session/${sessionId}/status`, {
        cache: "no-store",
      });
      if (!r.ok) return; // keep trying
      const s = await r.json();
      setStatus(s);
      if (s.ready) {
        const res = await fetch(`/api/session/${sessionId}/common`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data?.ok) setNames(data.names || []);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {}
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    pollStatus();
    pollingRef.current = setInterval(pollStatus, 1500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, pollStatus]);

  // On first load after callback: keep session/who from URL for UX (e.g., show QR for owner)
  useEffect(() => {
    const sid = new URLSearchParams(location.search).get("session");
    if (sid) persistSession(sid);
  }, [persistSession]);

  // Simple styles (Tailwind-friendly classes, but also fine as plain CSS if Tailwind absent)
  return (
    <div className="min-h-screen flex justify-center py-10 px-4 bg-[#0b0b0c] text-white">
      <div className="w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            🎶 Intersongstion
          </h1>
          <p className="text-sm/6 text-white/70">
            Najděte písničky, které máte s kamarádem na Spotify společné.
          </p>
        </header>

        <section className="grid gap-4 rounded-2xl border border-white/10 p-5 bg-white/5">
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
              onClick={startOwner}
              disabled={creating}
            >
              {creating ? "Vytvářím session…" : "1) Přihlásit mě (Uživatel A)"}
            </button>
            {status.haveOwner && (
              <span className="text-emerald-400">✓ Načteno</span>
            )}
          </div>

          {sessionId && (
            <div className="rounded-xl border border-white/10 p-4 bg-black/30">
              <p className="text-sm text-white/70 mb-3">
                Požádej druhého uživatele, ať naskenuje QR a přihlásí se jako
                „guest“.
              </p>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="p-3 bg-white rounded-xl">
                  <QRCodeCanvas
                    value={joinUrl}
                    size={160}
                    includeMargin={true}
                  />
                </div>
                <div className="text-sm break-all">
                  <div className="text-white/70">Odkaz pro hosta:</div>
                  <a className="underline break-all" href={joinUrl}>
                    {joinUrl}
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span
              className={
                status.haveGuest ? "text-emerald-400" : "text-white/70"
              }
            >
              {status.haveGuest
                ? "✓ Druhý uživatel přihlášen"
                : "Čekám na druhého uživatele…"}
            </span>
            {status.ready && (
              <span className="text-emerald-400">
                • Hotovo, načítám společné skladby…
              </span>
            )}
          </div>

          {error && (
            <div className="text-red-300 text-sm border border-red-500/30 bg-red-500/10 rounded-xl p-3">
              {error}
            </div>
          )}
        </section>

        {status.ready && (
          <section className="mt-6 rounded-2xl border border-white/10 p-5 bg-white/5">
            <h2 className="text-xl font-medium mb-3">
              Společné písničky ({names.length})
            </h2>
            {names.length ? (
              <ol className="list-decimal ps-5 space-y-1">
                {names.map((n, i) => (
                  <li key={i} className="text-white/90">
                    {n}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-white/70">
                Nenašli jsme žádné společné položky v Liked Songs.
              </p>
            )}
          </section>
        )}

        <footer className="mt-10 text-xs text-white/60">
          {sessionId ? (
            <div className="space-y-1">
              <div>
                <span className="text-white/40">Session:</span> {sessionId}
              </div>
              <div>
                <span className="text-white/40">Kdo z URL:</span>{" "}
                {whoFromUrl || "—"}
              </div>
            </div>
          ) : (
            <div className="text-white/50">
              Nejprve se přihlas jako Uživatel A.
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
