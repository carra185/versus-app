// === SETUP ===
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("database.db");


// === DATABASE ===
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY,
      left_votes INTEGER,
      right_votes INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
    if (!row) {
      db.run("INSERT INTO votes (id, left_votes, right_votes) VALUES (1, 0, 0)");
    }
  });
});


// === TIMER ===
let roundEndTime = Date.now() + 30000;


// === GAME STATE ===
let gameState = "active";
let resultEndTime = null;
let resultData = null;


// === IMAGES ===
const allImages = [
  "img/1-VS.JPG",
  "img/2-VS.PNG",
  "img/3-VS.JPG",
  "img/4-VS.JPG",
  "img/ai-cat.gif",
  "img/ai-dog.gif"
];

let currentImages = {};

function pickRandomImages() {
  const shuffled = [...allImages].sort(() => 0.5 - Math.random());
  currentImages.left = shuffled[0];
  currentImages.right = shuffled[1];
}

pickRandomImages();


// === ROUND LOOP ===
setInterval(() => {
  const now = Date.now();

  if (gameState === "active" && now >= roundEndTime) {
    db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
      if (err) return;

      if (row.left_votes > row.right_votes) {
        resultData = { winner: "left" };
      } else if (row.right_votes > row.left_votes) {
        resultData = { winner: "right" };
      } else {
        resultData = { winner: "draw" };
      }

      gameState = "result";
      resultEndTime = Date.now() + 2000;
    });
  }

  if (gameState === "result" && now >= resultEndTime) {
    db.run("UPDATE votes SET left_votes = 0, right_votes = 0 WHERE id = 1");

    pickRandomImages();
    roundEndTime = Date.now() + 30000;

    gameState = "active";
    resultEndTime = null;
    resultData = null;
  }

}, 200);


// === ROUTES ===

// VOTES
app.get("/votes", (req, res) => {
  db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
    res.json(row);
  });
});

// VOTE
app.post("/vote", (req, res) => {
  const { side } = req.body;

  const query =
    side === "left"
      ? "UPDATE votes SET left_votes = left_votes + 1 WHERE id = 1"
      : "UPDATE votes SET right_votes = right_votes + 1 WHERE id = 1";

  db.run(query, () => {
    db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
      res.json(row);
    });
  });
});

// CHAT
app.get("/messages", (req, res) => {
  db.all("SELECT * FROM messages ORDER BY id DESC LIMIT 20", (err, rows) => {
    const parsed = rows.map(r => {
      try {
        return JSON.parse(r.text);
      } catch {
        return { text: r.text, color: "white" };
      }
    });

    res.json(parsed);
  });
});

app.post("/messages", (req, res) => {
  const { text, color } = req.body;

  db.run(
    "INSERT INTO messages (text) VALUES (?)",
    [JSON.stringify({ text, color })]
  );

  res.sendStatus(200);
});

// IMAGES
app.get("/images", (req, res) => {
  res.json(currentImages);
});

// TIME
app.get("/time", (req, res) => {
  const now = Date.now();

  if (gameState === "result") {
    return res.json({
      state: "result",
      result: resultData
    });
  }

  const timeLeft = Math.max(0, Math.floor((roundEndTime - now) / 1000));

  res.json({
    state: "active",
    timeLeft
  });
});

// RESET
app.post("/resetAll", (req, res) => {
  db.run("UPDATE votes SET left_votes = 0, right_votes = 0 WHERE id = 1");
  db.run("DELETE FROM messages");

  pickRandomImages();
  roundEndTime = Date.now() + 30000;

  gameState = "active";
  resultEndTime = null;
  resultData = null;

  res.sendStatus(200);
});


// === START ===
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});