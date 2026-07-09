const MISA_ORIGIN = "https://moneykeeperapp.misa.vn";
const SESSION_KEY = "moneykeeper_userInfo";
const REQUIRED_FIELDS = ["accessToken", "sessionId", "userId"];
const EXPORT_FILENAME = "misa-session.json";

const statusEl = document.getElementById("status");
const actionsEl = document.getElementById("actions");
const previewEl = document.getElementById("preview");
const copyBtn = document.getElementById("copyBtn");
const saveBtn = document.getElementById("saveBtn");

let rawSessionJson = null;

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = kind || "";
}

function maskToken(value) {
  if (typeof value !== "string" || value.length <= 12) return "***";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || new URL(tab.url).origin !== MISA_ORIGIN) {
    setStatus(`Open ${MISA_ORIGIN} first, then reopen this popup.`, "error");
    return;
  }

  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (key) => localStorage.getItem(key),
      args: [SESSION_KEY],
    });
  } catch (err) {
    setStatus(`Could not read session: ${err.message}`, "error");
    return;
  }

  if (!result) {
    setStatus("Not logged in to MISA — log in first, then reopen this popup.", "error");
    return;
  }

  let session;
  try {
    session = JSON.parse(result);
  } catch {
    setStatus("Session data is not valid JSON — unexpected MISA format.", "error");
    return;
  }

  const missing = REQUIRED_FIELDS.filter((field) => !session[field]);
  if (missing.length > 0) {
    setStatus(`Session is missing fields: ${missing.join(", ")}`, "error");
    return;
  }

  rawSessionJson = result;
  previewEl.textContent = `accessToken: ${maskToken(session.accessToken)}\nsessionId: ${maskToken(session.sessionId)}\nuserId: ${session.userId}`;
  setStatus("Session found — ready to export.", "ok");
  actionsEl.hidden = false;
}

copyBtn.addEventListener("click", async () => {
  if (!rawSessionJson) return;
  await navigator.clipboard.writeText(rawSessionJson);
  setStatus("Copied to clipboard.", "ok");
});

saveBtn.addEventListener("click", () => {
  if (!rawSessionJson) return;
  const blob = new Blob([rawSessionJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download(
    {
      url,
      filename: EXPORT_FILENAME,
      saveAs: false,
      conflictAction: "overwrite",
    },
    () => {
      URL.revokeObjectURL(url);
      setStatus(`Saved to Downloads/${EXPORT_FILENAME}.`, "ok");
    },
  );
});

init();
