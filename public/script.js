async function vote(side) {
  await fetch("/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ side })
  });

  updateBars();
}

async function updateBars() {
  const res = await fetch("/votes");
  const data = await res.json();

  const total = data.left_votes + data.right_votes;
  const left = Math.round((data.left_votes / total) * 100) || 50;
  const right = 100 - left;

  document.getElementById("leftBar").style.width = left + "%";
  document.getElementById("rightBar").style.width = right + "%";

  document.getElementById("leftBar").innerText = left + "%";
  document.getElementById("rightBar").innerText = right + "%";
}

async function sendMessage() {
  const input = document.getElementById("chatInput");

  await fetch("/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.value })
  });

  input.value = "";
}

async function loadMessages() {
  const res = await fetch("/messages");
  const messages = await res.json();

  const container = document.getElementById("messages");
  container.innerHTML = "";

  messages.forEach(m => {
    const div = document.createElement("div");
    div.textContent = m.text;
    container.appendChild(div);
  });
}

setInterval(() => {
  updateBars();
  loadMessages();
}, 2000);

updateBars();
loadMessages();

document.getElementById("chatInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

async function resetAll() {
  await fetch("/reset", { method: "POST" });
  updateBars();
  loadMessages();
}