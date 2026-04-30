// === STATE ===
let isVoting = false;
let gameState = "active";


// === USER COLOR ===
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 65%)`;
}

const userColor = getRandomColor();


// === FETCH ===
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  return res.json();
}


// === VOTING ===
async function vote(side) {
  if (isVoting || gameState !== "active") return;

  isVoting = true;

  try {
    const data = await fetchJSON("/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side })
    });

    renderBars(data);
  } finally {
    isVoting = false;
  }
}


// === RENDER ===
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


// === VOTE DATA ===
async function updateBars() {
  if (isVoting || gameState !== "active") return;

  const data = await fetchJSON("/votes");
  renderBars(data);
}


// === CHAT ===
async function loadMessages() {
  const messages = await fetchJSON("/messages");
  const container = document.getElementById("messages");

  container.innerHTML = "";

  messages.reverse().forEach(m => {
    const div = document.createElement("div");
    div.textContent = m.text;
    div.style.color = m.color || "white";
    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  await fetch("/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, color: userColor })
  });

  input.value = "";
}


// === IMAGES ===
async function loadImages() {
  const data = await fetchJSON("/images");
  document.getElementById("leftImg").src = data.left;
  document.getElementById("rightImg").src = data.right;
}


// === TIMER ===
async function loadTimer() {
  const data = await fetchJSON("/time");

  gameState = data.state || "active";

  const timerEl = document.getElementById("timer");
  const leftOverlay = document.getElementById("leftOverlay");
  const rightOverlay = document.getElementById("rightOverlay");

  if (gameState === "result") {
    timerEl.innerText = "...loading";

    const result = data.result;

    if (result) {
      if (result.winner === "left") {
        leftOverlay.innerText = "WINNER";
        rightOverlay.innerText = "LOSER";
      } else if (result.winner === "right") {
        leftOverlay.innerText = "LOSER";
        rightOverlay.innerText = "WINNER";
      } else {
        leftOverlay.innerText = "DRAW";
        rightOverlay.innerText = "DRAW";
      }

      leftOverlay.classList.add("show");
      rightOverlay.classList.add("show");
    }

  } else {
    timerEl.innerText =
      data.timeLeft !== undefined ? data.timeLeft : "...";

    leftOverlay.classList.remove("show");
    rightOverlay.classList.remove("show");
  }
}


// === POLLING ===
function startPolling() {
  setInterval(updateBars, 1500);
  setInterval(loadMessages, 1500);
  setInterval(loadImages, 3000);
  setInterval(loadTimer, 1000);
}


// === INIT ===
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


// === RESET ===
async function resetAll() {
  await fetch("/resetAll", { method: "POST" });

  await Promise.all([
    updateBars(),
    loadMessages(),
    loadImages()
  ]);
}


// === START ===
init();