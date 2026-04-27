// ─────────────────────────────────────────────
// GLOBAL STATE
// ─────────────────────────────────────────────
let isVoting = false;
let lastTime = null;
let resetInFlight = false;


// ─────────────────────────────────────────────
// GENERIC FETCH HELPER
// ─────────────────────────────────────────────
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  return res.json();
}


// ─────────────────────────────────────────────
// VOTING
// ─────────────────────────────────────────────
async function vote(side) {
  if (isVoting) return;
  isVoting = true;

  try {
    const data = await fetchJSON("/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side })
    });

    renderBars(data); // immediate UI update
  } finally {
    isVoting = false;
  }
}


// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
function renderBars(data) {
  const total = data.left_votes + data.right_votes;
  const left = total === 0 ? 50 : Math.round((data.left_votes / total) * 100);
  const right = 100 - left;

  updateBar("leftBar", left);
  updateBar("rightBar", right);
}

function updateBar(id, percent) {
  const el = document.getElementById(id);
  el.style.width = percent + "%";
  el.innerText = percent + "%";
}


// ─────────────────────────────────────────────
// DATA LOADERS
// ─────────────────────────────────────────────
async function updateBars() {
  if (isVoting) return;
  const data = await fetchJSON("/votes");
  renderBars(data);
}

async function loadMessages() {
  const messages = await fetchJSON("/messages");
  const container = document.getElementById("messages");

  container.innerHTML = "";
  messages.reverse().forEach(m => {
    const div = document.createElement("div");
    div.textContent = m.text;
    container.appendChild(div);
  });
}

async function loadImages() {
  const data = await fetchJSON("/images");
  document.getElementById("leftImg").src = data.left;
  document.getElementById("rightImg").src = data.right;
}


// ─────────────────────────────────────────────
// TIMER (SAFE RESET)
// ─────────────────────────────────────────────
async function loadTimer() {
  const data = await fetchJSON("/time");
  const timerEl = document.getElementById("timer");

  timerEl.innerText = data.timeLeft;

  if (data.timeLeft === 0 && lastTime !== 0 && !resetInFlight) {
    resetInFlight = true;

    await fetch("/resetRound", { method: "POST" });

    await Promise.all([
      updateBars(),
      loadImages()
    ]);

    resetInFlight = false;
  }

  lastTime = data.timeLeft;
}


// ─────────────────────────────────────────────
// POLLING
// ─────────────────────────────────────────────
function startPolling() {
  setInterval(updateBars,   1500);
  setInterval(loadMessages, 1500);
  setInterval(loadImages,   3000);
  setInterval(loadTimer,    1000);
}


// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function init() {
  updateBars();
  loadMessages();
  loadImages();
  loadTimer();
  startPolling();

  document.getElementById("chatInput").addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });
}


// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  await fetch("/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  input.value = "";
}


// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────
async function resetAll() {
  await fetch("/resetAll", { method: "POST" });

  await Promise.all([
    updateBars(),
    loadMessages(),
    loadImages()
  ]);
}


// start app
init();