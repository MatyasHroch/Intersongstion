const url = new URL(location.href);
const sessionFromUrl = url.searchParams.get("session");
const who = url.searchParams.get("who");

const loginOwnerBtn = document.getElementById("loginOwner");
const ownerState = document.getElementById("ownerState");
const guestState = document.getElementById("guestState");
const qrWrap = document.getElementById("qrWrap");
const qrDiv = document.getElementById("qr");
const joinUrlEl = document.getElementById("joinUrl");
const resultDiv = document.getElementById("result");

let sessionId = sessionStorage.getItem("sessionId") || sessionFromUrl || null;

async function createSessionAndShowQR() {
  const r = await fetch(`/api/session`, { method: "POST" });
  const j = await r.json();
  sessionId = j.sessionId;
  sessionStorage.setItem("sessionId", sessionId);

  const joinUrl = j.joinUrl;
  qrWrap.style.display = "block";
  joinUrlEl.textContent = joinUrl;
  qrDiv.innerHTML = "";
  new QRCode(qrDiv, { text: joinUrl, width: 180, height: 180 });

  window.location.href = `/api/auth/start?session=${sessionId}&who=owner`;
}

async function pollStatus() {
  if (!sessionId) return;
  const r = await fetch(`/api/session/${sessionId}/status`);
  if (!r.ok) return;
  const s = await r.json();

  ownerState.textContent = s.haveOwner
    ? "✓ Můj Liked Songs načten"
    : "čekám na přihlášení…";
  guestState.textContent = s.haveGuest
    ? "✓ Druhý uživatel přihlášen"
    : "čekám na druhého…";

  if (s.ready) {
    const res = await fetch(`/api/session/${sessionId}/common`);
    const data = await res.json();
    if (data.ok) {
      resultDiv.innerHTML = `
        <h3>Společné písničky (${data.names.length})</h3>
        <ol>${data.names.map((n) => `<li>${n}</li>`).join("")}</ol>
      `;
      clearInterval(poller);
    }
  }
}

loginOwnerBtn.addEventListener("click", createSessionAndShowQR);

if (sessionFromUrl && who) {
  sessionId = sessionFromUrl;
  sessionStorage.setItem("sessionId", sessionId);
  if (who === "owner") {
    const joinUrl = `${location.origin}/api/join/${sessionId}`;
    qrWrap.style.display = "block";
    joinUrlEl.textContent = joinUrl;
    qrDiv.innerHTML = "";
    new QRCode(qrDiv, { text: joinUrl, width: 180, height: 180 });
  }
}

const poller = setInterval(pollStatus, 1500);
pollStatus();
