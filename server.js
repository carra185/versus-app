const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("database.db");

// ================= DATABASE =================
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

// ================= TIMER =================
let roundEndTime = Date.now() + 30000;

// ================= IMAGES =================
const allImages = [
  "img/1-VS.JPG",
  "img/2-VS.PNG",
  "img/3-VS.JPG",
  "img/4-VS.JPG"
];

let currentImages = {};

function pickRandomImages() {
  const shuffled = [...allImages].sort(() => 0.5 - Math.random());
  currentImages.left = shuffled[0];
  currentImages.right = shuffled[1];
}

pickRandomImages();

// ================= ROUTES =================

// votes
app.get("/votes", (req, res) => {
  db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
    res.json(row);
  });
});

// FIXED vote 
app.post("/vote", (req, res) => {
  const { side } = req.body;

  const query =
    side === "left"
      ? "UPDATE votes SET left_votes = left_votes + 1 WHERE id = 1"
      : "UPDATE votes SET right_votes = right_votes + 1 WHERE id = 1";

  db.run(query, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.get("SELECT * FROM votes WHERE id = 1", (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

// messages
app.get("/messages", (req, res) => {
  db.all("SELECT * FROM messages ORDER BY id DESC LIMIT 20", (err, rows) => {
    res.json(rows);
  });
});

app.post("/messages", (req, res) => {
  const { text } = req.body;
  db.run("INSERT INTO messages (text) VALUES (?)", [text]);
  res.sendStatus(200);
});

// images
app.get("/images", (req, res) => {
  res.json(currentImages);
});

// TIMER 
app.get("/time", (req, res) => {
  const now = Date.now();
  const timeLeft = Math.max(0, Math.floor((roundEndTime - now) / 1000));

  res.json({ timeLeft });
});

// SINGLE SAFE RESET POINT
app.post("/resetRound", (req, res) => {
  db.run("UPDATE votes SET left_votes = 0, right_votes = 0 WHERE id = 1");

  pickRandomImages();
  roundEndTime = Date.now() + 30000;

  res.sendStatus(200);
});

// full reset
app.post("/resetAll", (req, res) => {
  db.run("UPDATE votes SET left_votes = 0, right_votes = 0 WHERE id = 1");
  db.run("DELETE FROM messages");

  pickRandomImages();
  roundEndTime = Date.now() + 30000;

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});